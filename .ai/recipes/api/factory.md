---
name: api-factory
description: Guide for writing test factories with factory_boy.
---

# Test Factories

One `DjangoModelFactory` per model, in the app's `factories.py`.

```python
class JobFactory(DjangoModelFactory):
    """Builds a job, creating its home and author unless they are supplied."""

    class Meta:
        model = Job

    home = factory.SubFactory(HomeFactory)
    created_by = factory.SubFactory(UserFactory)
    title = factory.Sequence(lambda n: f"Test Job {n}")
    intent = JobIntent.ISSUE
    category = TradeCategory.PLUMBING
    status = JobStatus.DRAFT
```

## Rules

- **`SubFactory` for required relations.** `JobFactory()` alone must produce a valid job; a test that cares about the home passes `JobFactory(home=home)`.
- **`Sequence` for anything unique** — emails, names, storage keys.
- **Enum members, never string literals**, exactly as in application code.
- **No id.** The model's `uuid.uuid4` default generates it.
- **Use the enum defaults a real row would have**, so a factory-built row is representative.

## Post-generation hooks for related rows

A hook creates rows in *other* tables. It never sets a column on the model itself:

```python
class HomeFactory(DjangoModelFactory):
    """Builds a home. Pass `owner=<user>` to create the owning membership with it."""

    class Meta:
        model = Home
        skip_postgeneration_save = True

    @factory.post_generation
    def owner(self, create: bool, user, **kwargs):
        """Creates an OWNER membership for the given user when one is supplied."""
        if create and user:
            UserHome.objects.create(user=user, home=self, role=HomeRole.OWNER)
```

Called as `HomeFactory(owner=user)` and `ContractorFactory(zip_codes=["78701"])`.

`skip_postgeneration_save = True` is required whenever a factory has a hook — without it factory_boy saves the instance a second time.

## Passwords

`UserFactory` hashes `TEST_PASSWORD` at cost 4, not the production cost. Tests that need to log in import `TEST_PASSWORD` from `accounts.factories` rather than hard-coding the string.
