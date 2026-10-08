---
name: api-types
description: Guide for <app>/types.py — GraphQL object types (DjangoObjectType and plain graphene.ObjectType payloads), explicit fields, flat FK ids, nested relation resolvers and cross-app type references.
---

# API Types

Every GraphQL object type lives in its app's `types.py`. `schema.py` imports
from it and holds only queries and mutations (see `schema.md`). Keeping types
separate lets one app reference another's types without importing its schema.

```python
class QuoteType(DjangoObjectType):
    """A price a contractor gave for a job."""

    contractor = graphene.Field(ContractorType, required=True)
    job_id = graphene.ID(required=True)

    class Meta:
        model = Quote
        fields = ("id", "job", "amount", "description", "status", "created_at", "updated_at")
        convert_choices_to_enum = False

    def resolve_contractor(self, info):
        """Returns the contractor who gave the quote."""
        return self.contractor

    def resolve_job_id(self, info) -> str:
        """Returns the id of the job this quote is against."""
        return self.job_id
```

## Rules

- **Always list `fields` explicitly.** A field nobody named cannot leak. That is how
  password hashes and encrypted tokens stay out of the schema.
- **Always set `convert_choices_to_enum = False`.** Enum-backed fields come out as plain
  strings, which is what clients compare against.
- **Expose flat FK ids** (`job_id`, `contractor_id`) next to the nested object, each with
  a one-line resolver returning `self.<fk>_id`.
- **Nested relations** are fields resolved through the related model's manager composition,
  e.g. `Quote.objects.list_for_job(self.pk)`. Import the other app's model inside the resolver.
- **Payloads that are not models** (upload targets, AI results) are plain
  `graphene.ObjectType` classes in the same file.
- **Cross-app references:**
  - Import directly (`from contractors.types import ContractorType`) when there is no cycle.
  - Use a dotted string (`graphene.NonNull("quotes.types.QuoteType")`) when the other app's
    types import this one's.
- Types make **no access checks**. The resolver that returned the parent already
  authorised it.
- Docstring on every type and resolver.
