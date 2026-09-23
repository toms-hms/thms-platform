---
name: api-ai-service
description: Guide for AI service functions that call OpenAI — tool calling, multi-turn sessions, JSON mode, and how to test them.
---

# AI Service (OpenAI tool use)

AI code lives in `ai/services.py`; the prompts and tool definitions live beside it in `ai/prompts.py`, so a prompt change is a readable diff that does not touch the orchestration.

## The client is built per call

```python
def get_openai_client() -> OpenAI:
    """Returns an OpenAI client, raising when no API key is configured."""
    if not settings.OPENAI_API_KEY:
        raise BadRequestError("OpenAI API key not configured")
    return OpenAI(api_key=settings.OPENAI_API_KEY)
```

Building it at call time means a missing key is a `BAD_REQUEST` to the one caller that needed it, not an import-time crash — and it gives tests a single seam to patch.

## Tool calling

The assistant is given tools and required to use one. A turn may carry several tool calls, so read them all:

```python
response = get_openai_client().chat.completions.create(
    model=DIAGNOSE_MODEL,
    messages=[
        {"role": "system", "content": f"{system_prompt}\n\n{_job_context(job)}"},
        *[{"role": m["role"], "content": m["content"]} for m in history],
    ],
    tools=_tools_for(intent),
    tool_choice="required",
)

for tool_call in response.choices[0].message.tool_calls or []:
    args = json.loads(tool_call.function.arguments)
    if tool_call.function.name == "ask_question":
        ...
```

The model may reasonably call `suggest_categories` *and* `ask_question` in the same turn. Never read only the first tool call.

## Prompts keyed by intent

The assistant scopes the work differently for an ISSUE, an IMPROVEMENT and RECURRING_WORK, so prompts and summary tools are dicts keyed by `JobIntent`, with a fallback:

```python
system_prompt = SYSTEM_PROMPTS.get(intent, SYSTEM_PROMPTS[JobIntent.ISSUE])
```

## JSON mode

For a structured result with no tool semantics, ask for JSON directly:

```python
response = client.chat.completions.create(
    model=EMAIL_MODEL,
    messages=[...],
    response_format={"type": "json_object"},
)
parsed = json.loads(response.choices[0].message.content)
```

## Every call is recorded

An `AIGeneration` row is written for each provider call, so a job's AI history is auditable afterwards. A generation that fails is marked `FAILED` rather than deleted:

```python
try:
    ...
except Exception:
    generation.status = AIGenerationStatus.FAILED
    generation.save(update_fields=["status", "updated_at"])
    raise
```

## Conversation state lives on the job

`Job.ai_session` holds `{messages, summary, categorySuggestions, confirmedCategories}`. Each turn appends the user's answer and the assistant's reply, then saves. There is no separate session store.

## Testing

Patch `ai.services.get_openai_client`; no test reaches the provider. Assert both directions — what we sent and what we stored:

```python
client = MagicMock()
client.chat.completions.create.return_value = completion(
    [tool_call("ask_question", {"question": "Where is the leak?", "options": ["Kitchen"]})]
)
with patch.object(services, "get_openai_client", return_value=client):
    result = services.start_diagnose(job.pk)

system_message = client.chat.completions.create.call_args.kwargs["messages"][0]["content"]
self.assertIn("recurring home maintenance service", system_message)
```

See `ai/tests/test_services.py` for the stub helpers (`completion`, `tool_call`).
