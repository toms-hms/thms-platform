---
name: api-types
description: Guide for <app>/types.py — GraphQL object types (DjangoObjectType and plain graphene.ObjectType payloads), explicit fields, foreign keys as nested objects, nested relation resolvers and cross-app type references.
---

# API Types

Every GraphQL object type lives in its app's `types.py`. `schema.py` imports
from it and holds only queries and mutations (see `schema.md`). Keeping types
separate lets one app reference another's types without importing its schema.

```python
class QuoteType(DjangoObjectType):
    """A price a contractor gave for a job."""

    class Meta:
        model = Quote
        fields = ("id", "job", "contractor", "amount", "description", "status", "created_at", "updated_at")
        convert_choices_to_enum = False
```

## Rules

- **Always list `fields` explicitly.** A field nobody named cannot leak. That is how
  password hashes and encrypted tokens stay out of the schema.
- **Always set `convert_choices_to_enum = False`.** Enum-backed fields come out as plain
  strings, which is what clients compare against.
- **Foreign keys go in `fields`.** graphene-django turns each one into a field of the
  related type, required when the column is non-null. Don't declare it by hand and don't
  write a resolver that returns `self.<fk>`.
- **No flat `*_id` fields** for foreign keys. A client that needs the id selects it
  through the relation: `contractor { id }`. The list resolver preloads the relations
  its response reads, so this costs no extra query.
- **Only declare what the model doesn't have:** computed values (`url`, `full_address`)
  and reverse relations (`JobType.quotes`).
- **Nested relations** are fields resolved through the related model's queryset filters,
  e.g. `Quote.objects.filter_job_ids([self.pk]).select_related("contractor")`. Import the other app's model inside the resolver.
- **Payloads that are not models** (upload targets, AI results) are plain
  `graphene.ObjectType` classes in the same file.
- **Cross-app references:**
  - Import directly (`from contractors.types import ContractorType`) when there is no cycle.
  - Use a dotted string (`graphene.NonNull("quotes.types.QuoteType")`) when the other app's
    types import this one's.
- Types make **no access checks**. The resolver that returned the parent already
  authorised it.
- Docstring on every type and resolver.
