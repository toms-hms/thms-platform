"""Creates the native Postgres enum types the schema's columns are declared with.

These types predate Django — they were created by drizzle-kit — so this
migration is written to be a no-op against the existing database and to build
them from scratch for a fresh one (a test run, or a new environment). Every
app's initial migration depends on it.
"""

from django.db import migrations

ENUMS: dict[str, list[str]] = {
    "TradeCategory": [
        "PLUMBING", "ELECTRICAL", "HVAC", "ROOFING", "PAINTING", "LANDSCAPING",
        "GENERAL_CONTRACTING", "CARPENTRY", "FLOORING", "PEST_CONTROL",
        "DOORS_AND_WINDOWS", "POOL_AND_SPA",
    ],
    "JobIntent": ["ISSUE", "IMPROVEMENT", "RECURRING_WORK"],
    "UserRole": ["ADMIN", "USER"],
    "HomeRole": ["OWNER", "MEMBER"],
    "JobStatus": [
        "DRAFT", "PLANNING", "REACHING_OUT", "COMPARING_QUOTES",
        "SCHEDULED", "IN_PROGRESS", "AWAITING_PAYMENT", "COMPLETED",
    ],
    "JobContractorStatus": [
        "NOT_CONTACTED", "CONTACTED", "RESPONDED", "VISIT_REQUESTED",
        "VISIT_SCHEDULED", "VISIT_COMPLETED", "QUOTE_RECEIVED", "DECLINED",
        "ACCEPTED", "WORK_IN_PROGRESS", "WORK_COMPLETED", "PAID",
    ],
    "CommunicationChannel": ["EMAIL"],
    "CommunicationDirection": ["SENT", "RECEIVED"],
    "QuoteStatus": ["DRAFT", "CONFIRMED"],
    "AIGenerationStatus": ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
    "IntegrationType": ["EMAIL", "AI"],
    "IntegrationProvider": ["GOOGLE", "MICROSOFT", "OPENAI"],
}


def _create_sql() -> str:
    """Returns SQL that creates every enum type, skipping any that already exists."""
    statements = []
    for name, values in ENUMS.items():
        labels = ", ".join(f"'{value}'" for value in values)
        statements.append(
            f"""
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{name}') THEN
                    CREATE TYPE "{name}" AS ENUM ({labels});
                END IF;
            END $$;
            """
        )
    return "\n".join(statements)


def _drop_sql() -> str:
    """Returns SQL dropping every enum type this migration creates."""
    return "\n".join(f'DROP TYPE IF EXISTS "{name}";' for name in ENUMS)


class Migration(migrations.Migration):
    initial = True
    dependencies: list = []

    operations = [migrations.RunSQL(sql=_create_sql(), reverse_sql=_drop_sql())]
