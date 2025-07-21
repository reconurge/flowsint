import json
import aiohttp
from typing import List, Dict, Any, Optional, TypeAlias
from app.scanners.base import Scanner
from app.core.logger import Logger
from app.core.graph_db import Neo4jConnection

InputType: TypeAlias = List[dict]
OutputType: TypeAlias = List[dict]

class N8nConnector(Scanner):
    """
    Let's you use your custom n8n workflows to process data. The types are not checked on this connector, so make sure to use the correct types in your n8n workflows.
    """
    def __init__(
            self,
            sketch_id: Optional[str] = None,
            scan_id: Optional[str] = None,
            neo4j_conn: Optional[Neo4jConnection] = None,
            vault=None,
            params: Optional[Dict[str, Any]] = None
        ):
            super().__init__(
                sketch_id=sketch_id,
                scan_id=scan_id,
                neo4j_conn=neo4j_conn,
                params_schema=self.get_params_schema(),
                vault=vault,
                params=params
            )

    @classmethod
    def name(cls) -> str:
        return "n8n_connector"

    @classmethod
    def category(cls) -> str:
        return "external"

    @classmethod
    def key(cls) -> str:
        return "any"

    @classmethod
    def input_schema(cls) -> Dict[str, Any]:
        return {
            "type": "Any",
            "properties": [
                {"name": "value", "type": "object"}
            ]
        }

    @classmethod
    def output_schema(cls) -> Dict[str, Any]:
        return {
            "type": "Any",
            "properties": [
                {"name": "data", "type": "object"}
            ]
        }

    @classmethod
    def get_params_schema(cls) -> List[Dict[str, Any]]:
        return [
            {
                "name": "webhook_url",
                "type": "url",
                "required": True,
                "description": "The n8n webhook URL to send data to",
            },
            {
                "name": "auth_token",
                "type": "vaultSecret",
                "required": False,
                "description": "Optional authentication token for the webhook"
            },
            {
                "name": "extra_payload",
                "type": "string",
                "required": False,
                "description": "Optional JSON string with additional data to include in the payload"
            }
        ]

    async def scan(self, values: list[str]) -> list[dict]:
        params = self.get_params()
        url = params["webhook_url"]
        Logger.info(self.sketch_id, {"message": f"n8n connector url: {url}"})
        headers = {"Content-Type": "application/json"}
        if "auth_token" in params:
            headers["Authorization"] = f"Bearer {params['auth_token']}"

        payload = {
            "inputs": values
        }

        # Ajout de données additionnelles dans le payload
        if "extra_payload" in params and params["extra_payload"] is not None:
            try:
                extra = json.loads(params["extra_payload"])
                payload.update(extra)
            except json.JSONDecodeError:
                Logger.warn(self.sketch_id, {"message": "extra_payload is not valid JSON"})

        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as response:
                if response.status != 200:
                    raise Exception(f"n8n responded with {response.status}: {await response.text()}")
                data = await response.json()

        return data
    
    def postprocess(self, results: list[dict], original_input: list[dict]) -> list[dict]:
        Logger.success(self.sketch_id, {"message": "n8n connector results", "results": results})
        return results
