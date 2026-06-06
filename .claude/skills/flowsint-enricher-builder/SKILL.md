---
name: flowsint-enricher-builder
description: Expert guidance for building Flowsint enrichers and their supporting types. Use when the user wants to add a new enricher, create a new Flowsint type, wire a new external API/tool into Flowsint, debug type/enricher discovery, or design a pivot from entity A to entity B. Knows where types live, how the enricher base class works, how vault secrets and params resolve, and when to recommend creating a new type instead of forcing data into an existing one.
---

# Flowsint Enricher Builder

You build enrichers and types for Flowsint. You do not memorize the catalog — you know where to look and how the pieces fit. Always read source before generating code: type definitions and existing enrichers are the ground truth.

## Authoritative source paths

Read these first. Never assume signatures or fields — open the file.

| What | Path |
|---|---|
| Type definitions | `flowsint-types/src/flowsint_types/<name>.py` |
| Type registry + decorator | `flowsint-types/src/flowsint_types/registry.py` |
| Type package exports | `flowsint-types/src/flowsint_types/__init__.py` |
| Enricher base class | `flowsint-core/src/flowsint_core/core/enricher_base.py` |
| Enricher registry + decorator | `flowsint-enrichers/src/flowsint_enrichers/registry.py` |
| Existing enrichers (templates) | `flowsint-enrichers/src/flowsint_enrichers/<input_type>/to_<output>.py` |
| UI category mapping | `flowsint-core/src/flowsint_core/core/services/type_registry_service.py` (`_get_category_definitions`) |
| Vault interface | `flowsint-core/src/flowsint_core/core/vault.py` |
| Logger interface | `flowsint-core/src/flowsint_core/core/logger.py` |
| Tools (external CLI/API wrappers) | `tools/` (top-level), e.g. `tools.network.subfinder.SubfinderTool` |
| Doc — types tutorial | `docs/developers/managing-types.mdx` |
| Doc — enrichers tutorial | `docs/developers/managing-enrichers.mdx` |
| Doc — enricher catalog | `docs/sources/available-enrichers.mdx` |

## The first question: new type or reuse?

When the user describes a enricher, decide before writing code:

1. **List the entities involved** — input data, output data, intermediate fields you'll attach.
2. **For each, check `flowsint-types/src/flowsint_types/`** — open the closest candidate file and read its fields.
3. **Decide:**
   - **Reuse** if existing type covers all required fields (extras allowed — `ConfigDict.extra = "allow"`).
   - **Extend an existing type** if 1–2 fields are missing — propose adding optional fields to the existing model.
   - **Create new type** if the entity is conceptually distinct (different primary key, different label semantics, different graph role).
4. **Never cram data into a wrong type.** If a "Domain" enricher returns risk scores, a `RiskProfile` exists — don't stuff scores into `Domain` metadata. If nothing fits, propose a new type and tell the user why.

Surface the decision to the user before generating code: list candidate types you found, what's missing, and your recommendation.

## Anatomy of an enricher

Minimum surface (read `enricher_base.py` for the full contract):

```python
from typing import List
from flowsint_core.core.enricher_base import Enricher
from flowsint_core.core.logger import Logger
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types import Domain, Ip  # or whatever types

@flowsint_enricher
class MyEnricher(Enricher):
    """[Source name] One-line purpose."""

    InputType = Domain      # base type, not List[Domain]
    OutputType = Ip

    @classmethod
    def name(cls) -> str: return "domain_to_ip"     # snake_case, unique
    @classmethod
    def category(cls) -> str: return "Domain"        # see note on casing below
    @classmethod
    def key(cls) -> str: return "domain"             # primary field of InputType

    @classmethod
    def get_params_schema(cls):                       # optional, only if params needed
        return [...]

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        ...

    def postprocess(self, results, input_data):
        for src, dst in zip(input_data, results):
            self.create_node(src)
            self.create_node(dst)
            self.create_relationship(src, dst, "RESOLVES_TO")
        return results

InputType = MyEnricher.InputType
OutputType = MyEnricher.OutputType
```

**File location:** `flowsint-enrichers/src/flowsint_enrichers/<input_type>/to_<target>.py`. The directory matches the input type's lowercase name. If no directory exists for your input type, create it (no `__init__.py` needed — auto-discovery walks the tree).

**Registration:** the `@flowsint_enricher` decorator does it. Do not edit any `registry.py`. API restart picks up new files via `load_all_enrichers()`.

## Params and secrets

Defined via `get_params_schema()` classmethod. Each entry is a dict:

| Field | Required | Notes |
|---|---|---|
| `name` | yes | Param key; for `vaultSecret`, also the default vault key name |
| `type` | yes | One of `string`, `number`, `select`, `url`, `vaultSecret` |
| `description` | yes | Shown in UI |
| `required` | no | Defaults to `false` |
| `default` | no | Default value |
| `options` | for `select` | List of `{"label": ..., "value": ...}` |

Read params inside `scan()`:

```python
mode = self.params.get("mode", "passive")
api_key = self.get_secret("MY_API_KEY")   # vault-resolved during async_init
```

**Vault resolution flow** (see `Enricher.resolve_params` in `enricher_base.py`):
1. If user passed a vault ID in params → vault looked up by that ID.
2. Else → vault looked up by the param name (e.g. `MY_API_KEY`).
3. If `required: true` and nothing found → `Exception("Required vault secret 'MY_API_KEY' is missing...")`.

**Never hardcode keys.** Always declare a `vaultSecret` param. Document the expected vault key name in the docstring.

## Graph operations (postprocess)

`create_node(obj)` and `create_relationship(from_obj, to_obj, rel_label="IS_RELATED_TO")` take Pydantic objects directly. Don't manually construct node dicts — pass the typed instance.

Relationship label convention: `UPPER_SNAKE_CASE` verb phrase (`HAS_DOMAIN`, `RESOLVES_TO`, `FOUND_IN_BREACH`). Be consistent with existing enrichers — grep before inventing a new label.

`self.log_graph_message("...")` for graph-related progress logs. `Logger.info / error / warn(self.sketch_id, {"message": "..."})` for general logs.

## Creating a new type — checklist

When you decide a new type is warranted:

1. **File**: `flowsint-types/src/flowsint_types/<snake_case>.py`.
2. **Class**: `PascalCase`, inherit from `FlowsintType`, decorate with `@flowsint_type`.
3. **Exactly one primary field**: `Field(..., json_schema_extra={"primary": True})`. Must uniquely identify the entity (used as Neo4j MERGE key).
4. **`compute_label`**: `@model_validator(mode='after')`, sets `self.nodeLabel`, returns `self`. Handle `None` for optional fields.
5. **Export in `__init__.py`**: add import + entry in `__all__`.
6. **Category** (optional but recommended): add a `("MyType", "primary_field_name", icon)` tuple in `_get_category_definitions()` in `type_registry_service.py`. Without this, the type works as an enricher I/O but doesn't show in the UI type picker.
7. **Reinstall**: `cd flowsint-types && poetry install` (or `make prod` from repo root).
8. **Test**: write a `tests/test_<name>.py` covering creation, primary uniqueness, `compute_label` with full/partial fields.

Full template + patterns: `docs/developers/managing-types.mdx`.

## Naming conventions (already-established, don't break)

- Enricher `name()`: `<input>_to_<output>` snake_case (e.g. `domain_to_ip`, `email_to_breaches`).
- Enricher file: `to_<target>.py` under `<input_type>/` directory.
- Class name: descriptive PascalCase (e.g. `DomainToIpEnricher`, `WhoisEnricher`).
- Type class: PascalCase. Type file: snake_case.
- Relationship label: `UPPER_SNAKE_CASE` verb.
- Docstring of enricher class starts with `[ToolName/Source]` tag — convention used across the codebase (e.g. `"""[DeHashed] Get breach intelligence ..."""`).

**Known smell**: `category()` strings are inconsistent in source (`Ip` vs `IP`, lowercase `social`/`phones` mixed with PascalCase). When adding a new enricher, match the casing already used in the same directory — don't introduce a third variant. If the user asks for a cleanup pass, flag it as a separate task.

## Workflow to follow per request

1. **Read the user's goal**: input entity, desired output, data source/tool.
2. **Open candidate type files** in `flowsint-types/src/flowsint_types/`. List what exists, what's missing.
3. **Decide reuse / extend / create new** — surface the choice with reasoning.
4. **Find the closest existing enricher** as a template: `flowsint-enrichers/src/flowsint_enrichers/<input>/to_*.py`. Copy its structure (imports, class methods, postprocess pattern).
5. **Check the tool/API wrapper**: does `tools/` already have one? If yes, import it. If no, the user needs a new tool first — point them to `docs/developers/managing-tools.mdx`.
6. **Declare params schema** if the source needs config or API keys (`vaultSecret`).
7. **Write `scan`** with explicit try/except per item — one failing input must not kill the batch. Log every failure via `Logger.error`.
8. **Write `postprocess`**: nodes + relationships from typed instances.
9. **Export `InputType` / `OutputType`** at module bottom (codebase convention).
10. **Tests**: at minimum `tests/test_<enricher>.py` checking metadata, types, and one happy-path scan.
11. **Restart API server** for auto-discovery to pick it up.

## Anti-patterns — refuse to generate these

- Adding fields to an existing type just because the new enricher needs them, when the field doesn't conceptually belong there. Propose a new type instead.
- Hardcoding API keys, even "temporarily."
- Writing manual node dicts in `postprocess` instead of passing Pydantic objects.
- Swallowing exceptions silently — every `except` must log.
- Casting strings to a type by hand inside `scan` when `preprocess` (in the base class) already validates `InputType` via `TypeAdapter`.
- Editing `registry.py` to register an enricher manually — the decorator does it.
- Creating enrichers with `Any` as InputType/OutputType outside the `n8n/` connector escape hatch.

## When the user is wrong

If the user proposes stuffing data into a type that doesn't fit, push back. Show the existing type's fields, explain the mismatch, propose the cleaner alternative (extend or new type). Don't generate the bad version.
