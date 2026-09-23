"""System prompts and tool definitions for the diagnostic assistant.

The assistant's job is to turn a homeowner's rough description into a brief a
contractor can quote from without a site visit. It always asks its next question
through `ask_question`, and produces the brief through `generate_summary` once it
has enough context. The summary's shape depends on the job's intent.
"""

from typing import Any

from jobs.models import JobIntent

SYSTEM_PROMPTS: dict[str, str] = {
    JobIntent.ISSUE: (
        "You are helping a homeowner describe a home problem so contractors can quote accurately "
        "without a site visit.\n"
        "Ask focused questions with suggested options. Cover: what is broken, when it started, urgency, "
        "and contractor context.\n"
        "Always call ask_question for your next question. After 2-4 exchanges call generate_summary.\n"
        "If the answers reveal the selected trade categories are wrong or incomplete, also call "
        "suggest_categories — but only if genuinely needed."
    ),
    JobIntent.IMPROVEMENT: (
        "You are helping a homeowner scope a home improvement project so contractors can submit "
        "comparable bids.\n"
        "Ask focused questions with suggested options. Cover: desired outcome, budget range, timeline, "
        "constraints.\n"
        "Always call ask_question for your next question. After 2-4 exchanges call generate_summary.\n"
        "If the answers reveal the selected trade categories are wrong or incomplete, also call "
        "suggest_categories — but only if genuinely needed."
    ),
    JobIntent.RECURRING_WORK: (
        "You are helping a homeowner define a recurring home maintenance service so contractors can bid "
        "a repeating contract.\n"
        "Ask focused questions with suggested options. Cover: tasks, frequency, access and timing "
        "constraints.\n"
        "Always call ask_question for your next question. After 2-4 exchanges call generate_summary.\n"
        "If the answers reveal the selected trade categories are wrong or incomplete, also call "
        "suggest_categories — but only if genuinely needed."
    ),
}

ASK_QUESTION_TOOL: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "ask_question",
        "description": "Ask the homeowner the next clarifying question with suggested answer options.",
        "parameters": {
            "type": "object",
            "properties": {
                "question": {"type": "string", "description": "The question to ask."},
                "options": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "3-4 suggested answers the homeowner can pick or ignore.",
                },
            },
            "required": ["question", "options"],
        },
    },
}

SUGGEST_CATEGORIES_TOOL: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "suggest_categories",
        "description": (
            "Call this only if the answers reveal the initially selected trade categories are wrong or "
            "incomplete. Suggest the correct categories with a reason for each."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "suggestions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "category": {
                                "type": "string",
                                "description": "TradeCategory enum value e.g. PLUMBING, HVAC.",
                            },
                            "reason": {
                                "type": "string",
                                "description": "One sentence explaining why this category is needed.",
                            },
                        },
                        "required": ["category", "reason"],
                    },
                }
            },
            "required": ["suggestions"],
        },
    },
}

SUMMARY_TOOLS: dict[str, dict[str, Any]] = {
    JobIntent.ISSUE: {
        "type": "function",
        "function": {
            "name": "generate_summary",
            "description": "Generate a contractor-ready brief once you have enough context.",
            "parameters": {
                "type": "object",
                "properties": {
                    "rootCause": {
                        "type": "string",
                        "description": "What is broken or wrong, in plain language.",
                    },
                    "severity": {
                        "type": "string",
                        "description": 'How urgent — e.g. "urgent", "moderate", "low".',
                    },
                    "scope": {"type": "string", "description": "Full contractor-ready brief."},
                    "priceRange": {
                        "type": "array",
                        "items": {"type": "number"},
                        "minItems": 2,
                        "maxItems": 2,
                    },
                    "constraints": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["rootCause", "severity", "scope", "priceRange", "constraints"],
            },
        },
    },
    JobIntent.IMPROVEMENT: {
        "type": "function",
        "function": {
            "name": "generate_summary",
            "description": "Generate a contractor-ready scope of work once you have enough context.",
            "parameters": {
                "type": "object",
                "properties": {
                    "scope": {"type": "string", "description": "Full scope of work."},
                    "priceRange": {
                        "type": "array",
                        "items": {"type": "number"},
                        "minItems": 2,
                        "maxItems": 2,
                    },
                    "constraints": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["scope", "priceRange", "constraints"],
            },
        },
    },
    JobIntent.RECURRING_WORK: {
        "type": "function",
        "function": {
            "name": "generate_summary",
            "description": "Generate a recurring service specification once you have enough context.",
            "parameters": {
                "type": "object",
                "properties": {
                    "frequency": {"type": "string", "description": 'How often — e.g. "weekly", "quarterly".'},
                    "scope": {"type": "string", "description": "Full service spec."},
                    "priceRange": {
                        "type": "array",
                        "items": {"type": "number"},
                        "minItems": 2,
                        "maxItems": 2,
                    },
                    "constraints": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["frequency", "scope", "priceRange"],
            },
        },
    },
}

EMAIL_SYSTEM_PROMPT = (
    "You are helping a homeowner write a professional outreach email to a contractor for a home "
    "improvement project. Write in a {tone} tone. Be concise and specific."
)

DIAGNOSE_MODEL = "gpt-4o"
EMAIL_MODEL = "gpt-4o-mini"
IMAGE_MODEL = "dall-e-3"
