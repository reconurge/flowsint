from flowsint_core.core.scanner_base import build_params_model

def test_build_params_model_valid():
    param_schema = [
    {
        "name": "ETHERSCAN_API_KEY",
        "type": "string",
        "description": "The Etherscan API key to use for the transaction lookup.",
        "required": True
    },
    {
        "name": "url",
        "type": "string",
        "description": "Base URL for API",
        "required": False,
        "default": "https://api.etherscan.io/api"
    }
]
    ParamsModel = build_params_model(param_schema)
    validated_params = ParamsModel(ETHERSCAN_API_KEY="clef-123")
    assert validated_params.ETHERSCAN_API_KEY == "clef-123"
    assert validated_params.url == "https://api.etherscan.io/api"
    
def test_build_params_model_invalid():
    param_schema = [
    {
       
    },
    {
        "name": "url",
        "type": "string",
        "description": "Base URL for API",
        "required": False,
        "default": "https://api.etherscan.io/api"
    }
]
    ParamsModel = build_params_model(param_schema)
    validated_params = ParamsModel(ETHERSCAN_API_KEY="clef-123")
    assert validated_params.ETHERSCAN_API_KEY == "clef-123"
    assert validated_params.url == "https://api.etherscan.io/api"
    