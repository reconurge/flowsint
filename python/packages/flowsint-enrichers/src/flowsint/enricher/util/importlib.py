"""PEP 810-style explicit lazy imports for Python 3.12+.

Defers module loading until the imported name is first accessed.

Usage::

    import flowsint.util.importlib as _fi_util_importlib

    # Context manager style (PEP 810 syntax)
    with _fi_util_importlib.lazy():
        import heavy_module
        from package import submodule  # works when submodule is a module

    heavy_module.some_func()  # loads here

    # One-liner style
    heavy_module = _fi_util_importlib.lazy_import("heavy_module")
    heavy_module.some_func()  # loads here

    # Entry point style — defers ep.load() until first attribute access or call
    entry_points = importlib.metadata.entry_points(group='myapp.plugins')
    plugins = [_fi_util_importlib.lazy_load(ep) for ep in entry_points]
    # nothing loaded yet
    plugins[0].run()  # loads and calls here

Note:
    ``from x import name`` where ``name`` is a plain attribute (class, function,
    constant) will trigger loading of ``x`` at import time because Python must
    resolve the attribute immediately.  True attribute-level laziness would
    require transparent proxies for arbitrary Python objects.  This
    implementation covers the practical and common case: lazy *module* loading.

    ``lazy_load()`` wraps ``EntryPoint.load()`` entirely, so it handles both
    module-level and attribute-level entry points uniformly.
"""

from __future__ import annotations

import importlib.abc
import importlib.metadata
import importlib.util
import sys
import types
from contextlib import contextmanager
from typing import Generator


class _LazyFinder(importlib.abc.MetaPathFinder):
    """Meta path hook that wraps resolved loaders with ``importlib.util.LazyLoader``."""

    def find_spec(
        self,
        fullname: str,
        path: object,
        target: object = None,
    ) -> importlib.machinery.ModuleSpec | None:
        # Remove self temporarily to avoid infinite recursion when we call
        # find_spec recursively through the remaining finders.
        sys.meta_path.remove(self)
        try:
            spec = importlib.util.find_spec(fullname)
        finally:
            sys.meta_path.insert(0, self)

        if spec is None or spec.loader is None:
            return None

        # Module already loaded — let the normal machinery handle it.
        if fullname in sys.modules:
            return None

        spec.loader = importlib.util.LazyLoader(spec.loader)
        return spec


@contextmanager
def lazy() -> Generator[None, None, None]:
    """Context manager that makes ``import`` statements inside the block lazy.

    Modules imported inside the ``with`` block are not executed until an
    attribute is accessed on them for the first time.

    Example::

        with lazy():
            import numpy as np      # not loaded yet
            import pandas as pd     # not loaded yet

        df = pd.DataFrame()         # pandas loads here
        arr = np.array([1, 2, 3])   # numpy loads here
    """
    finder = _LazyFinder()
    sys.meta_path.insert(0, finder)
    try:
        yield
    finally:
        try:
            sys.meta_path.remove(finder)
        except ValueError:
            pass  # already removed (e.g. exception during import lookup)


def lazy_import(name: str) -> types.ModuleType:
    """Return a lazy proxy for *name*; the module loads on first attribute access.

    Unlike ``with lazy(): import name``, this helper works as a single
    expression and is useful for conditional or programmatic lazy imports.

    Example::

        np = lazy_import("numpy")
        # numpy is NOT loaded yet
        arr = np.array([1, 2, 3])   # numpy loads here

    Raises:
        ModuleNotFoundError: if *name* cannot be found by the import system.
    """
    spec = importlib.util.find_spec(name)
    if spec is None:
        raise ModuleNotFoundError(f"No module named {name!r}")
    if spec.loader is None:
        raise ImportError(f"Module {name!r} has no loader")

    loader = importlib.util.LazyLoader(spec.loader)
    spec.loader = loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    loader.exec_module(module)
    return module


class _LazyEntryPointProxy:
    """Transparent proxy that defers ``EntryPoint.load()`` until first use.

    ``EntryPoint.load()`` calls ``importlib.import_module()`` then immediately
    resolves an attribute path via ``getattr()``, which triggers full module
    execution even when wrapped in ``with lazy():``.  This proxy defers the
    entire ``.load()`` call — and therefore both the import and attribute
    resolution — until the proxy is first accessed or called.
    """

    __slots__ = ("_ep", "_obj", "_loaded")

    def __init__(self, ep: importlib.metadata.EntryPoint) -> None:
        object.__setattr__(self, "_ep", ep)
        object.__setattr__(self, "_obj", None)
        object.__setattr__(self, "_loaded", False)

    def _resolve(self) -> object:
        if not object.__getattribute__(self, "_loaded"):
            ep = object.__getattribute__(self, "_ep")
            obj = ep.load()
            object.__setattr__(self, "_obj", obj)
            object.__setattr__(self, "_loaded", True)
        return object.__getattribute__(self, "_obj")

    def __getattr__(self, name: str) -> object:
        return getattr(self._resolve(), name)

    def __call__(self, *args: object, **kwargs: object) -> object:
        return self._resolve()(*args, **kwargs)

    def __repr__(self) -> str:
        if object.__getattribute__(self, "_loaded"):
            return repr(object.__getattribute__(self, "_obj"))
        ep = object.__getattribute__(self, "_ep")
        return f"<lazy entry point {ep.value!r}>"


def lazy_load(ep: importlib.metadata.EntryPoint) -> _LazyEntryPointProxy:
    """Return a lazy proxy for an entry point; ``.load()`` is called on first use.

    Unlike wrapping ``ep.load()`` in ``with lazy():``, this defers both the
    module import *and* the attribute resolution step, so it works correctly
    for attribute-level entry points (e.g. ``'pkg.module:ClassName'``).

    Example::

        entry_points = importlib.metadata.entry_points(group='flowsint.enricher')
        enrichers = [lazy_load(ep) for ep in entry_points]
        # nothing loaded yet

        enrichers[0].scan(data)   # loads the first enricher here
    """
    return _LazyEntryPointProxy(ep)
