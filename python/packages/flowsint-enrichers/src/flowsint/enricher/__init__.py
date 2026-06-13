import importlib.metadata as _importlib_metadata

from flowsint_enrichers.registry import ENRICHER_REGISTRY as _FI_ENRICHER_REGISTRY
from flowsint_enrichers.domain import *

from .util import importlib as _fi_util_importlib


entry_points = _importlib_metadata.entry_points(group='flowsint.enricher')
plugins = {ep.value: _fi_util_importlib.lazy_load(ep) for ep in entry_points}
print(plugins)
for entry_point in entry_points:
    print(entry_point)
    print(entry_point.load())


print(_FI_ENRICHER_REGISTRY._enrichers)
