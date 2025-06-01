from fastapi import FastAPI, Depends
from app.scanners.registry import ScannerRegistry
from app.core.graph_db import Neo4jConnection
from app.core.events import init_events
import os
from typing import List
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
# Routes to be included
from app.api.routes import auth
from app.api.routes import investigations
from app.api.routes import sketches
from app.api.routes import transforms
from app.api.routes import logs
from sqlalchemy.orm import Session
from app.core.postgre_db import get_db 
from app.api.schemas.log import LogSchema
from app.models.models import Log
load_dotenv()

URI = os.getenv("NEO4J_URI_BOLT")
USERNAME = os.getenv("NEO4J_USERNAME")
PASSWORD = os.getenv("NEO4J_PASSWORD")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://app.flowsint.localhost",
    "https://app.flowsint.localhost",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3005",
    "http://127.0.0.1:3005",
    "http://localhost:5001",
    "http://127.0.0.1:5001",
]


app = FastAPI()
neo4j_connection = Neo4jConnection(URI, USERNAME, PASSWORD)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(sketches.router, prefix="/api/sketches", tags=["sketches"])
app.include_router(investigations.router, prefix="/api/investigations", tags=["investigations"])
app.include_router(transforms.router, prefix="/api/transforms", tags=["transforms"])
app.include_router(logs.router, prefix="/api/logs", tags=["logs"])

# Initialize event system
init_events(app)
