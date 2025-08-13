import os
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

class Neo4jConnection:
    def __init__(self, uri: str, user: str, password: str):
        self.__uri = uri
        self.__user = user
        self.__password = password
        self.__driver = GraphDatabase.driver(self.__uri, auth=(self.__user, self.__password))

    def query(self, query: str, parameters: dict = None):
        with self.__driver.session() as session:
            result = session.run(query, parameters)
            return result.data()
    

URI = os.getenv("NEO4J_URI_BOLT")
URI = "bolt://localhost:7687"
USERNAME = os.getenv("NEO4J_USERNAME")
PASSWORD = os.getenv("NEO4J_PASSWORD")

neo4j_connection = Neo4jConnection(URI, USERNAME, PASSWORD)



# import os
# from neo4j import GraphDatabase
# from dotenv import load_dotenv
# from pydantic_neo4j import PydanticNeo4j
# load_dotenv()

# class Neo4jConnection:
#     def __init__(self, uri: str, user: str, password: str):
#         self.__uri = uri
#         self.__user = user
#         self.__password = password
#         self.__driver = GraphDatabase.driver(self.__uri, auth=(self.__user, self.__password))

#     def query(self, query: str, parameters: dict = None):
#         with self.__driver.session() as session:
#             result = session.run(query, parameters)
#             return result.data()
    

# URI = os.getenv("NEO4J_URI_BOLT")
# USERNAME = os.getenv("NEO4J_USERNAME")
# PASSWORD = os.getenv("NEO4J_PASSWORD")

# neo4j_connection = PydanticNeo4j(URI, USERNAME, PASSWORD)
# match_util = neo4j_connection.match_utilities
# create_util = neo4j_connection.create_utilities
# database_operations = neo4j_connection.database_operations
