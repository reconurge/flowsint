import re
from typing import Dict

import requests

from ..base import Tool

# Modulus-11 check digit weights for the two CNPJ verifier digits.
_WEIGHTS_12 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
_WEIGHTS_13 = [6] + _WEIGHTS_12


def normalize_cnpj(value: str) -> str:
    """Strip everything but digits."""
    return re.sub(r"\D", "", value or "")


def _check_digit(digits: str, weights: list) -> int:
    total = sum(int(d) * w for d, w in zip(digits, weights))
    remainder = total % 11
    return 0 if remainder < 2 else 11 - remainder


def is_valid_cnpj(value: str) -> bool:
    """Validate a CNPJ's two check digits (offline, no network call)."""
    digits = normalize_cnpj(value)
    if len(digits) != 14 or digits == digits[0] * 14:
        return False
    if _check_digit(digits[:12], _WEIGHTS_12) != int(digits[12]):
        return False
    if _check_digit(digits[:13], _WEIGHTS_13) != int(digits[13]):
        return False
    return True


class BrasilApiTool(Tool):
    @classmethod
    def name(cls) -> str:
        return "brasilapi"

    @classmethod
    def version(cls) -> str:
        return "1.0.0"

    @classmethod
    def description(cls) -> str:
        return (
            "BrasilAPI's CNPJ endpoint mirrors Receita Federal's public "
            "company registry (Brazil), no API key required."
        )

    @classmethod
    def category(cls) -> str:
        return "Business intelligence"

    def launch(self, cnpj: str) -> Dict:
        digits = normalize_cnpj(cnpj)
        if not is_valid_cnpj(digits):
            raise ValueError(f"'{cnpj}' is not a valid CNPJ.")
        try:
            resp = requests.get(
                f"https://brasilapi.com.br/api/cnpj/v1/{digits}",
                timeout=10,
            )
            if resp.status_code == 404:
                raise ValueError(f"No company found for CNPJ {digits}.")
            resp.raise_for_status()
            payload: Dict = resp.json()
            return payload
        except requests.RequestException as e:
            raise RuntimeError(f"Error querying BrasilAPI: {str(e)}")
