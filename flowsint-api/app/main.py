from fastapi import FastAPI
from app.scanners.registry import ScannerRegistry
from app.neo4j.connector import Neo4jConnection
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import transforms
from app.api.routes import sketches

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
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


app = FastAPI()
neo4j_connection = Neo4jConnection(URI, USERNAME, PASSWORD)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Ou ["*"] pour tout autoriser en dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transforms.router, prefix="/api", tags=["branches"])
app.include_router(sketches.router, prefix="/api", tags=["branches"])

@app.get("/scanners")
async def get_scans_list():
    return {"scanners": ScannerRegistry.list()}
