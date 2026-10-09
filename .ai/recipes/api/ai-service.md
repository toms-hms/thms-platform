---
name: api-ai-service
description: Guide for AI services (ai/services/*_service.py) that use OpenAIClient — tool calling, multi-turn sessions, JSON mode, recording generations, and testing with a fake client.
---

# AI Service (OpenAI tool use)

AI features are service classes in `ai/services/`: `DiagnoseService`, `EmailDraftService`
and `ImageGenerationService`. Each one talks to OpenAI only through `OpenAIClient`
(`ai/clients/openai_client.py`, see `client.md`). Prompts, tool definitions, model names
and pure prompt builders live in `ai/utils/prompt_utils.py`, so a prompt change is a
readable diff that does not touch orchestration.

```python
class DiagnoseService:
    """Runs the assistant's diagnostic conversation and persists the transcript on the job."""

    def __init__(self, *, openai: OpenAIClient | None = None) -> None:
        self.openai = openai or OpenAIClient()
```

`OpenAIClient` creates the SDK on first use, so a missing key is a `BAD_REQUEST` to the
one caller that needed it, not an import-time crash. A per-user key is
`OpenAIClient(api_key=...)`.

## Tool calling

The assistant is given tools and required to use one. A turn may carry several tool calls, so read them all:

```python
message = self.openai.chat(
    model=DIAGNOSE_MODEL,
    messages=[{"role": "system", "content": f"{system_prompt_for(job.intent)}\n\n{context}"}, *history],
    tools=tools_for(job.intent),
    tool_choice="required",
)

for tool_call in message.tool_calls or []:
    args = json.loads(tool_call.function.arguments)
    if tool_call.function.name == "ask_question":
        ...
```

The model may reasonably call `suggest_categories` *and* `ask_question` in the same turn. Never read only the first tool call.

## Prompts keyed by intent

The assistant scopes the work differently for an ISSUE, an IMPROVEMENT and RECURRING_WORK, so prompts and summary tools are dicts keyed by `JobIntent`, with a fallback:

```python
system_prompt_for(intent)  # prompt_utils: SYSTEM_PROMPTS.get(intent, SYSTEM_PROMPTS[JobIntent.ISSUE])
```

## JSON mode

For a structured result with no tool semantics, ask for JSON directly:

```python
message = self.openai.chat(model=EMAIL_MODEL, messages=[...], response_format={"type": "json_object"})
parsed = json.loads(message.content)
```

## Every call is recorded

An `AIGeneration` row is written for each provider call, so a job's AI history is auditable afterwards. A generation that fails is marked `FAILED` rather than deleted:

```python
try:
    ...
except Exception:
    AIGeneration.objects.apply_updates(generation, status=AIGenerationStatus.FAILED)
    raise
```

## Conversation state lives on the job

`Job.ai_session` holds `{messages, summary, categorySuggestions, confirmedCategories}`. Each turn appends the user's answer and the assistant's reply, then saves with `Job.objects.apply_updates(job, ai_session=...)`. There is no separate session store.

## Testing

Pass a fake `OpenAIClient` to the service; no test reaches the provider. Assert both
directions: what we sent and what we stored.

```python
openai = MagicMock(spec=OpenAIClient)
openai.chat.return_value = SimpleNamespace(
    tool_calls=[tool_call("ask_question", {"question": "How often?", "options": ["Weekly"]})], content=None
)
DiagnoseService(openai=openai).start(job_id=job.pk)

system_message = openai.chat.call_args.kwargs["messages"][0]["content"]
self.assertIn("recurring home maintenance service", system_message)
```

See `ai/tests/test_services.py` for the helpers (`tool_call`, `fake_openai`, `fake_storage`).
