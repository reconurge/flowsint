"""OpenTelemetry bootstrap for the flowsint MCP wrapper.

Sends OTLP HTTP spans to any OTLP endpoint (e.g. an OpenTelemetry Collector,
Langfuse, or a self-hosted receiver). If OTEL_EXPORTER_OTLP_ENDPOINT lacks the
`/v1/traces` path suffix, it is appended automatically so the operator can
supply just the base URL.

Env vars (all optional):
    OTEL_ENABLED                 default "1"; set to "0" to force disable
    OTEL_SERVICE_NAME            default "mcp-odoo-rpc"
    OTEL_EXPORTER_OTLP_ENDPOINT  empty = disabled (no spans exported)
    OTEL_EXPORTER_OTLP_HEADERS   comma-separated k=v pairs
                                 (e.g. "Authorization=Bearer abc,X-Env=prod")
    OTEL_TRACES_SAMPLER_ARG      default "1.0" (fraction of traces to keep)

Design:
- Graceful degrade: if opentelemetry is missing OR endpoint is empty,
  every helper is a no-op. The MCP keeps running.
- init() is idempotent — safe to call multiple times.
- The public API (start_span, is_enabled) is what server.py should touch.
- No SDK is installed at import time; init() must be called explicitly
  from the MCP entrypoint so the tests can control the tracer.

Public API:
    init(force: bool = False) -> bool          # returns True if tracing is live
    start_span(name: str, **attrs)             # context manager (no-op if disabled)
    is_enabled() -> bool
    stats() -> dict
    _reset_for_tests()                          # test-only

Brain: fase-0-otel-langfuse — real integration gap closed (see plan §2).
"""
from __future__ import annotations

import contextlib
import logging
import os
from typing import Any, Iterator

log = logging.getLogger(__name__)

_STATE: dict[str, Any] = {
    "initialized": False,
    "enabled": False,
    "endpoint": "",
    "service_name": "",
    "provider": None,
    "tracer": None,
    "reason_disabled": "not-initialized",
}


def _read_env_flag(name: str, default: str = "1") -> bool:
    val = (os.environ.get(name, default) or "").strip().lower()
    return val in ("1", "true", "yes", "on")


def _parse_headers(raw: str) -> dict[str, str]:
    out: dict[str, str] = {}
    if not raw:
        return out
    for pair in raw.split(","):
        pair = pair.strip()
        if not pair or "=" not in pair:
            continue
        k, v = pair.split("=", 1)
        k = k.strip()
        v = v.strip()
        if k:
            out[k] = v
    return out


def _try_import_otel():
    try:
        from opentelemetry import trace  # type: ignore
        from opentelemetry.sdk.resources import Resource  # type: ignore
        from opentelemetry.sdk.trace import TracerProvider  # type: ignore
        from opentelemetry.sdk.trace.export import BatchSpanProcessor  # type: ignore
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import (  # type: ignore
            OTLPSpanExporter,
        )
        return {
            "trace": trace,
            "Resource": Resource,
            "TracerProvider": TracerProvider,
            "BatchSpanProcessor": BatchSpanProcessor,
            "OTLPSpanExporter": OTLPSpanExporter,
        }
    except ImportError as exc:
        log.info("otel_bootstrap: opentelemetry unavailable (%s) — tracing off", exc)
        return None


def init(force: bool = False) -> bool:
    """Initialize the tracer provider once. Returns True if tracing is live.

    Called at MCP startup. Safe to call multiple times; a second call is
    a no-op unless force=True.
    """
    if _STATE["initialized"] and not force:
        return _STATE["enabled"]

    _STATE["initialized"] = True
    _STATE["enabled"] = False
    _STATE["reason_disabled"] = ""

    if not _read_env_flag("OTEL_ENABLED", "1"):
        _STATE["reason_disabled"] = "OTEL_ENABLED=0"
        return False

    endpoint = (os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "") or "").strip()
    if not endpoint:
        _STATE["reason_disabled"] = "OTEL_EXPORTER_OTLP_ENDPOINT-empty"
        return False

    mods = _try_import_otel()
    if mods is None:
        _STATE["reason_disabled"] = "opentelemetry-not-installed"
        return False

    service_name = (os.environ.get("OTEL_SERVICE_NAME", "") or "mcp-odoo-rpc").strip()
    headers = _parse_headers(os.environ.get("OTEL_EXPORTER_OTLP_HEADERS", ""))

    try:
        resource = mods["Resource"].create({"service.name": service_name})
        provider = mods["TracerProvider"](resource=resource)
        # OTLP HTTP receivers require the /v1/traces path. Auto-append when the
        # operator passed only the base (e.g. http://127.0.0.1:4318) so common
        # collector deployments work without extra env plumbing.
        traces_endpoint = endpoint.rstrip("/")
        if not traces_endpoint.endswith("/v1/traces"):
            traces_endpoint = traces_endpoint + "/v1/traces"
        exporter = mods["OTLPSpanExporter"](endpoint=traces_endpoint, headers=headers or None)
        provider.add_span_processor(mods["BatchSpanProcessor"](exporter))
        mods["trace"].set_tracer_provider(provider)
        tracer = mods["trace"].get_tracer(service_name)
    except Exception as exc:  # pragma: no cover - defensive
        _STATE["reason_disabled"] = f"init-failed:{type(exc).__name__}"
        log.warning("otel_bootstrap: init failed: %s", exc)
        return False

    _STATE["enabled"] = True
    _STATE["endpoint"] = endpoint
    _STATE["service_name"] = service_name
    _STATE["provider"] = provider
    _STATE["tracer"] = tracer
    log.info(
        "otel_bootstrap: tracing live service=%s endpoint=%s",
        service_name, endpoint,
    )
    return True


@contextlib.contextmanager
def start_span(name: str, **attributes: Any) -> Iterator[Any]:
    """Yield a span context. No-op (yields None) if tracing is disabled.

    Attributes must be primitives (str/int/float/bool) or lists thereof —
    complex objects will silently be dropped by the SDK.
    """
    tracer = _STATE.get("tracer")
    if tracer is None:
        yield None
        return
    span = tracer.start_span(name)
    try:
        for k, v in attributes.items():
            if v is None:
                continue
            try:
                span.set_attribute(k, v)
            except Exception:
                # OTel is strict about attribute types; skip silently.
                pass
        yield span
    except Exception as exc:
        try:
            span.record_exception(exc)
            span.set_attribute("error", True)
            span.set_attribute("error.type", type(exc).__name__)
        except Exception:
            pass
        raise
    finally:
        try:
            span.end()
        except Exception:
            pass


def is_enabled() -> bool:
    return bool(_STATE.get("enabled"))


def stats() -> dict:
    return {
        "initialized": _STATE["initialized"],
        "enabled": _STATE["enabled"],
        "service_name": _STATE["service_name"],
        "endpoint": _STATE["endpoint"],
        "reason_disabled": _STATE["reason_disabled"],
    }


def _reset_for_tests() -> None:
    """Test-only: wipe the tracer state so init() can re-run."""
    _STATE["initialized"] = False
    _STATE["enabled"] = False
    _STATE["endpoint"] = ""
    _STATE["service_name"] = ""
    _STATE["provider"] = None
    _STATE["tracer"] = None
    _STATE["reason_disabled"] = "reset"
