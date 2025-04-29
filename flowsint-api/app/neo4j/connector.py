from neo4j import GraphDatabase

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