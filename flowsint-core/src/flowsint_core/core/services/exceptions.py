"""
Domain exceptions for the service layer.

These exceptions represent business logic errors that can be caught
and converted to appropriate HTTP responses by route handlers.
"""


class ServiceError(Exception):
    """Base exception for all service errors."""

    def __init__(self, message: str = "A service error occurred"):
        self.message = message
        super().__init__(self.message)


class NotFoundError(ServiceError):
    """Entity not found."""

    def __init__(self, message: str = "Entity not found"):
        super().__init__(message)


class PermissionDeniedError(ServiceError):
    """User does not have permission to perform the action."""

    def __init__(self, message: str = "Permission denied"):
        super().__init__(message)


class ValidationError(ServiceError):
    """Input validation failed."""

    def __init__(self, message: str = "Validation failed"):
        super().__init__(message)


class DatabaseError(ServiceError):
    """Database operation failed."""

    def __init__(self, message: str = "Database operation failed"):
        super().__init__(message)


class AuthenticationError(ServiceError):
    """Authentication failed."""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message)


class ConflictError(ServiceError):
    """Resource conflict (e.g., duplicate entry)."""

    def __init__(self, message: str = "Resource conflict"):
        super().__init__(message)
