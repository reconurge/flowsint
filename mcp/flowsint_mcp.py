"""flowsint MCP wrapper — stdio JSON-RPC over the flowsint FastAPI.

Governance is DATA, not code: `allowlist.yaml` next to this file is the single
source of truth for what enrichers may be launched. Default-deny is structural
— any name not declared is rejected. Copy `allowlist.example.yaml` to
`allowlist.yaml` and edit for your deployment.

Modules:
    allowlist_loader   YAML classifier with 60 s mtime TTL
    flowsint_client    HTTP + auth + graph/health helpers (stdlib)
    otel_bootstrap     spans -> OTLP HTTP
    metrics            counter -> OTLP + optional Pushgateway

Config (.env; see env.example):
    FLOWSINT_API              default http://127.0.0.1:5001
    FLOWSINT_WEB              default http://localhost:5173
    FLOWSINT_USER / _PASS     required
    FLOWSINT_TIMEOUT          default 30
    FLOWSINT_TEMPLATES_DIR    default ./templates
    OTEL_EXPORTER_OTLP_ENDPOINT   e.g. http://127.0.0.1:4318
    OTEL_SERVICE_NAME             default mcp-flowsint
    PUSHGATEWAY_URL           optional fallback
"""
import glob
import json
import os
import sys
import urllib.parse
import uuid

from allowlist_loader import (
    all_entries, classify_enricher,
    state as allowlist_state, templates as allowlist_templates,
)
from flowsint_client import (
    ApiError, FlowsintClient, check_http, check_tcp,
    detect_seed_type, summarize_graph,
)
import metrics
import otel_bootstrap

HERE = os.path.dirname(os.path.abspath(__file__))
ENV = {}
_env_path = os.path.join(HERE, ".env")
if os.path.exists(_env_path):
    with open(_env_path, encoding="utf-8") as f:
        for ln in f:
            ln = ln.strip()
            if ln and not ln.startswith("#") and "=" in ln:
                k, v = ln.split("=", 1)
                ENV[k.strip()] = v.strip()
                os.environ.setdefault(k.strip(), v.strip())

API = (ENV.get("FLOWSINT_API") or "http://127.0.0.1:5001").rstrip("/")
WEB = (ENV.get("FLOWSINT_WEB") or "http://localhost:5173").rstrip("/")
TEMPLATES_DIR = ENV.get("FLOWSINT_TEMPLATES_DIR") or os.path.join(HERE, "templates")

CLIENT = FlowsintClient(API, ENV.get("FLOWSINT_USER", ""), ENV.get("FLOWSINT_PASS", ""),
                        timeout=int(ENV.get("FLOWSINT_TIMEOUT", "30")))

otel_bootstrap.init()
metrics.init()


def tool_list_enrichers(_p):
    live = CLIENT.enrichers()
    declared = {e["name"]: e for e in all_entries()}
    allowed, excluded = [], []
    live_names = set()
    for e in live:
        live_names.add(e["name"])
        ok, reason, entry = classify_enricher(e["name"])
        if ok and entry:
            allowed.append({
                "api_name": e["name"],
                "input_type": entry.get("input_type"),
                "output_type": entry.get("output_type"),
                "source": entry.get("source"),
                "external_api": entry.get("external_api"),
                "reviewed_by": entry.get("reviewed_by"),
            })
        else:
            excluded.append({"api_name": e["name"], "reason": reason})
    declared_not_live = [
        {"name": n, "source": declared[n].get("source"),
         "notes": "declared in allowlist.yaml but not registered in flowsint API"}
        for n in sorted(set(declared) - live_names)
    ]
    st = allowlist_state()
    return {
        "api": API,
        "allowlist_source": st["path"],
        "allowlist_entries": st["allowlist_count"],
        "allowlisted": allowed,
        "allowlisted_count": len(allowed),
        "excluded_count": len(excluded),
        "excluded_sample": excluded[:10],
        "declared_not_live": declared_not_live,
        "note": "Data-driven allowlist (allowlist.yaml). Default-deny; edits picked up via 60 s mtime TTL.",
    }


def tool_recon_company(p):
    seed = (p.get("seed_domain") or p.get("org_name") or p.get("seed") or "").strip()
    node_type = detect_seed_type(seed)
    name = p.get("name") or ("Infra recon: %s" % seed)
    only = p.get("only") or []
    only_set = set(only) if isinstance(only, list) else set()

    enrichers = CLIENT.enrichers()
    live_names = {e["name"] for e in enrichers}
    selected, skipped = [], []
    for e in enrichers:
        ok, _reason, entry = classify_enricher(e["name"])
        if ok and (entry or {}).get("input_type") == node_type:
            if only_set and e["name"] not in only_set:
                continue
            selected.append(e["name"])
        elif not ok:
            skipped.append(e["name"])
    unknown_only = sorted(only_set - live_names)
    non_allowlisted_only = sorted(
        n for n in (only_set - set(selected))
        if n in live_names and not classify_enricher(n)[0]
    )

    owner_id = CLIENT.owner_id()
    inv_body = {"name": name, "description": "Company infrastructure recon (governed; infra-only)."}
    sk_body = {"title": name, "description": "Infra recon sketch (governed)."}
    if owner_id:
        inv_body["owner_id"] = owner_id
        sk_body["owner_id"] = owner_id
    inv = CLIENT.call("POST", "/api/investigations/create", json_body=inv_body)
    investigation_id = inv["id"]
    sk_body["investigation_id"] = investigation_id
    sk = CLIENT.call("POST", "/api/sketches/create", json_body=sk_body)
    sketch_id = sk["id"]

    prop_key = node_type.lower()
    client_id = str(uuid.uuid4())
    add_resp = CLIENT.call(
        "POST", "/api/sketches/%s/nodes/add" % sketch_id,
        json_body={"id": client_id, "nodeLabel": seed, "nodeType": node_type,
                   "nodeMetadata": {}, "nodeProperties": {prop_key: seed},
                   "x": 100, "y": 100})
    node_id = client_id
    if isinstance(add_resp, dict):
        node = add_resp.get("node") or {}
        node_id = node.get("id") or add_resp.get("id") or add_resp.get("node_id") or client_id

    launched, launch_errors = [], []
    for ename in selected:
        try:
            CLIENT.call("POST", "/api/enrichers/%s/launch" % urllib.parse.quote(ename),
                        json_body={"node_ids": [node_id], "sketch_id": sketch_id})
            launched.append(ename)
        except ApiError as ex:
            launch_errors.append({"enricher": ename, "error": str(ex)})

    return {"investigation_id": investigation_id, "sketch_id": sketch_id,
            "seed": seed, "node_type": node_type, "node_id": node_id,
            "web_url": "%s/investigations/%s/sketches/%s" % (WEB, investigation_id, sketch_id),
            "launched_enrichers": launched, "launch_errors": launch_errors,
            "skipped_forbidden_count": len(skipped),
            "unknown_only": unknown_only,
            "non_allowlisted_only": non_allowlisted_only,
            "note": "Only %s-input allowlisted enrichers were launched. Async: poll flowsint_status." % node_type}


def tool_launch_enricher(p):
    ename = (p.get("enricher") or "").strip()
    sketch_id = p.get("sketch_id")
    node_id = p.get("node_id")
    if not ename or not sketch_id or not node_id:
        raise ApiError("missing required: enricher, sketch_id, node_id")
    ok, reason, _ = classify_enricher(ename)
    if not ok:
        raise ApiError("enricher rejected: %s (%s)" % (ename, reason))
    CLIENT.call("POST", "/api/enrichers/%s/launch" % urllib.parse.quote(ename),
                json_body={"node_ids": [node_id], "sketch_id": sketch_id})
    return {"enricher": ename, "sketch_id": sketch_id, "node_id": node_id,
            "status": "launched",
            "note": "Async: poll flowsint_status(sketch_id) for progress."}


def tool_get_graph(p):
    sketch_id = p["sketch_id"]
    g = CLIENT.call("GET", "/api/sketches/%s/graph" % sketch_id)
    return {"sketch_id": sketch_id, **summarize_graph(g if isinstance(g, dict) else {})}


def tool_status(p):
    sketch_id = p["sketch_id"]
    limit = int(p.get("limit", 50))
    logs = CLIENT.call("GET", "/api/events/sketch/%s/logs" % sketch_id, query={"limit": limit})
    items = logs if isinstance(logs, list) else (logs.get("logs") or logs.get("data") or logs)
    return {"sketch_id": sketch_id, "logs": items}


def tool_load_custom_templates_from_disk(p):
    dir_arg = (p.get("dir") or TEMPLATES_DIR).strip()
    if not os.path.isdir(dir_arg):
        raise ApiError("templates dir not found: %s" % dir_arg)

    declared = {e["name"]: e for e in allowlist_templates()}
    loaded, skipped = [], []
    files = sorted(glob.glob(os.path.join(dir_arg, "*.yaml"))) + sorted(glob.glob(os.path.join(dir_arg, "*.yml")))

    for path in files:
        try:
            with open(path, encoding="utf-8") as fh:
                body_text = fh.read()
        except Exception as exc:
            skipped.append({"path": path, "reason": "read failed: %s" % exc})
            continue
        try:
            import yaml
            spec = yaml.safe_load(body_text)
        except Exception as exc:
            skipped.append({"path": path, "reason": "yaml parse failed: %s" % exc})
            continue
        if not isinstance(spec, dict) or not spec.get("name"):
            skipped.append({"path": path, "reason": "missing 'name' at YAML root"})
            continue
        tname = str(spec["name"]).strip()
        entry = declared.get(tname)
        if entry is None:
            skipped.append({"path": path, "name": tname,
                            "reason": "not declared in allowlist.yaml (default-deny)"})
            continue
        ok, reason, _ = classify_enricher(tname)
        if not ok:
            skipped.append({"path": path, "name": tname, "reason": "governance denied: %s" % reason})
            continue
        payload = {
            "name": tname,
            "category": spec.get("category") or (spec.get("input") or {}).get("type") or "Domain",
            "description": spec.get("description", ""),
            "version": spec.get("version", 1),
            "content": spec,
        }
        try:
            CLIENT.call("POST", "/api/enrichers/templates", json_body=payload)
            loaded.append({"name": tname, "path": path, "source": entry.get("source"),
                           "action": "created-or-updated"})
        except ApiError as ex:
            skipped.append({"path": path, "name": tname, "reason": "API error: %s" % ex})

    return {"dir": dir_arg, "loaded_count": len(loaded), "skipped_count": len(skipped),
            "loaded": loaded, "skipped": skipped,
            "note": "Idempotent. Only names declared in allowlist.yaml are pushed to the flowsint API."}


def tool_health(_p):
    api_url = API + "/health"
    api_status = check_http(api_url)

    celery_status = {"status": "unknown", "note": "no supported /api/workers endpoint yet"}
    try:
        raw = CLIENT.call("GET", "/api/workers", timeout=3)
        workers = raw if isinstance(raw, list) else (raw.get("workers") if isinstance(raw, dict) else None)
        if workers is not None:
            celery_status = {"status": "up" if workers else "down", "workers": len(workers)}
    except ApiError as exc:
        celery_status = {"status": "unknown", "error": str(exc)[:120]}

    redis_host = ENV.get("REDIS_HOST") or "127.0.0.1"
    redis_port = int(ENV.get("REDIS_PORT") or 6379)
    redis_status = check_tcp(redis_host, redis_port)

    neo4j_host = ENV.get("NEO4J_HOST") or "127.0.0.1"
    neo4j_bolt = int(ENV.get("NEO4J_BOLT_PORT") or 7687)
    neo4j_status = check_tcp(neo4j_host, neo4j_bolt)

    allow_state = allowlist_state()
    overall = "up"
    for st_dict in (api_status, redis_status, neo4j_status):
        if st_dict.get("status") == "down":
            overall = "down"
            break
        if st_dict.get("status") == "degraded" and overall != "down":
            overall = "degraded"
    return {
        "overall": overall,
        "api": {"url": api_url, **api_status},
        "celery": celery_status,
        "redis": {"host": redis_host, "port": redis_port, **redis_status},
        "neo4j": {"host": neo4j_host, "bolt_port": neo4j_bolt, **neo4j_status},
        "allowlist": {"path": allow_state["path"], "entries": allow_state["allowlist_count"],
                       "error": allow_state["error"]},
        "otel": otel_bootstrap.stats(),
        "metrics": metrics.stats(),
    }


TOOLS = {
    "flowsint_list_enrichers": (
        tool_list_enrichers,
        "List LIVE flowsint enrichers filtered by allowlist.yaml (infrastructure-only). Individual/breach/social enrichers are rejected by governance.",
        {}, []),
    "flowsint_recon_company": (
        tool_recon_company,
        "Governed company-infrastructure recon: create investigation+sketch, seed a domain or organization node, launch only safe infra enrichers, return sketch_id + web_url.",
        {"seed_domain": {"type": "string"}, "org_name": {"type": "string"},
         "name": {"type": "string"},
         "only": {"type": "array", "items": {"type": "string"}}},
        []),
    "flowsint_launch_enricher": (
        tool_launch_enricher,
        "Launch a SINGLE allowlisted enricher on an existing node.",
        {"enricher": {"type": "string"}, "sketch_id": {"type": "string"}, "node_id": {"type": "string"}},
        ["enricher", "sketch_id", "node_id"]),
    "flowsint_get_graph": (
        tool_get_graph,
        "Return the nodes + relationships of a sketch (summarized, truncated at 200).",
        {"sketch_id": {"type": "string"}}, ["sketch_id"]),
    "flowsint_status": (
        tool_status,
        "Return recent run logs / progress for a sketch.",
        {"sketch_id": {"type": "string"}, "limit": {"type": "integer"}}, ["sketch_id"]),
    "flowsint_load_custom_templates_from_disk": (
        tool_load_custom_templates_from_disk,
        "Register YAML templates from disk (FLOWSINT_TEMPLATES_DIR) into the flowsint API. Idempotent. Only names declared in allowlist.yaml with source=template are pushed.",
        {"dir": {"type": "string"}}, []),
    "flowsint_health": (
        tool_health,
        "Return stack health: api, celery, redis, neo4j, allowlist load state, OTel/metrics status.",
        {}, []),
}


def reply(i, result=None, error=None):
    m = {"jsonrpc": "2.0", "id": i}
    if error is not None:
        m["error"] = {"code": -32000, "message": error}
    else:
        m["result"] = result
    sys.stdout.write(json.dumps(m, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def _dispatch(nm, args):
    fn, _, _, rq = TOOLS[nm]
    miss = [r for r in rq if r not in args]
    if miss:
        return {"error": "missing: " + ",".join(miss)}
    with otel_bootstrap.start_span("flowsint.tools." + nm, tool_name=nm):
        try:
            out = fn(args)
            metrics.record_tool_call(nm, "ok")
            return {"ok": out}
        except ApiError as e:
            result = "deny" if "governance" in str(e).lower() else "error"
            metrics.record_tool_call(nm, result)
            return {"error": str(e)}
        except Exception as e:
            metrics.record_tool_call(nm, "error")
            return {"error": str(e)}


def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except Exception:
            continue
        mid, method, params = msg.get("id"), msg.get("method"), msg.get("params") or {}
        if method == "initialize":
            reply(mid, {"protocolVersion": params.get("protocolVersion", "2024-11-05"),
                        "capabilities": {"tools": {}},
                        "serverInfo": {"name": "transgenia-flowsint", "version": "1.1.0"}})
        elif method == "tools/list":
            reply(mid, {"tools": [{"name": n, "description": d,
                        "inputSchema": {"type": "object", "properties": pr, "required": rq}}
                        for n, (_, d, pr, rq) in TOOLS.items()]})
        elif method == "tools/call":
            nm = params.get("name")
            args = params.get("arguments") or {}
            if nm not in TOOLS:
                reply(mid, error="unknown tool %s" % nm)
                continue
            r = _dispatch(nm, args)
            if "error" in r:
                reply(mid, {"content": [{"type": "text", "text": "ERROR: %s" % r["error"]}], "isError": True})
            else:
                reply(mid, {"content": [{"type": "text", "text": json.dumps(r["ok"], ensure_ascii=False)[:60000]}]})
        elif mid is not None:
            reply(mid, {})


if __name__ == "__main__":
    main()
