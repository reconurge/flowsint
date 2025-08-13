from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session
import os
from dotenv import load_dotenv

load_dotenv()

# Remplace avec ton URL de BDD
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/flowsint")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
