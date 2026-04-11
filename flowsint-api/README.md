# flowsint-api

## Installation

1. Install Python dependencies:
2. 
```bash
uv sync
```

## Run

```bash
# dev
uv run uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload
# prod
uv run uvicorn app.main:app --host 0.0.0.0 --port 5001
```
