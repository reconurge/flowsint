#!/usr/bin/env python3
"""
Install required spaCy models (French + English) if not already installed.
"""

import importlib
import sys
from spacy.cli import download

def is_model_installed(model_name):
    """Check if a spaCy model is already installed."""
    try:
        importlib.import_module(model_name)
        return True
    except ImportError:
        return False

def install_spacy_model(model_name):
    """Download and install a spaCy model if it's not already present."""
    if is_model_installed(model_name):
        print(f"✓ {model_name} is already installed")
        return True
    try:
        print(f"⬇ Downloading {model_name}...")
        download(model_name)
        print(f"✓ Successfully downloaded {model_name}")
        return True
    except Exception as e:
        print(f"✗ Failed to download {model_name}: {e}")
        return False

def main():
    print("Installing required spaCy models for person recognition...\n")

    # List of models to try (priority order)
    models = [
        "fr_core_news_md",  # French preferred
        "en_core_web_md",   # English fallback
    ]

    success_count = 0

    for model in models:
        if install_spacy_model(model):
            success_count += 1
            if model == "fr_core_news_md":
                break  # Stop if French model is installed

    print("\n========== Summary ==========")
    if success_count > 0:
        print(f"✓ {success_count} model(s) installed or already present.")
        print("spaCy is ready for named entity recognition (persons).")
    else:
        print("✗ Failed to install any spaCy models.")
        print("Try manually with:")
        print("  python -m spacy download fr_core_news_md")

if __name__ == "__main__":
    main()
