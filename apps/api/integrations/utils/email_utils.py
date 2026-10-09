"""Building outbound email messages."""

import base64


def build_raw_message(*, to: str, subject: str, body_text: str, body_html: str | None = None) -> str:
    """Returns a base64url-encoded RFC 2822 HTML message, as the Gmail send API expects."""
    message = "\r\n".join(
        [
            f"To: {to}",
            f"Subject: {subject}",
            "MIME-Version: 1.0",
            "Content-Type: text/html; charset=utf-8",
            "",
            body_html or body_text,
        ]
    )
    return base64.urlsafe_b64encode(message.encode()).decode()
