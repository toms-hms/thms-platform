"""Domain errors and their GraphQL error codes.

Every error surfaces to the client as a GraphQL error carrying
`extensions.code` — the same code strings the REST API used in its
`{ error: { code, message } }` envelope, so clients keep switching on `code`.
"""


class AppError(Exception):
    """Base domain error carrying a stable machine-readable code."""

    code = "INTERNAL_ERROR"
    default_message = "An unexpected error occurred"

    def __init__(self, message: str | None = None):
        super().__init__(message or self.default_message)
        self.message = message or self.default_message


class NotFoundError(AppError):
    """Raised when a resource does not exist, or is hidden from the caller."""

    code = "NOT_FOUND"

    def __init__(self, resource: str = "Resource"):
        super().__init__(f"{resource} not found")


class UnauthorizedError(AppError):
    """Raised when the request carries no valid credentials."""

    code = "UNAUTHORIZED"
    default_message = "Unauthorized"


class ForbiddenError(AppError):
    """Raised when the caller is authenticated but lacks access to the resource."""

    code = "FORBIDDEN"
    default_message = "Forbidden"


class ConflictError(AppError):
    """Raised when a write collides with an existing row."""

    code = "CONFLICT"
    default_message = "Conflict"


class BadRequestError(AppError):
    """Raised when input fails validation."""

    code = "BAD_REQUEST"
    default_message = "Bad request"


class ValidationError(BadRequestError):
    """Raised when input fails field-level validation."""

    code = "VALIDATION_ERROR"
    default_message = "Validation failed"


class RateLimitError(AppError):
    """Raised when the caller exceeds the configured request rate."""

    code = "RATE_LIMITED"
    default_message = "Too many requests"
