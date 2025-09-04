import json
import aiohttp
from typing import List, Dict, Any, Optional
from flowsint_core.core.transform_base import Transform
from flowsint_core.core.logger import Logger
from flowsint_core.core.graph_db import Neo4jConnection


class N8nConnector(Transform):
    """
    Connect to your custom n8n workflows to process data through webhooks.
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
        params: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            sketch_id=sketch_id,
            scan_id=scan_id,
            neo4j_conn=neo4j_conn,
            params_schema=self.get_params_schema(),
            vault=vault,
            params=params,
        )

    @classmethod
    def documentation(cls) -> str:
        """Return formatted markdown documentation for the n8n connector."""
        return """
# n8n Connector

Connect to your custom n8n workflows to process data through webhooks. This connector allows you to leverage n8n's powerful automation capabilities within your FlowSint investigations.

## Setup Instructions

### 1. Configure n8n Workflow

Create a new workflow in n8n with the following structure:

```
[Webhook Trigger] → [Your Processing Nodes] → [Respond to Webhook]
```

### 2. Configure Webhook Trigger Node

In your n8n workflow, add a **Webhook** trigger node as the starting node:

```json
{
  "httpMethod": "POST",
  "path": "your-webhook-path",
  "responseMode": "responseNode"
}
```

**Important**: Set **Respond** to `"Using 'Respond to Webhook' node"`

### 3. Add Processing Logic

Add your custom processing nodes between the webhook trigger and response node. Your workflow will receive the following JSON payload:

```json
{
  "sketch_id": "sketch-uuid",
  "type": "input-data-type",
  "inputs": [
    // Your input data array
  ]
}
```

### 4. Configure Respond to Webhook Node

Add a **Respond to Webhook** node at the end of your workflow to return processed data:

```json
{
  "respondWith": "json",
  "responseBody": "{{ $json.processedData }}"
}
```

## Configuration Parameters

### Required Parameters

- **webhook_url** (url): The n8n webhook URL to send data to
  ```
  Example: https://your-n8n-instance.com/webhook/your-webhook-id
  ```

### Optional Parameters

- **auth_token** (vaultSecret): Authentication token for the webhook
  ```
  Used as: Authorization: Bearer <token>
  ```

- **extra_payload** (string): Additional JSON data to include in the payload
  ```json
  {
    "custom_field": "value",
    "metadata": {
      "source": "flowsint"
    }
  }
  ```

## Input/Output Types

- **Input**: `List[Any]` - Array of data to be processed
- **Output**: `List[Any]` - Array of processed results from n8n

## Example Usage

### Basic Setup

```json
{
  "webhook_url": "https://n8n.example.com/webhook/abc123"
}
```

### With Authentication

```json
{
  "webhook_url": "https://n8n.example.com/webhook/abc123",
  "auth_token": "your-secret-token"
}
```

### With Extra Payload

```json
{
  "webhook_url": "https://n8n.example.com/webhook/abc123",
  "extra_payload": "{\"priority\": \"high\", \"source\": \"investigation\"}"
}
```

## Sample n8n Workflow Response

Your n8n workflow should return data in this format:

```json
[
  {
    "id": "processed-item-1",
    "result": "processed data",
    "metadata": {
      "processed_at": "2024-01-01T12:00:00Z"
    }
  }
]
```

## Error Handling

The connector handles various error scenarios:

- **Non-200 HTTP responses**: Logs error and raises exception
- **Invalid JSON responses**: Returns error object with raw response
- **Network errors**: Logs error and re-raises exception

Example error response:
```json
[
  {
    "raw_response": "Server Error",
    "error": "Response was not valid JSON"
  }
]
```

## Security Considerations

- Use HTTPS URLs for webhook endpoints
- Store sensitive tokens in the vault system
- Validate and sanitize data in your n8n workflow
- Consider rate limiting in your n8n instance

## Troubleshooting

### Common Issues

1. **Webhook not responding**: Check n8n workflow is active and webhook URL is correct
2. **Authentication errors**: Verify auth_token is valid and properly stored in vault
3. **JSON parsing errors**: Ensure n8n workflow returns valid JSON

### Debug Logging

The connector provides detailed logging:
- Request payload sent to webhook
- Response status and content
- Processing results

Check FlowSint logs for detailed debugging information.

## Resources

- [n8n Webhook Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
- [Respond to Webhook Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/)
- [n8n HTTP Request Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)
"""

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
                "description": "Optional authentication token for the webhook",
            },
            {
                "name": "extra_payload",
                "type": "string",
                "required": False,
                "description": "Optional JSON string with additional data to include in the payload",
            },
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
            "inputs": values,
        }

        if "extra_payload" in params and params["extra_payload"] is not None:
            try:
                extra = json.loads(params["extra_payload"])
                payload.update(extra)
            except json.JSONDecodeError:
                Logger.warn(
                    self.sketch_id, {"message": "extra_payload is not valid JSON"}
                )

        Logger.info(
            self.sketch_id,
            {
                "message": f"Sending request to n8n webhook with payload: {json.dumps(payload)}"
            },
        )

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=payload) as response:
                    Logger.info(
                        self.sketch_id,
                        {
                            "message": f"n8n webhook responded with status: {response.status}"
                        },
                    )

                    # Log the raw response text for debugging
                    response_text = await response.text()
                    Logger.info(
                        self.sketch_id,
                        {"message": f"n8n webhook raw response: {response_text}"},
                    )

                    if response.status != 200:
                        Logger.warn(
                            self.sketch_id,
                            {
                                "message": f"n8n responded with non-200 status: {response.status} - Response: {response_text}"
                            },
                        )
                        raise Exception(
                            f"n8n responded with {response.status}: {response_text}"
                        )

                    try:
                        data = json.loads(response_text)
                        Logger.info(
                            self.sketch_id,
                            {
                                "message": f"n8n connector received response: {json.dumps(data)}"
                            },
                        )
                        return data
                    except json.JSONDecodeError as e:
                        Logger.warn(
                            self.sketch_id,
                            {
                                "message": f"Failed to parse n8n response as JSON: {str(e)} - Raw response: {response_text}"
                            },
                        )
                        # Return the raw text wrapped in a list of dicts as expected
                        return [
                            {
                                "raw_response": response_text,
                                "error": "Response was not valid JSON",
                            }
                        ]

        except Exception as e:
            Logger.warn(
                self.sketch_id, {"message": f"Error calling n8n webhook: {str(e)}"}
            )
            # Re-raise the exception so the caller knows something went wrong
            raise

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        Logger.success(
            self.sketch_id, {"message": f"n8n connector results: {json.dumps(results)}"}
        )
        return results


# Make types available at module level for easy access
InputType = N8nConnector.InputType
OutputType = N8nConnector.OutputType
