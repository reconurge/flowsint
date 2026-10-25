"""OTel counter for flowsint MCP tool calls, plus optional Prometheus Pushgateway.

Two channels, both opt-in via env:
  1. OTLP metrics via OpenTelemetry SDK -> any OTLP HTTP receiver (Collector,
     Langfuse, etc.). Endpoint controlled by OTEL_EXPORTER_OTLP_ENDPOINT.
  2. Prometheus Pushgateway (PUSHGATEWAY_URL) - fallback for operators who
     prefer push-based ingestion. Only fires when the env is set.

Both channels degrade to no-op if their dependency is missing or endpoint empty.
"""
from __future__ import annotations

import logging
import os
import threading
from typing import Any

log = logging.getLogger(__name__)

_STATE: dict[str, Any] = {
    "initialized": False,
    "otlp_enabled": False,
    "otlp_counter": None,
    "pushgateway_url": "",
    "pushgateway_enabled": False,
    "service_name": "mcp-flowsint",
    "reason_disabled": "not-initialized",
}
_LOCK = threading.Lock()


def _try_otlp_metrics():
    try:
        from opentelemetry import metrics  # type: ignore
        from opentelemetry.sdk.resources import Resource  # type: ignore
        from opentelemetry.sdk.metrics import MeterProvider  # type: ignore
        from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader  # type: ignore
        from opentelemetry.exporter.otlp.proto.http.metric_exporter import (  # type: ignore
            OTLPMetricExporter,
        )
        return {
            "metrics": metrics,
            "Resource": Resource,
            "MeterProvider": MeterProvider,
            "PeriodicExportingMetricReader": PeriodicExportingMetricReader,
            "OTLPMetricExporter": OTLPMetricExporter,
        }
    except ImportError as exc:
        log.info("metrics: opentelemetry metrics unavailable (%s)", exc)
        return None


def init(force: bool = False) -> dict:
    """Initialize the counter provider. Idempotent unless force=True."""
    with _LOCK:
        if _STATE["initialized"] and not force:
            return dict(_STATE)
        _STATE["initialized"] = True
        _STATE["otlp_enabled"] = False
        _STATE["pushgateway_enabled"] = False
        _STATE["reason_disabled"] = ""

        service_name = (os.environ.get("OTEL_SERVICE_NAME") or "mcp-flowsint").strip()
        _STATE["service_name"] = service_name

        endpoint = (os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT") or "").strip()
        if endpoint:
            mods = _try_otlp_metrics()
            if mods is None:
                _STATE["reason_disabled"] = "opentelemetry-metrics-not-installed"
            else:
                try:
                    metrics_endpoint = endpoint.rstrip("/")
                    if not metrics_endpoint.endswith("/v1/metrics"):
                        metrics_endpoint = metrics_endpoint + "/v1/metrics"
                    resource = mods["Resource"].create({"service.name": service_name})
                    exporter = mods["OTLPMetricExporter"](endpoint=metrics_endpoint)
                    reader = mods["PeriodicExportingMetricReader"](exporter, export_interval_millis=15000)
                    provider = mods["MeterProvider"](resource=resource, metric_readers=[reader])
                    mods["metrics"].set_meter_provider(provider)
                    meter = mods["metrics"].get_meter(service_name)
                    counter = meter.create_counter(
                        name="mcp_tool_calls_total",
                        description="MCP flowsint tool calls by tool and result.",
                    )
                    _STATE["otlp_counter"] = counter
                    _STATE["otlp_enabled"] = True
                except Exception as exc:
                    _STATE["reason_disabled"] = "otlp-init-failed:%s" % type(exc).__name__
                    log.warning("metrics: OTLP init failed: %s", exc)
        else:
            _STATE["reason_disabled"] = "OTEL_EXPORTER_OTLP_ENDPOINT-empty"

        pgw = (os.environ.get("PUSHGATEWAY_URL") or "").strip()
        _STATE["pushgateway_url"] = pgw
        _STATE["pushgateway_enabled"] = bool(pgw)

        return dict(_STATE)


def record_tool_call(tool_name: str, result: str, extra: dict | None = None) -> None:
    """Increment the counter with (tool, result) labels. No-op if disabled."""
    counter = _STATE.get("otlp_counter")
    if counter is not None:
        attrs = {"tool": tool_name, "result": result}
        if extra:
            for k, v in extra.items():
                if isinstance(v, (str, int, float, bool)) and v is not None:
                    attrs[k] = v
        try:
            counter.add(1, attributes=attrs)
        except Exception as exc:
            log.debug("metrics.record_tool_call otlp add failed: %s", exc)

    if _STATE["pushgateway_enabled"]:
        _push_to_gateway(tool_name, result, extra or {})


def _push_to_gateway(tool_name: str, result: str, extra: dict) -> None:
    """Best-effort push to Prometheus Pushgateway using text-format POST."""
    url = _STATE["pushgateway_url"].rstrip("/")
    if not url:
        return
    import urllib.parse
    import urllib.request

    job = _STATE["service_name"]
    labels = "tool=\"%s\",result=\"%s\"" % (
        _pgw_escape(tool_name), _pgw_escape(result),
    )
    body = "# TYPE mcp_tool_calls_total counter\n"
    body += "mcp_tool_calls_total{%s} 1\n" % labels
    endpoint = url + "/metrics/job/" + urllib.parse.quote(job, safe="")
    req = urllib.request.Request(
        endpoint,
        data=body.encode("utf-8"),
        headers={"Content-Type": "text/plain; version=0.0.4"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=3) as resp:
            resp.read()
    except Exception as exc:
        log.debug("metrics: pushgateway POST failed: %s", exc)


def _pgw_escape(v: str) -> str:
    return (v or "").replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def stats() -> dict:
    return {
        "initialized": _STATE["initialized"],
        "otlp_enabled": _STATE["otlp_enabled"],
        "pushgateway_enabled": _STATE["pushgateway_enabled"],
        "pushgateway_url": _STATE["pushgateway_url"],
        "service_name": _STATE["service_name"],
        "reason_disabled": _STATE["reason_disabled"],
    }


def _reset_for_tests() -> None:
    _STATE.update({
        "initialized": False,
        "otlp_enabled": False,
        "otlp_counter": None,
        "pushgateway_url": "",
        "pushgateway_enabled": False,
        "service_name": "mcp-flowsint",
        "reason_disabled": "reset",
    })
