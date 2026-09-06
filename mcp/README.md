# flowsint MCP wrapper

Small stdio JSON-RPC wrapper that exposes a governed subset of the flowsint
FastAPI as [Model Context Protocol](https://modelcontextprotocol.io) tools,
so an LLM assistant can drive company-infrastructure recon safely.

**Governance is data, not code.** A YAML allowlist (`allowlist.yaml`) is the
single source of truth for what enrichers may run. Default-deny is structural:
anything not declared is rejected. Edit the YAML, wait <= 60 s, no restart.

## What ships in `mcp/`

| File | Purpose |
|---|---|
| `flowsint_mcp.py`     | JSON-RPC stdio loop; registers 7 tools. |
| `flowsint_client.py`  | Stdlib HTTP client, auth, graph/health helpers. |
| `allowlist_loader.py` | YAML classifier with 60 s mtime TTL. Fail-closed. |
| `allowlist.example.yaml` | Bundled sample - 26 upstream enrichers + denylist. Used as fallback when `allowlist.yaml` is absent, so a fresh clone still boots deny-by-defaults. |
| `otel_bootstrap.py`   | OTLP HTTP spans; graceful-degrade if OTel SDK is missing. |
| `metrics.py`          | `mcp_tool_calls_total{tool,result}` counter via OTLP + optional Pushgateway. |
| `env.example`         | Config template. Copy to `.env` and fill. |

## Tools exposed

| Name | Description |
|---|---|
| `flowsint_list_enrichers` | Live enrichers filtered by the allowlist. |
| `flowsint_recon_company`  | Seeds a Domain / Organization sketch and launches the safe infra enrichers. |
| `flowsint_launch_enricher`| Single-enricher pivot on an existing node. |
| `flowsint_get_graph`      | Nodes + relationships for a sketch (truncated at 200). |
| `flowsint_status`         | Recent run logs for a sketch. |
| `flowsint_load_custom_templates_from_disk` | Upserts YAML templates from `FLOWSINT_TEMPLATES_DIR`. Governed by the allowlist. |
| `flowsint_health`         | api / celery / redis / neo4j / allowlist / OTel status. |

## Quick start

1. `cp env.example .env` and fill `FLOWSINT_USER` / `FLOWSINT_PASS`.
2. `cp allowlist.example.yaml allowlist.yaml` and adjust to your policy.
3. Wire the wrapper into your MCP host (Claude Desktop, VS Code, ...):

```json
{
  "mcpServers": {
    "flowsint": {
      "command": "python",
      "args": ["/path/to/flowsint/mcp/flowsint_mcp.py"]
    }
  }
}
```

4. Optional: install OTel deps for tracing/metrics.

```
pip install opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp-proto-http
```

## Governance model

`classify_enricher(name)` runs on every call:

1. Name not declared in `allowlist` -> **DENY** (default-deny).
2. Name declared in `forbidden` -> **DENY** with the given reason.
3. Entry with `pii_touched: true` -> **DENY**; requires explicit re-authorization.
4. `input_type` not in `allowed_infra_types` -> **DENY**.
5. Otherwise -> **ALLOW**.

`allowlist.yaml` is your compliance trail. Every entry records
`authorized_by` / `authorized_date` / `reviewed_by` so the audit story
is diff-able in git rather than buried in a Python set.

Adding a template:

1. Write the YAML file (see `../templates/` in your fork).
2. Add its entry to `allowlist.yaml` under `allowlist:` with
   `source: template` and `template_path: ...`.
3. Call `flowsint_load_custom_templates_from_disk()` from the MCP host.
   The tool cross-checks against `allowlist.yaml` and upserts via
   `POST /api/enrichers/templates` (create) or
   `PUT /api/enrichers/templates/<id>` (update).

## Observability

- Every tool call emits an OTel span `flowsint.tools.<tool_name>` with
  attributes `{tool_name, result}` where `result in {ok, deny, error}`.
- A counter `mcp_tool_calls_total{tool, result}` is exported via OTLP;
  a Prometheus Pushgateway fallback is available if `PUSHGATEWAY_URL` is set.
- Both channels degrade to no-op if the OTel SDK is not installed or if
  `OTEL_EXPORTER_OTLP_ENDPOINT` is empty - the MCP still works.

## Notes

- `flowsint_health` reports Celery as `unknown` when the API does not
  expose `/api/workers`. A follow-up upstream contribution can wire
  a real worker liveness endpoint.
- The wrapper uses stdlib + PyYAML only. OTel deps are optional.
