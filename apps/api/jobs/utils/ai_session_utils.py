"""Shaping the ai_session payload stored on a job."""

from typing import Any


def build_ai_session(
    *, ai_session: dict[str, Any] | None, confirmed_categories: list[str] | None
) -> dict[str, Any] | None:
    """Returns the ai_session to persist, or None when there is neither a session nor confirmed categories."""
    if not ai_session and not confirmed_categories:
        return None
    session = ai_session or {}
    return {
        "messages": session.get("messages") or [],
        "summary": session.get("summary"),
        "categorySuggestions": session.get("categorySuggestions"),
        "confirmedCategories": confirmed_categories,
    }
