"""Thin HTTP client + helpers for the flowsint FastAPI. Stdlib only.

Kept separate from flowsint_mcp.py so the wrapper stays close to the JSON-RPC
loop / tool orchestration. All governance decisions live in allowlist_loader.
"""
from __future__ import annotations

import json
import re
import socket
import time
import urllib.error
import urllib.parse
import urllib.request


class ApiError(Exception):
    pass


class FlowsintClient:
    def __init__(self, api_url: str, user: str, password: str, timeout: int = 30):
        self.api = api_url.rstrip("/")
        self.user = user
        self.password = password
        self.timeout = timeout
        self._token: str | None = None

    def _request(self, method, path, token=None, json_body=None, form_body=None,
                 query=None, timeout=None):
        url = self.api + path
        if query:
            url += "?" + urllib.parse.urlencode({k: v for k, v in query.items() if v is not None})
        data, headers = None, {"Accept": "application/json"}
        if json_body is not None:
            data = json.dumps(json_body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        elif form_body is not None:
            data = urllib.parse.urlencode(form_body).encode("utf-8")
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        if token:
            headers["Authorization"] = "Bearer " + token
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout or self.timeout) as resp:
                raw = resp.read().decode("utf-8", "replace")
                return resp.status, (json.loads(raw) if raw.strip() else None)
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8", "replace")
            try:
                body = json.loads(raw)
            except Exception:
                body = raw
            return e.code, body
        except urllib.error.URLError as e:
            raise ApiError("flowsint API unreachable at %s (%s)" % (self.api, e.reason))

    def _auth(self):
        if not self.user or not self.password:
            raise ApiError("account pending: FLOWSINT_USER/FLOWSINT_PASS not set in mcp/.env")
        status, body = self._request(
            "POST", "/api/auth/token",
            form_body={"username": self.user, "password": self.password, "grant_type": "password"},
        )
        if status == 401:
            raise ApiError("login 401: flowsint account pending or bad credentials")
        if status >= 400 or not isinstance(body, dict) or "access_token" not in body:
            raise ApiError("auth failed (HTTP %s): %s" % (status, str(body)[:200]))
        self._token = body["access_token"]
        return self._token

    def call(self, method, path, json_body=None, query=None, timeout=None):
        token = self._token or self._auth()
        status, body = self._request(method, path, token=token, json_body=json_body,
                                     query=query, timeout=timeout)
        if status == 401:
            token = self._auth()
            status, body = self._request(method, path, token=token, json_body=json_body,
                                         query=query, timeout=timeout)
        if status >= 400:
            raise ApiError("HTTP %s on %s: %s" % (status, path, str(body)[:300]))
        return body

    def owner_id(self):
        try:
            me = self.call("GET", "/api/auth/me")
            if isinstance(me, dict):
                return me.get("id")
        except ApiError:
            return None
        return None

    def enrichers(self):
        body = self.call("GET", "/api/enrichers")
        items = body if isinstance(body, list) else (body.get("enrichers") or body.get("data") or [])
        return [{"raw": it, "name": _enricher_name(it)} for it in items]


def _enricher_name(item):
    if isinstance(item, str):
        return item
    if isinstance(item, dict):
        for k in ("name", "id", "slug", "title", "key"):
            if item.get(k):
                return str(item[k])
    return str(item)


def detect_seed_type(seed):
    """Return the CAPITALIZED flowsint node type or raise on forbidden seed."""
    s = (seed or "").strip()
    if not s:
        raise ApiError("empty seed")
    if "@" in s:
        raise ApiError("forbidden by governance (LFPDPPP): infrastructure recon only (email seed rejected)")
    digits = re.sub(r"\D", "", s)
    if digits and len(digits) >= 7 and re.fullmatch(r"[\d\s+().-]+", s):
        raise ApiError("forbidden by governance (LFPDPPP): infrastructure recon only (phone seed rejected)")
    if " " not in s and re.fullmatch(r"[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", s):
        return "Domain"
    return "Organization"


def summarize_graph(g):
    nodes = (g.get("nds") or g.get("nodes")) if isinstance(g, dict) else None
    rels = (g.get("rls") or g.get("relationships") or g.get("edges") or g.get("relations")) if isinstance(g, dict) else None
    nodes = nodes or []
    rels = rels or []
    n_sum = []
    for n in nodes[:200]:
        if isinstance(n, dict):
            n_sum.append({"id": n.get("id"),
                          "label": n.get("nodeLabel") or n.get("label"),
                          "type": n.get("nodeType") or n.get("type")})
    r_sum = []
    for r in rels[:200]:
        if isinstance(r, dict):
            r_sum.append({"source": r.get("source"), "target": r.get("target"),
                          "label": r.get("label")})
    return {"node_count": len(nodes), "relationship_count": len(rels),
            "nodes": n_sum, "relationships": r_sum,
            "truncated": len(nodes) > 200 or len(rels) > 200}


def check_tcp(host, port, timeout=1.5):
    t0 = time.time()
    try:
        with socket.create_connection((host, int(port)), timeout=timeout):
            return {"status": "up", "latency_ms": round((time.time() - t0) * 1000, 1)}
    except Exception as exc:
        return {"status": "down", "latency_ms": None, "error": str(exc)[:120]}


def check_http(url, timeout=2.0):
    t0 = time.time()
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            resp.read(1)
            return {"status": "up" if resp.status < 500 else "degraded",
                    "http_code": resp.status,
                    "latency_ms": round((time.time() - t0) * 1000, 1)}
    except urllib.error.HTTPError as e:
        return {"status": "degraded", "http_code": e.code,
                "latency_ms": round((time.time() - t0) * 1000, 1)}
    except Exception as exc:
        return {"status": "down", "http_code": None, "error": str(exc)[:120]}
