# flowsint-api

## Installation

1. Install Python dependencies:
2. 
```bash
poetry install
```

## Run

```bash
# dev
poetry run uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload
# prod
poetry run uvicorn app.main:app --host 0.0.0.0 --port 5001
```
