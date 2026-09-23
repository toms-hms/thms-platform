"""Model fields for the pre-existing Postgres schema."""

from django.db import models


class PGEnumField(models.CharField):
    """CharField stored in a native Postgres enum column (e.g. `"TradeCategory"`).

    The schema predates Django and uses real enum types rather than varchar, so
    the column type is emitted verbatim. Values are passed as plain strings —
    Postgres resolves them against the enum in inserts, comparisons and arrays.
    """

    def __init__(self, *args, enum_type: str = "", **kwargs):
        if not enum_type:
            raise ValueError("PGEnumField requires enum_type")
        self.enum_type = enum_type
        kwargs.setdefault("max_length", 64)
        super().__init__(*args, **kwargs)

    def db_type(self, connection) -> str:
        """Returns the quoted Postgres enum type name so migrations emit the real column type."""
        return f'"{self.enum_type}"'

    def deconstruct(self):
        """Returns the field's deconstruction with enum_type preserved for migrations."""
        name, path, args, kwargs = super().deconstruct()
        kwargs["enum_type"] = self.enum_type
        kwargs.pop("max_length", None)
        return name, path, args, kwargs


class CuidField(models.CharField):
    """Primary-key field holding an application-generated CUID2 string in a `text` column."""

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 32)
        kwargs.setdefault("primary_key", True)
        kwargs.setdefault("editable", False)
        super().__init__(*args, **kwargs)

    def db_type(self, connection) -> str:
        """Returns `text` — the schema stores identifiers as unbounded text, not varchar."""
        return "text"

    def deconstruct(self):
        """Returns the field's deconstruction without the implied max_length kwarg."""
        name, path, args, kwargs = super().deconstruct()
        kwargs.pop("max_length", None)
        return name, path, args, kwargs


class TextFieldNullable(models.TextField):
    """TextField that treats a missing value as NULL rather than an empty string."""

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("null", True)
        kwargs.setdefault("blank", True)
        super().__init__(*args, **kwargs)


class TimestampField(models.DateTimeField):
    """DateTimeField stored in a naive `timestamp(3)` column, as the existing schema defines them."""

    def db_type(self, connection) -> str:
        """Returns `timestamp(3)` — millisecond precision, no time zone."""
        return "timestamp(3)"


class JsonField(models.JSONField):
    """JSONField stored in a `json` column rather than Django's default `jsonb`."""

    def db_type(self, connection) -> str:
        """Returns `json` to match the column type already in the database."""
        return "json"
