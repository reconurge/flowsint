from flowsint_core.core.enricher_base import Enricher as _EnricherABC
from flowsint_enrichers.registry import ENRICHER_REGISTRY as _FI_ENRICHER_REGISTRY


class EnricherABC(_EnricherABC):
    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        _FI_ENRICHER_REGISTRY.register(cls)
