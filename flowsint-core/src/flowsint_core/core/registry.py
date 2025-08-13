import inspect
from typing import Dict, Type, List, Optional
from .scanner_base import Scanner


class ScannerRegistry:
    """
    Registry for managing scanner discovery and instantiation.
    Uses a dynamic discovery system to avoid circular dependencies.
    """
    
    _scanners: Dict[str, Type[Scanner]] = {}
    _scanner_modules: List[str] = []
    
    @classmethod
    def register(cls, scanner_class: Type[Scanner]) -> None:
        """Register a scanner class in the registry."""
        if not issubclass(scanner_class, Scanner):
            raise ValueError(f"Class {scanner_class.__name__} must inherit from Scanner")
        
        scanner_name = scanner_class.name()
        cls._scanners[scanner_name] = scanner_class
    
    @classmethod
    def register_module(cls, module_path: str) -> None:
        """Register a module path for dynamic scanner discovery."""
        if module_path not in cls._scanner_modules:
            cls._scanner_modules.append(module_path)
    
    @classmethod
    def discover_scanners(cls) -> None:
        """Dynamically discover and register scanners from registered modules."""
        import importlib
        import pkgutil
        
        for module_path in cls._scanner_modules:
            try:
                module = importlib.import_module(module_path)
                
                # Walk through the module to find scanner classes
                for name, obj in inspect.getmembers(module):
                    if (inspect.isclass(obj) and 
                        issubclass(obj, Scanner) and 
                        obj != Scanner and
                        hasattr(obj, 'name')):
                        cls.register(obj)
                        
            except ImportError as e:
                print(f"Warning: Could not import module {module_path}: {e}")
    
    @classmethod
    def scanner_exists(cls, name: str) -> bool:
        """Check if a scanner with the given name exists."""
        return name in cls._scanners
    
    @classmethod
    def get_scanner(cls, name: str, sketch_id: str, scan_id: str, **kwargs) -> Scanner:
        """Get a scanner instance by name."""
        if name not in cls._scanners:
            raise Exception(f"Scanner '{name}' not found")
        return cls._scanners[name](sketch_id=sketch_id, scan_id=scan_id, **kwargs)

    @classmethod
    def _create_scanner_metadata(cls, scanner: Type[Scanner]) -> Dict[str, str]:
        """Helper method to create scanner metadata dictionary."""
        return {
            "class_name": scanner.__name__,
            "name": scanner.name(),
            "module": scanner.__module__,
            "description": scanner.__doc__,
            "documentation": inspect.cleandoc(scanner.documentation()),
            "category": scanner.category(),
            "inputs": scanner.input_schema(),
            "outputs": scanner.output_schema(),
            "params": {},
            "params_schema": scanner.get_params_schema(),
            "required_params": scanner.required_params(),
            "icon": scanner.icon(),
        }

    @classmethod
    def list(cls) -> Dict[str, Dict[str, str]]:
        """List all registered scanners with their metadata."""
        return {
            name: cls._create_scanner_metadata(scanner)
            for name, scanner in cls._scanners.items()
        }
    
    @classmethod
    def list_by_categories(cls) -> Dict[str, List[Dict[str, str]]]:
        """List scanners grouped by category."""
        scanners_by_category = {}
        for _, scanner in cls._scanners.items():
            category = scanner.category()
            if category not in scanners_by_category:
                scanners_by_category[category] = []
            scanners_by_category[category].append(cls._create_scanner_metadata(scanner))
        return scanners_by_category
    
    @classmethod
    def list_by_input_type(cls, input_type: str) -> List[Dict[str, str]]:
        """List scanners that accept a specific input type."""
        input_type_lower = input_type.lower()
        
        if input_type_lower == "any":
            return [cls._create_scanner_metadata(scanner) for scanner in cls._scanners.values()]
            
        return [
            cls._create_scanner_metadata(scanner)
            for scanner in cls._scanners.values()
            if scanner.input_schema()["type"].lower() in ["any", input_type_lower]
        ]
    
    @classmethod
    def clear(cls) -> None:
        """Clear all registered scanners (mainly for testing)."""
        cls._scanners.clear()
        cls._scanner_modules.clear()
