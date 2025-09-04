# flowsint-api

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Install spaCy models for person recognition:
```bash
python install_spacy_models.py
```

Or manually install the models:
```bash
python -m pip install fr_core_news_md  # French model (preferred)
python -m pip install en_core_web_md   # English model (fallback)
```

## Features

### Website Crawler (`to_crawler.py`)

The website crawler scans websites to extract:
- **Emails**: Email addresses found in the website content
- **Phone Numbers**: Phone numbers in various formats
- **Individuals**: Person names using spaCy Named Entity Recognition (NER)

The crawler:
- Follows internal links within the same domain
- Respects robots.txt and implements delays between requests
- Extracts visible text content from HTML pages
- Creates Neo4j relationships between websites and found entities

#### Person Recognition

The crawler uses spaCy to identify person names in website content:
- Supports both French (`fr_core_news_md`) and English (`en_core_web_md`) models
- Automatically falls back to English if French model is not available
- Creates `Individual` objects with first name, last name, and full name
- Establishes `MENTIONS_INDIVIDUAL` relationships in Neo4j

#### Configuration

The crawler can be configured with:
- `max_pages`: Maximum number of pages to crawl (default: 50)
- `timeout`: Request timeout in seconds (default: 30)
- `delay`: Delay between requests in seconds (default: 1.0)

## Usage

The API provides REST endpoints for various scanning operations. See the individual transform modules for specific usage examples.
