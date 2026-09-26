import typing as _t

import flowsint.types as _fi_types

import flowsint.enricher.abc as _fi_enricher_abc


class Enricher(_fi_enricher_abc.EnricherABC):
    # Define types as class attributes (base types, not lists)
    InputType = _fi_types.Domain
    OutputType = _fi_types.Ip

    @classmethod
    def name(cls):
        return "my_enricher"

    @classmethod
    def category(cls):
        return "Domain"

    @classmethod
    def key(cls):
        return "domain"

    # preprocess receives a list and returns a list of validated InputType instances
    def preprocess(self, data: _t.List) -> _t.List[_fi_types.Domain]:
        # Generic implementation handles validation automatically
        return super().preprocess(data)

    # scan receives a list of InputType and returns a list of OutputType
    async def scan(self, data: _t.List[_fi_types.Domain]) -> _t.List[_fi_types.Ip]:
        results: _t.List[_fi_types.Ip] = []
        # ... implementation
        return results

# Make types available at module level for easy access
InputType = Enricher.InputType
OutputType = Enricher.OutputType
