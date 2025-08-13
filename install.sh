#!/bin/bash
set -e

echo "🚀 Installing Flowsint Project modules..."

if ! command -v poetry &> /dev/null; then
    echo "❌ Poetry is not installed. Please install Poetry first:"
    echo "curl -sSL https://install.python-poetry.org | python3 -"
    exit 1
fi

# Create project venv in .venv
poetry config virtualenvs.in-project true --local

# Ensure Poetry uses the correct Python version
echo "🐍 Configuring Poetry to use Python 3.12..."
poetry env use python3.12

# Install all dependencies (local modules with path = editable install)
poetry install

echo "✅ All modules installed successfully!"
echo "🎯 Next steps:"
echo "1. Set up your environment variables in .env files"
echo "2. Start the API server: cd flowsint-api && poetry run uvicorn app.main:app --reload"
echo "3. Start the frontend: cd flowsint-app && npm install && npm start"

