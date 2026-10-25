"""Declarative allowlist loader for the flowsint MCP wrapper.

Reads `allowlist.yaml` (same folder) with a 60 s mtime-stat TTL — edits are
picked up without restart. Default-deny is structural: any enricher not
declared is rejected. See allowlist.yaml header for the full rule set.
"""
from __future__ import annotations

import os
import time
import threading
from typing import Any

try:
    import yaml
except ImportError:
    yaml = None

_HERE = os.path.dirname(os.path.abspath(__file__))
_YAML_PATH = os.environ.get("FLOWSINT_ALLOWLIST_PATH") or os.path.join(_HERE, "allowlist.yaml")
_YAML_FALLBACK = os.path.join(_HERE, "allowlist.example.yaml")
_TTL_SECONDS = 60

_LOCK = threading.Lock()
_CACHE: dict[str, Any] = {
    "loaded_at": 0.0,
    "mtime": 0.0,
    "allowlist_by_name": {},
    "forbidden_by_name": {},
    "allowed_infra_types": set(),
    "raw": None,
    "error": None,
}


class AllowlistError(Exception):
    pass


def _reload_if_stale() -> None:
    now = time.time()
    if _CACHE["loaded_at"] and (now - _CACHE["loaded_at"]) < _TTL_SECONDS:
        return
    with _LOCK:
        if _CACHE["loaded_at"] and (now - _CACHE["loaded_at"]) < _TTL_SECONDS:
            return
        # Prefer the operator-supplied allowlist.yaml; fall back to the
        # bundled example so a fresh clone still deny-by-defaults instead of
        # failing hard. Operators who want to force explicit configuration
        # can set FLOWSINT_ALLOWLIST_PATH to a non-existent path and this
        # will surface as `state().error`.
        active_path = _YAML_PATH if os.path.exists(_YAML_PATH) else _YAML_FALLBACK
        try:
            mtime = os.path.getmtime(active_path)
        except OSError as exc:
            _CACHE["error"] = "allowlist unavailable: %s" % exc
            _CACHE["loaded_at"] = now
            return
        if _CACHE["mtime"] == mtime and _CACHE["allowlist_by_name"]:
            _CACHE["loaded_at"] = now
            return
        if yaml is None:
            _CACHE["error"] = "PyYAML not installed; allowlist cannot be parsed"
            _CACHE["loaded_at"] = now
            return
        try:
            with open(active_path, encoding="utf-8") as fh:
                data = yaml.safe_load(fh)
        except Exception as exc:
            _CACHE["error"] = "allowlist parse failed: %s" % exc
            _CACHE["loaded_at"] = now
            return
        if not isinstance(data, dict):
            _CACHE["error"] = "allowlist.yaml root must be a mapping"
            _CACHE["loaded_at"] = now
            return
        allowlist_by_name: dict[str, dict] = {}
        for entry in data.get("allowlist") or []:
            if isinstance(entry, dict) and entry.get("name"):
                allowlist_by_name[str(entry["name"]).strip()] = entry
        forbidden_by_name: dict[str, dict] = {}
        for entry in data.get("forbidden") or []:
            if isinstance(entry, dict) and entry.get("name"):
                forbidden_by_name[str(entry["name"]).strip()] = entry
        allowed_infra_types = {str(t).strip() for t in (data.get("allowed_infra_types") or [])}
        if not allowed_infra_types:
            allowed_infra_types = {"Domain", "Ip", "Asn", "Cidr", "Organization", "Website"}
        _CACHE.update({
            "loaded_at": now,
            "mtime": mtime,
            "allowlist_by_name": allowlist_by_name,
            "forbidden_by_name": forbidden_by_name,
            "allowed_infra_types": allowed_infra_types,
            "raw": data,
            "error": None,
        })


def state() -> dict:
    _reload_if_stale()
    active_path = _YAML_PATH if os.path.exists(_YAML_PATH) else _YAML_FALLBACK
    return {
        "path": active_path,
        "using_fallback_example": not os.path.exists(_YAML_PATH),
        "mtime": _CACHE["mtime"],
        "loaded_at": _CACHE["loaded_at"],
        "allowlist_count": len(_CACHE["allowlist_by_name"]),
        "forbidden_count": len(_CACHE["forbidden_by_name"]),
        "allowed_infra_types": sorted(_CACHE["allowed_infra_types"]),
        "error": _CACHE["error"],
    }


def get_entry(name: str) -> dict | None:
    _reload_if_stale()
    return _CACHE["allowlist_by_name"].get((name or "").strip())


def all_entries() -> list[dict]:
    _reload_if_stale()
    return list(_CACHE["allowlist_by_name"].values())


def classify_enricher(name: str) -> tuple[bool, str, dict | None]:
    """Return (allowed, reason, entry_or_None). Default-deny.

    reason is the enricher name if allowed (mirrors the previous wrapper's
    contract), or an explicit denial string otherwise.
    """
    _reload_if_stale()
    err = _CACHE["error"]
    if err:
        return (False, "allowlist unavailable: %s" % err, None)
    key = (name or "").strip()
    if not key:
        return (False, "empty enricher name", None)
    forbidden = _CACHE["forbidden_by_name"].get(key)
    if forbidden:
        return (False, "forbidden by governance (LFPDPPP): %s" % forbidden.get("reason", "denied"), None)
    entry = _CACHE["allowlist_by_name"].get(key)
    if entry is None:
        return (False, "not in infrastructure allowlist (default-deny)", None)
    if entry.get("pii_touched"):
        return (False, "declared pii_touched=true in allowlist.yaml — requires Saurat re-authorization", entry)
    input_type = str(entry.get("input_type") or "").strip()
    if input_type not in _CACHE["allowed_infra_types"]:
        return (False, "input_type=%s not in allowed_infra_types" % input_type, entry)
    return (True, key, entry)


def enricher_input_type(name: str) -> str | None:
    entry = get_entry(name)
    if entry:
        return str(entry.get("input_type") or "").strip() or None
    return None


def templates() -> list[dict]:
    """Only the entries declared as source: template."""
    return [e for e in all_entries() if str(e.get("source") or "").strip() == "template"]
