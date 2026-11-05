---
name: web-form
description: Guide for form handling in pages — Modal + useState pattern, FormEvent, error display, and controlled inputs.
---

# Web Form Handling

Forms live inside `<Modal>` components for create/edit actions, or inline in the page for simple one-field filters. All form state is managed with `useState`.

## Modal + form pattern

The canonical pattern: a boolean `show*` state controls the modal; a `form` state object holds all field values; `handleSubmit` calls a mutation, then refreshes the list.

```typescript
// State at the top of the page component
const [showCreate, setShowCreate] = useState(false);
const [saving, setSaving] = useState(false);
const [error, setError] = useState('');
const [form, setForm] = useState({
  name: '',
  companyName: '',
  email: '',
  phone: '',
  category: '' as TradeCategory | '',
  zipCodes: '',
  notes: '',
});

// Generic field updater — avoids one setter per field
function update(field: string, value: string) {
  setForm((f) => ({ ...f, [field]: value }));
}

// Submit handler
async function handleCreate(e: FormEvent) {
  e.preventDefault();        // prevent page reload
  setSaving(true);
  setError('');
  try {
    await createContractor({
      name: form.name,
      companyName: form.companyName || undefined,
      email: form.email || undefined,
      categories: form.category ? [form.category] : [],
      // Split comma-separated zip codes entered in a single text field
      zipCodes: form.zipCodes ? form.zipCodes.split(',').map((z) => z.trim()).filter(Boolean) : [],
      notes: form.notes || undefined,
    });
    setShowCreate(false);
    load();   // re-fetch the list
  } catch (err: any) {
    setError(err.message ?? 'Failed to save');
  } finally {
    setSaving(false);
  }
}
```

```tsx
// JSX
<Button onClick={() => {
  setForm({ name: '', companyName: '', email: '', phone: '', category: '', zipCodes: '', notes: '' });
  setError('');
  setShowCreate(true);
}}>
  Add Contractor
</Button>

<Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Contractor">
  <form onSubmit={handleCreate} className="space-y-4">
    {error && <p className="text-red-500 text-sm">{error}</p>}

    <Field label="Name *">
      <Input value={form.name} onChange={(e) => update('name', e.target.value)} required />
    </Field>

    <Field label="Trade Category">
      <Select value={form.category} onChange={(e) => update('category', e.target.value)}>
        <option value="">Select category</option>
        {Object.values(TradeCategory).map((c) => (
          <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
        ))}
      </Select>
    </Field>

    <Field hint="Comma-separated" label="ZIP Codes">
      <Input
        placeholder="78701, 78702"
        value={form.zipCodes}
        onChange={(e) => update('zipCodes', e.target.value)}
      />
    </Field>

    <Button className="w-full" loading={saving} loadingText="Saving…" type="submit">
      Save
    </Button>
  </form>
</Modal>
```

## Edit form

Edit reuses the same modal. Open it with the existing values pre-filled:

```typescript
const [editing, setEditing] = useState<Contractor | null>(null);

function openEdit(c: Contractor) {
  setForm({
    name:        c.name,
    companyName: c.companyName ?? '',
    email:       c.email ?? '',
    phone:       c.phone ?? '',
    category:    c.categories[0] ?? '',
    zipCodes:    c.zipCodes.join(', '),
    notes:       c.notes ?? '',
  });
  setEditing(c);
}

async function handleUpdate(e: FormEvent) {
  e.preventDefault();
  if (!editing) return;
  setSaving(true);
  setError('');
  try {
    await updateContractor(editing.id, {
      name:        form.name,
      categories:  form.category ? [form.category] : [],
      zipCodes:    form.zipCodes.split(',').map((z) => z.trim()).filter(Boolean),
    });
    setEditing(null);
    load();
  } catch (err: any) {
    setError(err.message ?? 'Failed to update');
  } finally {
    setSaving(false);
  }
}
```

## Key rules

- Always call `e.preventDefault()` in form submit handlers.
- Reset `error` to `''` at the start of each submit attempt.
- Empty optional string fields should be sent as `undefined`, not `''` — use `field || undefined`.
- Every control is a `Field` around an `Input` / `Select` / `Textarea`, and every button a `Button` (`type="submit"` for the submit; it defaults to `"button"`). See `component.md`.
- Enum values come from `@/graphql/types.generated` (schema enums) — never hardcode string literals for category/status values.
