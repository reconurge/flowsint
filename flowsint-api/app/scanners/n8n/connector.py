import json
import aiohttp
from typing import List, Dict, Any, Optional
from app.scanners.base import Scanner
from app.core.logger import Logger
from app.core.graph_db import Neo4jConnection

class N8nConnector(Scanner):
    """
    Connect to your custom n8n workflows to process data through webhooks.
    
    ## Setup instructions:
    1. In your n8n workflow, add a **Webhook** trigger node as the starting node
    2. In the Webhook node, set **Respond** to `"Using 'Respond to Webhook' node"`
    3. Add a **Respond to Webhook** node at the end of your workflow to return processed data
    4. Use the webhook URL from your n8n workflow in the `webhook_url` parameter
    
    The connector will send your input data as JSON to the webhook and expect JSON response.
    Types are not validated by this connector, so ensure your n8n workflow handles the expected data types correctly.
    
    For more details on webhook responses, see: [Respond to Webhook documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/)
    """
    
    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[Any]
    OutputType = List[Any]
    
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
    def icon(cls) -> str | None:
        return "n8n"

    @classmethod
    def name(cls) -> str:
        return "n8n_connector"

    @classmethod
    def category(cls) -> str:
        return "external"
    
    @classmethod
    def required_params(cls) -> bool:
        return True

    @classmethod
    def key(cls) -> str:
        return "any"

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

    async def scan(self, values: InputType) -> OutputType:
        params = self.get_params()
        url = params["webhook_url"]
        Logger.info(self.sketch_id, {"message": f"n8n connector url: {url}"})
        headers = {"Content-Type": "application/json"}
        if "auth_token" in params:
            headers["Authorization"] = f"Bearer {params['auth_token']}"

        payload = {
            "sketch_id": self.sketch_id,
            "type": values[0] if values else None,
            "inputs": values
        }

        if "extra_payload" in params and params["extra_payload"] is not None:
            try:
                extra = json.loads(params["extra_payload"])
                payload.update(extra)
            except json.JSONDecodeError:
                Logger.warn(self.sketch_id, {"message": "extra_payload is not valid JSON"})

        Logger.info(self.sketch_id, {"message": f"Sending request to n8n webhook with payload: {json.dumps(payload)}"})

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=payload) as response:
                    Logger.info(self.sketch_id, {"message": f"n8n webhook responded with status: {response.status}"})
                    
                    # Log the raw response text for debugging
                    response_text = await response.text()
                    Logger.info(self.sketch_id, {"message": f"n8n webhook raw response: {response_text}"})
                    
                    if response.status != 200:
                        Logger.warn(self.sketch_id, {"message": f"n8n responded with non-200 status: {response.status} - Response: {response_text}"})
                        raise Exception(f"n8n responded with {response.status}: {response_text}")
                    
                    try:
                        data = json.loads(response_text)
                        Logger.info(self.sketch_id, {"message": f"n8n connector received response: {json.dumps(data)}"})
                        return data
                    except json.JSONDecodeError as e:
                        Logger.warn(self.sketch_id, {"message": f"Failed to parse n8n response as JSON: {str(e)} - Raw response: {response_text}"})
                        # Return the raw text wrapped in a list of dicts as expected
                        return [{"raw_response": response_text, "error": "Response was not valid JSON"}]
                        
        except Exception as e:
            Logger.warn(self.sketch_id, {"message": f"Error calling n8n webhook: {str(e)}"})
            # Re-raise the exception so the caller knows something went wrong
            raise
    
    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        Logger.success(self.sketch_id, {"message": f"n8n connector results: {json.dumps(results)}"})
        return results

# Make types available at module level for easy access
InputType = N8nConnector.InputType
OutputType = N8nConnector.OutputType
