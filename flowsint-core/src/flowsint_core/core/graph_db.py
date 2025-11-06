import os
from threading import Lock
from typing import Optional, Dict, Any, List
from neo4j import GraphDatabase, Driver, Session
from dotenv import load_dotenv

load_dotenv()


class Neo4jConnection:
    """
    Singleton Neo4j connection manager with proper connection pooling.

    This class implements the Singleton pattern to ensure only one Neo4j driver
    instance exists throughout the application lifecycle, providing efficient
    connection pooling and resource management.
    """

    _instance: Optional['Neo4jConnection'] = None
    _lock: Lock = Lock()
    _driver: Optional[Driver] = None

    def __new__(cls, uri: str = None, user: str = None, password: str = None):
        """
        Create or return the singleton instance.

        Thread-safe singleton implementation using double-checked locking.
        """
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    instance = super().__new__(cls)
                    cls._instance = instance
        return cls._instance

    def __init__(self, uri: str = None, user: str = None, password: str = None):
        """
        Initialize the Neo4j connection (only once).

        Args:
            uri: Neo4j connection URI
            user: Neo4j username
            password: Neo4j password
        """
        # Only initialize once
        if self._driver is None:
            self._uri = uri or os.getenv("NEO4J_URI_BOLT")
            self._user = user or os.getenv("NEO4J_USERNAME")
            self._password = password or os.getenv("NEO4J_PASSWORD")

            if not all([self._uri, self._user, self._password]):
                raise ValueError("Neo4j connection credentials are required")

            self._driver = GraphDatabase.driver(
                self._uri,
                auth=(self._user, self._password),
                max_connection_pool_size=50,
                connection_acquisition_timeout=60.0
            )

    @classmethod
    def get_instance(cls) -> 'Neo4jConnection':
        """
        Get the singleton instance.

        Returns:
            The singleton Neo4jConnection instance
        """
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def get_driver(self) -> Driver:
        """
        Get the Neo4j driver instance.

        Returns:
            Neo4j Driver instance
        """
        return self._driver

    def query(self, query: str, parameters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Execute a single query.

        Args:
            query: Cypher query string
            parameters: Query parameters

        Returns:
            List of result records as dictionaries
        """
        with self._driver.session() as session:
            result = session.run(query, parameters or {})
            return result.data()

    def execute_write(self, query: str, parameters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Execute a write query within a write transaction.

        Args:
            query: Cypher query string
            parameters: Query parameters

        Returns:
            List of result records as dictionaries
        """
        def _execute(tx):
            result = tx.run(query, parameters or {})
            return result.data()

        with self._driver.session() as session:
            return session.execute_write(_execute)

    def execute_batch(self, queries: List[tuple[str, Dict[str, Any]]]) -> None:
        """
        Execute multiple queries in a single transaction.

        Args:
            queries: List of (query, parameters) tuples
        """
        def _execute_batch(tx):
            for query, params in queries:
                tx.run(query, params or {})

        with self._driver.session() as session:
            session.execute_write(_execute_batch)

    def close(self) -> None:
        """Close the driver connection."""
        if self._driver:
            self._driver.close()
            self._driver = None

    def verify_connectivity(self) -> bool:
        """
        Verify the connection to Neo4j.

        Returns:
            True if connection is successful, False otherwise
        """
        try:
            with self._driver.session() as session:
                result = session.run("RETURN 1")
                return result.single()[0] == 1
        except Exception:
            return False

    @classmethod
    def reset_instance(cls) -> None:
        """
        Reset the singleton instance (mainly for testing).

        WARNING: This should only be used in test scenarios.
        """
        with cls._lock:
            if cls._instance and cls._instance._driver:
                cls._instance._driver.close()
            cls._instance = None
            cls._driver = None


# Create the default singleton instance
try:
    URI = os.getenv("NEO4J_URI_BOLT")
    USERNAME = os.getenv("NEO4J_USERNAME")
    PASSWORD = os.getenv("NEO4J_PASSWORD")

    if all([URI, USERNAME, PASSWORD]):
        neo4j_connection = Neo4jConnection(URI, USERNAME, PASSWORD)
    else:
        # Don't create instance if credentials are missing
        neo4j_connection = None
except Exception as e:
    import logging
    logging.getLogger(__name__).warning(f"Failed to initialize Neo4j connection: {e}")
    neo4j_connection = None
