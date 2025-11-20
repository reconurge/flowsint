from typing import List
from flowsint_core.core.transform_base import Transform
from flowsint_types import Phone
from flowsint_types.domain import Domain
from flowsint_types.ip import Ip


class ResolveTransform(Transform):
    InputType = List[Domain]
    OutputType = List[Ip]

    @classmethod
    def name(cls) -> str:
        return "domain_to_ip"

    @classmethod
    def category(cls) -> str:
        return "Domain"

    @classmethod
    def key(cls) -> str:
        return "domain"

    async def scan(self, data: InputType) -> OutputType:
        return []

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        return []


# Make types available at module level for easy access
InputType = ResolveTransform.InputType
OutputType = ResolveTransform.OutputType

transform = ResolveTransform("sketch_123", "scan_123")


def test_correct_preprocess():
    inputs = [
        Domain(domain="mydomain.com"),
        {"domain": "blog.mydomain2.com"},
        "mydomain3.com",
        "notADomaiN",
    ]
    preprocessed = transform.preprocess(inputs)
    assert len(preprocessed) == 3  # 3 valid domains
    assert preprocessed[0].domain == "mydomain.com"
    assert preprocessed[0].label == "mydomain.com"
    assert preprocessed[0].root == True

    assert preprocessed[1].domain == "blog.mydomain2.com"
    assert preprocessed[1].label == "blog.mydomain2.com"
    assert preprocessed[1].root == False

    assert preprocessed[2].domain == "mydomain3.com"
    assert preprocessed[2].label == "mydomain3.com"
    assert preprocessed[2].root == True


def test_incorrect_preprocess():
    inputs = [
        Phone(number="+33634565423"),
        {"name": "JohnDoe"},
        "mydomain.com",
        "notADomaiN",
    ]
    preprocessed = transform.preprocess(inputs)
    assert len(preprocessed) == 1  # 1 valid domain
    assert preprocessed[0].domain == "mydomain.com"
    assert preprocessed[0].root == True
    assert preprocessed[0].label == "mydomain.com"
