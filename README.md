# Flowsint

A modular investigation and reconnaissance platform with clean separation of concerns.

<img width="1439" height="899" alt="hero-dark" src="https://github.com/user-attachments/assets/29b42698-18ab-4389-b070-b231f4ba257c" />

## Get started

Don't want to read ? Got it. Here's your install instructions: 

```bash
git clone https://github.com/reconurge/flowsint.git
cd flowsint
make dev
```

> ✅ OSINT investigations need a high level of privacy. Everything is stored on your machine.


## What is it?

Flowsint is a graph-based investigation tool focused on reconnaissance and OSINT (Open Source Intelligence). It allows you to explore relationships between entities through a visual graph interface and automated transforms.

### Available Transforms

**Domain Transforms**
- Reverse DNS Resolution - Find domains pointing to an IP
- DNS Resolution - Resolve domain to IP addresses
- Subdomain Discovery - Enumerate subdomains
- WHOIS Lookup - Get domain registration information
- Domain to Website - Convert domain to website entity
- Domain to Root Domain - Extract root domain
- Domain to ASN - Find ASN associated with domain
- Domain History - Retrieve historical domain data

**IP Transforms**
- IP Information - Get geolocation and network details
- IP to ASN - Find ASN for IP address

**ASN Transforms**
- ASN to CIDRs - Get IP ranges for an ASN

**CIDR Transforms**
- CIDR to IPs - Enumerate IPs in a range

**Social Media Transforms**
- Maigret - Username search across social platforms

**Organization Transforms**
- Organization to ASN - Find ASNs owned by organization
- Organization Information - Get company details
- Organization to Domains - Find domains owned by organization

**Cryptocurrency Transforms**
- Wallet to Transactions - Get transaction history
- Wallet to NFTs - Find NFTs owned by wallet

**Website Transforms**
- Website Crawler - Crawl and map website structure
- Website to Links - Extract all links
- Website to Domain - Extract domain from URL
- Website to Webtrackers - Identify tracking scripts
- Website to Text - Extract text content

**Email Transforms**
- Email to Gravatar - Find Gravatar profile
- Email to Breaches - Check data breach databases
- Email to Domains - Find associated domains

**Phone Transforms**
- Phone to Breaches - Check phone number in breaches

**Individual Transforms**
- Individual to Organization - Find organizational affiliations
- Individual to Domains - Find domains associated with person

**Integration Transforms**
- N8n Connector - Connect to N8n workflows

## Project structure

The project is organized into autonomous modules:

### Core modules

- **flowsint-core**: Core utilities, orchestrator, vault, celery tasks, and base classes
- **flowsint-types**: Pydantic models and type definitions
- **flowsint-transforms**: Transform modules, scanning logic, and tools
- **flowsint-api**: FastAPI server, API routes, and schemas only
- **flowsint-app**: Frontend application

### Module dependencies

```
flowsint-app (frontend)
    ↓
flowsint-api (API server)
    ↓
flowsint-core (orchestrator, tasks, vault)
    ↓
flowsint-transforms (transforms & tools)
    ↓
flowsint-types (types)
```

## Development setup

### Prerequisites

- Python 3.10+
- Poetry (for dependency management)
- Docker (for some tools)

### Run

For now, you can start flowsint in a development and production environment. Make sure you have **Make** installed.

```bash
make run
```

The app is accessible at [http://localhost:5173](http://localhost:5173).

## Module details

### flowsint-core

Core utilities and base classes used by all other modules:

- Database connections (PostgreSQL, Neo4j)
- Authentication and authorization
- Logging and event handling
- Configuration management
- Base classes for transforms and tools
- Utility functions

### flowsint-types

Pydantic models for all data types:

- Domain, IP, ASN, CIDR
- Individual, Organization, Email, Phone
- Website, Social profiles, Credentials
- Crypto wallets, Transactions, NFTs
- And many more...

### flowsint-transforms

Transform modules that process data:

- Domain transforms (subdomains, WHOIS, resolution)
- IP transforms (geolocation, ASN lookup)
- Social media transforms (Maigret, Sherlock)
- Email transforms (breaches, Gravatar)
- Crypto transforms (transactions, NFTs)
- And many more...

### flowsint-api

FastAPI server providing:

- REST API endpoints
- Authentication and user management
- Transform orchestration
- Graph database integration
- Real-time event streaming

### flowsint-app

Frontend application (unchanged from original).

## Development workflow

1. **Adding new types**: Add to `flowsint-types` module
2. **Adding new transforms**: Add to `flowsint-transforms` module
3. **Adding new API endpoints**: Add to `flowsint-api` module
4. **Adding new utilities**: Add to `flowsint-core` module

## Testing

Each module has its own test suite:

```bash
# Test core module
cd flowsint-core
poetry run pytest

# Test types module
cd ../flowsint-types
poetry run pytest

# Test transforms module
cd ../flowsint-transforms
poetry run pytest

# Test API module
cd ../flowsint-api
poetry run pytest
```

## Contributing

1. Follow the modular structure
2. Use Poetry for dependency management
3. Write tests for new functionality
4. Update documentation as needed
