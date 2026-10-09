"""OpenAI client. The only module that imports the openai SDK.

No business logic: callers choose the model, build the messages and interpret
the reply.
"""

from typing import Any

import requests
from django.conf import settings
from openai import OpenAI

from core.errors import BadRequestError


class OpenAIClient:
    """Chat completions and image generation against the OpenAI API."""

    def __init__(self, *, api_key: str | None = None) -> None:
        self.api_key = api_key or settings.OPENAI_API_KEY
        self._sdk: OpenAI | None = None

    @property
    def sdk(self) -> OpenAI:
        """Returns the OpenAI SDK client, creating it on first use. Raises when no key is configured."""
        if self._sdk is None:
            if not self.api_key:
                raise BadRequestError("OpenAI API key not configured")
            self._sdk = OpenAI(api_key=self.api_key)
        return self._sdk

    def chat(
        self,
        *,
        model: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        tool_choice: str | None = None,
        response_format: dict[str, Any] | None = None,
    ) -> Any:
        """Returns the first choice's message from a chat completion."""
        options: dict[str, Any] = {}
        if tools is not None:
            options["tools"] = tools
        if tool_choice is not None:
            options["tool_choice"] = tool_choice
        if response_format is not None:
            options["response_format"] = response_format
        response = self.sdk.chat.completions.create(model=model, messages=messages, **options)
        return response.choices[0].message

    def generate_image(
        self, *, model: str, prompt: str, size: str = "1024x1024", quality: str = "standard"
    ) -> bytes:
        """Returns the bytes of one generated image. Raises BadRequestError when no image comes back."""
        response = self.sdk.images.generate(model=model, prompt=prompt, n=1, size=size, quality=quality)
        image_url = response.data[0].url if response.data else None
        if not image_url:
            raise BadRequestError("No image URL returned from OpenAI")
        return requests.get(image_url, timeout=60).content
