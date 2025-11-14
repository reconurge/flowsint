from fastapi import FastAPI
from flowsint_core.core.graph_db import Neo4jConnection
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

# Routes to be included
from app.api.routes import auth
from app.api.routes import investigations
from app.api.routes import sketches
from app.api.routes import transforms
from app.api.routes import flows
from app.api.routes import events
from app.api.routes import analysis
from app.api.routes import chat
from app.api.routes import scan
from app.api.routes import keys
from app.api.routes import types
from app.api.routes import custom_types

load_dotenv()

URI = os.getenv("NEO4J_URI_BOLT")
USERNAME = os.getenv("NEO4J_USERNAME")
PASSWORD = os.getenv("NEO4J_PASSWORD")

origins = [
    "*",
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


@app.get("/health")
async def health():
    """Health check endpoint for Docker healthcheck"""
    return {"status": "ok"}


app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(sketches.router, prefix="/api/sketches", tags=["sketches"])
app.include_router(
    investigations.router, prefix="/api/investigations", tags=["investigations"]
)
app.include_router(transforms.router, prefix="/api/transforms", tags=["transforms"])
app.include_router(flows.router, prefix="/api/flows", tags=["flows"])
app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(analysis.router, prefix="/api/analyses", tags=["analyses"])
app.include_router(chat.router, prefix="/api/chats", tags=["chats"])
app.include_router(scan.router, prefix="/api/scans", tags=["scans"])
app.include_router(keys.router, prefix="/api/keys", tags=["keys"])
app.include_router(types.router, prefix="/api/types", tags=["types"])
app.include_router(custom_types.router, prefix="/api/custom-types", tags=["custom-types"])
