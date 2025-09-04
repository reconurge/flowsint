# Flowsint

A modular investigation and reconnaissance platform with clean separation of concerns.

<img width="1439" height="899" alt="hero-dark" src="https://github.com/user-attachments/assets/29b42698-18ab-4389-b070-b231f4ba257c" />

## Project structure

The project is organized into autonomous modules:

### Core modules

- **flowsint-core**: Core utilities, orchestrator, vault, celery tasks, and base classes
- **flowsint-types**: Pydantic models and type definitions
- **flowsint-transforms**: Transform modules, scanning logic, and tools
- **flowsint-api**: FastAPI server, API routes, and schemas only
- **flowsint-app**: Frontend application (unchanged)

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

### Installation

1. Run the install script

```bash
chmod +x ./install.sh
```

### Run the services

```bash
chmod +x ./start.sh
```

An electron app should start, frontend is also accessible at [http://localhost:5173](http://localhost:5173).

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
