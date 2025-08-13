# Flowsint Project

A modular investigation and reconnaissance platform with clean separation of concerns.

## Project Structure

The project is organized into autonomous modules:

### Core Modules

- **flowsint-core**: Core utilities, orchestrator, vault, celery tasks, and base classes
- **flowsint-types**: Pydantic models and type definitions
- **flowsint-transforms**: Transform modules, scanning logic, and tools
- **flowsint-api**: FastAPI server, API routes, and schemas only
- **flowsint-app**: Frontend application (unchanged)

### Module Dependencies

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

## Development Setup

### Prerequisites

- Python 3.10+
- Poetry (for dependency management)
- Docker (for some tools)

### Installation

1. **Install Poetry** (if not already installed):
   ```bash
   curl -sSL https://install.python-poetry.org | python3 -
   ```

2. **Install dependencies for each module**:
   ```bash
   # Core module (must be installed first)
   cd flowsint-core
   poetry install
   
   # Types module
   cd ../flowsint-types
   poetry install
   
   # Transforms module
   cd ../flowsint-transforms
   poetry install
   
   # API module
   cd ../flowsint-api
   poetry install
   ```

3. **Set up environment variables**:
   Create `.env` files in each module directory as needed.

### Running the Application

1. **Start the API server**:
   ```bash
   cd flowsint-api
   poetry run uvicorn app.main:app --reload
   ```

2. **Start the frontend** (if needed):
   ```bash
   cd flowsint-app
   npm install
   npm start
   ```

## Module Details

### flowsint-core

Core utilities and base classes used by all other modules:

- Database connections (PostgreSQL, Neo4j)
- Authentication and authorization
- Logging and event handling
- Configuration management
- Base classes for scanners and tools
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

- Domain scanners (subdomains, WHOIS, resolution)
- IP scanners (geolocation, ASN lookup)
- Social media scanners (Maigret, Sherlock)
- Email scanners (breaches, Gravatar)
- Crypto scanners (transactions, NFTs)
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

## Development Workflow

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

## License

[Add your license information here] 