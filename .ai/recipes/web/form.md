---
name: web-form
description: Guide for forms — react-hook-form + zod schemas, the Form / Field / SubmitButton components, validation messages, submit errors, create vs edit blanks, and modal forms.
---

# Web Form Handling

Every form uses **react-hook-form** for state and **zod** for validation, through the
components in `src/components/ui/`. A form has no `useState` for its fields, no `saving` flag,
no `error` string and no `try`/`catch`: `Form`, `Field` and `SubmitButton` handle those.

## The pattern

```tsx
'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Field from '@/components/ui/Field';
import Form from '@/components/ui/Form';
import FormActions from '@/components/ui/FormActions';
import Input from '@/components/ui/Input';
import SubmitButton from '@/components/ui/SubmitButton';
import { optionalText, requiredText, stateCode, zipCode } from '@/lib/formFields';

const schema = z.object({
  address1: requiredText('Enter the street address'),
  name: requiredText('Give the home a name'),
  notes: optionalText,
  state: stateCode,
  zipCode,
});

const EMPTY_HOME = { address1: '', name: '', notes: '', state: '', zipCode: '' };

export default function HomesPage() {
  const [createHome] = useMutation(CreateHomeDocument);
  const form = useForm({ defaultValues: EMPTY_HOME, resolver: zodResolver(schema) });

  async function handleCreate(values: z.output<typeof schema>) {
    await createHome({ variables: values });   // a throw is shown above the fields
    setShowCreate(false);
  }

  return (
    <Form form={form} onSubmit={handleCreate}>
      <Field label="Home Name" name="name">
        <Input placeholder="Primary Residence" {...form.register('name')} />
      </Field>
      …
      <FormActions>
        <Button onClick={() => setShowCreate(false)} variant="secondary">Cancel</Button>
        <SubmitButton submittingText="Saving...">Create Home</SubmitButton>
      </FormActions>
    </Form>
  );
}
```

## The pieces

| Piece | Does |
|---|---|
| `useForm({ defaultValues, resolver: zodResolver(schema) })` | Field state, validation, submitting state. Always pass `defaultValues`: every field starts as a string (or array). |
| `Form` | Wraps `<form noValidate>` and the react-hook-form provider. Validates, then runs `onSubmit` with the **schema's output** (trimmed, transformed). Anything `onSubmit` throws (an API error) shows in an `Alert` above the fields. |
| `Field name="x"` | Label linked to the control, plus that field's validation message under it. |
| `form.register('x')` | Spread onto an `Input`, `Textarea` or `Select`. |
| `FormSelector name="x"` | A searchable `Selector` bound to a field. Any other custom control uses react-hook-form's `Controller` (see the category chips in `ContractorEditModal`). |
| `SubmitButton` | `type="submit"`; disabled and shows `submittingText` while submitting. |
| `FormActions` | The button row, right-aligned (`className="justify-between"` for a Back button). |
| `Alert` | The one message box: `tone="error"` (what `Form` uses), `"warning"`, `"info"`. |

## Schemas

- **Compose the helpers in `@/lib/formFields`** so rules and messages match across forms:
  `requiredText(msg)`, `optionalText`, `clearableText`, `optionalEmail`, `clearableEmail`,
  `stateCode`, `zipCode`, `zipCodeList`. Add a helper there before writing the same rule twice.
- **Messages say what to do** ("Enter the city", "Use the 2-letter state code"), not what's wrong.
- **Create vs edit blanks matter.** In a *create* form a blank optional field is `optionalText` →
  `undefined`, so the API leaves it unset. In an *edit* form use `clearableText` → `null`, which
  clears it; `undefined` would silently keep the old value.
- Enum fields validate against the generated enum: `status: z.enum(QuoteStatus)`.
- A numeric field is typed as text, then converted:
  `z.string().trim().min(1, '…').transform(Number).pipe(z.number().positive('…'))`.
- Type the submit handler with the schema's output: `values: z.output<typeof schema>`. An edit
  form's prefill function returns `z.input<typeof schema>`.

## Modal forms

Reset the form when the modal opens, so it never shows the last attempt's values or errors:

```tsx
function openCreate() {
  form.reset(EMPTY_HOME);
  setShowCreate(true);
}

// or, when a parent opens the modal by prop:
useEffect(() => {
  if (open) form.reset(contractor ? formFrom(contractor) : EMPTY_FORM);
}, [contractor, form, open]);
```

## Key rules

- No `useState` per field, no `saving` / `error` state, no `e.preventDefault()`: `Form` and
  `SubmitButton` own them.
- No `required` / `minLength` attributes: the schema is the one place a rule lives (`Form` sets
  `noValidate`, so the browser's own bubbles never appear).
- Never hand-write an error or warning box: use `Alert`.
- Enum values come from `@/graphql/types.generated`, and display lists in lifecycle order come from
  `@/lib/jobStatuses` / `@/lib/tradeCategories`, never hardcoded string arrays.
- A multi-step flow (the new-job wizard) is not one form: its step-to-step state stays in the page,
  and each step's errors use `Alert`.
