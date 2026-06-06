# Flowsint

[![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](./LICENSE)
[![Ethical Software](https://img.shields.io/badge/ethical-use-blue.svg)](./ETHICS.md)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20coffee-support-FFDD00?logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/dextmorgn)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-support-F16061?logo=ko-fi&logoColor=white)](https://ko-fi.com/P5P01W3GPJ)
[![Discord](https://img.shields.io/badge/Discord-Join%20Server-5865F2?logo=discord&logoColor=white)](https://discord.gg/aST9HMQr)


Flowsint is an open-source OSINT graph exploration tool designed for ethical investigation, transparency, and verification.

**Ethics:** Please read [ETHICS.md](./ETHICS.md) for responsible use guidelines.

<img width="1439" height="899" alt="hero-dark" src="https://github.com/user-attachments/assets/01eb128e-bef4-486e-9276-c4da58f829ae" />


https://github.com/user-attachments/assets/eaabfa81-d7b3-414d-8cf7-f69b4e37bab6


https://github.com/user-attachments/assets/7457d94a-cf1d-4a97-949f-f9b1d8d92644


https://github.com/user-attachments/assets/65c3f26e-7132-4853-be45-21b8933688bd


## Contributing

Flowsint is still in early development and definetly needs the help of the community! Feel free to raise issues, propose features, etc.

## Get started

Don't want to read ? Got it. Here's your install instructions:

### Linux / macOS

#### 1. Install pre-requisites

- Docker
- Make

#### 2. Run install command

```bash
git clone https://github.com/reconurge/flowsint.git
cd flowsint
make prod
```

### Windows

No Make needed. Works in both **Command Prompt (cmd)** and **PowerShell**.

#### 1. Install pre-requisites

- [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/) (make sure it is **running** before the next step)
- Git

#### 2. Clone and set up environment files

```bat
git clone https://github.com/reconurge/flowsint.git
cd flowsint

copy .env.example .env
copy .env.example flowsint-api\.env
copy .env.example flowsint-core\.env
copy .env.example flowsint-app\.env
```

#### 3. Start

```bat
docker compose -f docker-compose.prod.yml up -d
```

This pulls the pre-built images from GitHub Container Registry — no local build needed.

### First login

Then go to [http://localhost:5173/register](http://localhost:5173/register) and create an account. There are no credentials or account by default.


> ✅ OSINT investigations need a high level of privacy. Everything is stored on your machine.

### Deploy on a network (team / server)

The same setup works out of the box on a server: the frontend serves the UI **and** proxies all API calls internally, so no extra configuration is needed for clients.

```bash
git clone https://github.com/reconurge/flowsint.git
cd flowsint
cp .env.example .env
# Edit .env — see "Before exposing to a network" below
docker compose -f docker-compose.prod.yml up -d
```

Anyone on the network can then access Flowsint at `http://<server-ip>:5173`.

**Before exposing to a network, change the default secrets in `.env`:**

- `AUTH_SECRET` — signs authentication tokens. Generate one: `openssl rand -hex 32`
- `MASTER_VAULT_KEY_V1` — encrypts stored API keys. Generate one: `python3 -c "import os, base64; print('base64:' + base64.b64encode(os.urandom(32)).decode())"`
- `NEO4J_PASSWORD` — Neo4j database password.

Only port `5173` is exposed to the network. PostgreSQL, Redis, Neo4j and the API are bound to `127.0.0.1` on the server and reachable only through the frontend proxy.

To pin a specific version instead of `latest`, set `FLOWSINT_VERSION` in `.env` (e.g. `FLOWSINT_VERSION=1.2.10`).

**HTTPS (recommended beyond a trusted LAN):** put any reverse proxy in front of port 5173. Example with [Caddy](https://caddyserver.com/):

```
flowsint.example.com {
    reverse_proxy 127.0.0.1:5173
}
```

When fronting with a reverse proxy, also bind the app port to localhost in `docker-compose.prod.yml` (`"127.0.0.1:5173:8080"`) so clients can only go through HTTPS.


## What is it?

Flowsint is a graph-based investigation tool focused on reconnaissance and OSINT (Open Source Intelligence). It allows you to explore relationships between entities through a visual graph interface and automated enrichers.

### Available Enrichers

**Domain Enrichers**
- Reverse DNS Resolution - Find domains pointing to an IP
- DNS Resolution - Resolve domain to IP addresses
- Subdomain Discovery - Enumerate subdomains
- WHOIS Lookup - Get domain registration information
- Domain to Website - Convert domain to website entity
- Domain to Root Domain - Extract root domain
- Domain to ASN - Find ASN associated with domain
- Domain History - Retrieve historical domain data

**IP Enrichers**
- IP Information - Get geolocation and network details
- IP to ASN - Find ASN for IP address

**ASN Enrichers**
- ASN to CIDRs - Get IP ranges for an ASN

**CIDR Enrichers**
- CIDR to IPs - Enumerate IPs in a range

**Social Media Enrichers**
- Maigret - Username search across social platforms

**Organization Enrichers**
- Organization to ASN - Find ASNs owned by organization
- Organization Information - Get company details
- Organization to Domains - Find domains owned by organization

**Cryptocurrency Enrichers**
- Wallet to Transactions - Get transaction history
- Wallet to NFTs - Find NFTs owned by wallet

**Website Enrichers**
- Website Crawler - Crawl and map website structure
- Website to Links - Extract all links
- Website to Domain - Extract domain from URL
- Website to Webtrackers - Identify tracking scripts
- Website to Text - Extract text content

**Email Enrichers**
- Email to Gravatar - Find Gravatar profile
- Email to Breaches - Check data breach databases
- Email to Domains - Find associated domains

**Phone Enrichers**
- Phone to Breaches - Check phone number in breaches

**Individual Enrichers**
- Individual to Organization - Find organizational affiliations
- Individual to Domains - Find domains associated with person

**Integration Enrichers**
- N8n Connector - Connect to N8n workflows

## Project structure

The project is organized into autonomous modules:

### Core modules

- **flowsint-core**: Core utilities, orchestrator, vault, celery tasks, and base classes
- **flowsint-types**: Pydantic models and type definitions
- **flowsint-enrichers**: Enricher modules, scanning logic, and tools
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
flowsint-enrichers (enrichers & tools)
    ↓
flowsint-types (types)
```

## Development setup

### Prerequisites

- Docker

### Run

**Linux / macOS** (requires **Make**):

```bash
make dev
```

**Windows** (cmd or PowerShell, no Make — create the `.env` files first, see [Get started](#windows)):

```bat
docker compose -f docker-compose.dev.yml up -d --build
docker compose -f docker-compose.dev.yml logs -f
```

### Development

The app is accessible at [http://localhost:5173](http://localhost:5173).

## Module details

### flowsint-core

Core utilities and base classes used by all other modules:

- Database connections (PostgreSQL, Neo4j)
- Authentication and authorization
- Logging and event handling
- Configuration management
- Base classes for enrichers and tools
- Utility functions

### flowsint-types

Pydantic models for all data types:

- Domain, IP, ASN, CIDR
- Individual, Organization, Email, Phone
- Website, Social profiles, Credentials
- Crypto wallets, Transactions, NFTs
- And many more...

### flowsint-enrichers

Enricher modules that process data:

- Domain enrichers (subdomains, WHOIS, resolution)
- IP enrichers (geolocation, ASN lookup)
- Social media enrichers (Maigret, Sherlock)
- Email enrichers (breaches, Gravatar)
- Crypto enrichers (transactions, NFTs)
- And many more...

### flowsint-api

FastAPI server providing:

- REST API endpoints
- Authentication and user management
- Graph database integration
- Real-time event streaming

### flowsint-app

Frontend application.

- Modern and UI friendly interface
- Built for performance (no lag even on thousands of nodes)

## Development workflow

1. **Adding new types**: Add to `flowsint-types` module
2. **Adding new enrichers**: Add to `flowsint-enrichers` module
3. **Adding new API endpoints**: Add to `flowsint-api` module
4. **Adding new utilities**: Add to `flowsint-core` module

## Testing

Each module has its own (incomplete) test suite:

```bash
# Test core module
cd flowsint-core
uv run pytest

# Test types module
cd ../flowsint-types
uv run pytest

# Test enrichers module
cd ../flowsint-enrichers
uv run pytest

# Test API module
cd ../flowsint-api
uv run pytest
```

## Contributing

1. Follow the modular structure
2. Use Poetry for dependency management
3. Write tests for new functionality
4. Update documentation as needed


---

## ⚖️ Legal & Ethical Use

**Ethics:** Please read [ETHICS.md](./ETHICS.md) for responsible use guidelines.

Flowsint is designed **strictly for lawful, ethical investigation and research purposes**.

It was created to assist:
- Cybersecurity researchers and analysts
- Journalists and OSINT investigators
- Law enforcement or fraud investigation teams
- Organizations conducting internal threat intelligence or digital risk analysis

**Flowsint must not be used for:**
- Unauthorized intrusion, surveillance, or data collection
- Harassment, doxxing, or targeting of individuals
- Political manipulation, misinformation, or violation of privacy laws

Any misuse of this software is strictly prohibited and goes against the ethical principles defined in [ETHICS.md](./ETHICS.md).

## ❤️ Support

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20coffee-support-FFDD00?logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/dextmorgn)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-support-F16061?logo=ko-fi&logoColor=white)](https://ko-fi.com/P5P01W3GPJ)
