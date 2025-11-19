from flowsint_types.individual import Individual
import pytest


def test_valid_individual():
    indivudual = Individual(first_name="John", last_name="Doe")
    assert indivudual.first_name == "John"
    assert indivudual.last_name == "Doe"
    assert indivudual.label == "John Doe"


def test_invalid_individual():
    with pytest.raises(Exception) as e_info:
        Individual(name="John Doe")
    assert "validation errors for Individual" in str(e_info.value)
