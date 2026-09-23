"""The AI assistant, with the provider mocked.

No test reaches OpenAI or object storage: `get_openai_client` and the S3 client
are patched, so these assert our orchestration — what we send, what we persist
and how failures are recorded.
"""

import json
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings

from accounts.factories import UserFactory
from ai import services
from ai.factories import AIGenerationFactory, JobImageFactory
from ai.models import AIGeneration, AIGenerationStatus, JobImage, JobImageKind
from contractors.factories import ContractorFactory
from core.errors import BadRequestError
from homes.factories import HomeFactory
from jobs.factories import JobFactory
from jobs.models import Job, JobIntent


def tool_call(name: str, arguments: dict) -> SimpleNamespace:
    """Returns a stub OpenAI tool call carrying the given arguments."""
    return SimpleNamespace(function=SimpleNamespace(name=name, arguments=json.dumps(arguments)))


def completion(tool_calls=None, content=None) -> SimpleNamespace:
    """Returns a stub chat completion with the given tool calls or message content."""
    message = SimpleNamespace(tool_calls=tool_calls, content=content)
    return SimpleNamespace(choices=[SimpleNamespace(message=message)])


@override_settings(OPENAI_API_KEY="test-key")
class StartDiagnoseTests(TestCase):
    """start_diagnose()"""

    def test_returns_the_first_question_and_opens_the_session(self):
        """The opening question is returned and stored as the session's first message."""
        job = JobFactory(intent=JobIntent.ISSUE)
        client = MagicMock()
        client.chat.completions.create.return_value = completion(
            [tool_call("ask_question", {"question": "Where is the leak?", "options": ["Kitchen", "Bath"]})]
        )
        with patch.object(services, "get_openai_client", return_value=client):
            result = services.start_diagnose(job.pk)

        self.assertEqual(result["question"], "Where is the leak?")
        self.assertEqual(result["options"], ["Kitchen", "Bath"])
        self.assertEqual(
            Job.objects.get(pk=job.pk).ai_session["messages"][0]["content"], "Where is the leak?"
        )

    def test_uses_the_prompt_for_the_jobs_intent(self):
        """A recurring-work job is scoped with the recurring-work system prompt."""
        job = JobFactory(intent=JobIntent.RECURRING_WORK)
        client = MagicMock()
        client.chat.completions.create.return_value = completion(
            [tool_call("ask_question", {"question": "How often?", "options": ["Weekly"]})]
        )
        with patch.object(services, "get_openai_client", return_value=client):
            services.start_diagnose(job.pk)

        system_message = client.chat.completions.create.call_args.kwargs["messages"][0]["content"]
        self.assertIn("recurring home maintenance service", system_message)

    def test_requires_an_api_key(self):
        """With no key configured the call is a bad request rather than a crash."""
        job = JobFactory()
        with override_settings(OPENAI_API_KEY=""), self.assertRaises(BadRequestError):
            services.start_diagnose(job.pk)


@override_settings(OPENAI_API_KEY="test-key")
class DiagnoseJobTests(TestCase):
    """diagnose_job()"""

    def test_appends_the_exchange_to_the_transcript(self):
        """The user's answer and the assistant's reply both land in the session."""
        job = JobFactory(
            ai_session={"messages": [{"role": "assistant", "content": "Where?"}], "summary": None}
        )
        client = MagicMock()
        client.chat.completions.create.return_value = completion(
            [tool_call("ask_question", {"question": "Since when?", "options": ["Today"]})]
        )
        with patch.object(services, "get_openai_client", return_value=client):
            result = services.diagnose_job(job.pk, "Under the sink")

        roles = [m["role"] for m in result["messages"]]
        self.assertEqual(roles, ["assistant", "user", "assistant"])
        self.assertEqual(Job.objects.get(pk=job.pk).ai_session["messages"][-1]["content"], "Since when?")

    def test_stores_the_summary_when_the_assistant_produces_one(self):
        """A generated brief is persisted with the job's intent recorded on it."""
        job = JobFactory(intent=JobIntent.ISSUE)
        summary_args = {
            "rootCause": "Worn washer",
            "severity": "moderate",
            "scope": "Replace the washer",
            "priceRange": [100, 250],
            "constraints": [],
        }
        client = MagicMock()
        client.chat.completions.create.return_value = completion(
            [tool_call("generate_summary", summary_args)]
        )
        with patch.object(services, "get_openai_client", return_value=client):
            result = services.diagnose_job(job.pk, "It drips")

        self.assertEqual(result["summary"]["rootCause"], "Worn washer")
        self.assertEqual(result["summary"]["intent"], JobIntent.ISSUE)
        self.assertEqual(Job.objects.get(pk=job.pk).ai_session["summary"]["scope"], "Replace the washer")

    def test_reads_several_tool_calls_from_one_turn(self):
        """The assistant may ask a question and suggest categories in the same turn."""
        job = JobFactory()
        client = MagicMock()
        client.chat.completions.create.return_value = completion(
            [
                tool_call("suggest_categories", {"suggestions": [{"category": "HVAC", "reason": "Ducted"}]}),
                tool_call("ask_question", {"question": "Which room?", "options": ["Attic"]}),
            ]
        )
        with patch.object(services, "get_openai_client", return_value=client):
            result = services.diagnose_job(job.pk, "It is the vents")

        self.assertEqual(result["question"], "Which room?")
        self.assertEqual(result["suggested_categories"], [{"category": "HVAC", "reason": "Ducted"}])


@override_settings(OPENAI_API_KEY="test-key")
class DraftEmailTests(TestCase):
    """draft_email()"""

    def test_returns_one_draft_per_contractor_and_records_each_generation(self):
        """Each contractor gets a draft, and each call is logged as a generation."""
        user = UserFactory()
        job = JobFactory(home=HomeFactory(owner=user), created_by=user)
        first, second = ContractorFactory(), ContractorFactory()
        client = MagicMock()
        client.chat.completions.create.return_value = completion(
            content=json.dumps({"subject": "Quote request", "bodyText": "Hello", "bodyHtml": "<p>Hello</p>"})
        )
        with patch.object(services, "get_openai_client", return_value=client):
            drafts = services.draft_email(
                job_id=job.pk, user_id=user.pk, contractor_ids=[first.pk, second.pk]
            )

        self.assertEqual(len(drafts), 2)
        self.assertEqual(drafts[0]["subject"], "Quote request")
        self.assertEqual(AIGeneration.objects.filter(job_id=job.pk).count(), 2)

    def test_passes_the_requested_tone_to_the_model(self):
        """The caller's tone reaches the system prompt."""
        user = UserFactory()
        job = JobFactory(home=HomeFactory(owner=user), created_by=user)
        contractor = ContractorFactory()
        client = MagicMock()
        client.chat.completions.create.return_value = completion(
            content=json.dumps({"subject": "s", "bodyText": "b", "bodyHtml": "h"})
        )
        with patch.object(services, "get_openai_client", return_value=client):
            services.draft_email(
                job_id=job.pk, user_id=user.pk, contractor_ids=[contractor.pk], tone="friendly"
            )

        system_message = client.chat.completions.create.call_args.kwargs["messages"][0]["content"]
        self.assertIn("friendly tone", system_message)


@override_settings(OPENAI_API_KEY="test-key")
class GenerateImageTests(TestCase):
    """generate_image()"""

    def setUp(self):
        """Creates a job with a source image."""
        self.user = UserFactory()
        self.job = JobFactory(home=HomeFactory(owner=self.user), created_by=self.user)
        self.source = JobImageFactory(job=self.job, uploaded_by=self.user, kind=JobImageKind.SOURCE)

    def test_stores_the_generated_image_and_completes(self):
        """A successful generation writes a GENERATED image and marks itself complete."""
        client = MagicMock()
        client.images.generate.return_value = SimpleNamespace(
            data=[SimpleNamespace(url="https://example.test/generated.png")]
        )
        with (
            patch.object(services, "get_openai_client", return_value=client),
            patch.object(services.uploads, "get_download_url", return_value="https://signed.test/x"),
            patch.object(services.uploads, "put_object") as put_object,
            patch.object(services.requests, "get", return_value=SimpleNamespace(content=b"png-bytes")),
        ):
            generation = services.generate_image(
                job_id=self.job.pk,
                user_id=self.user.pk,
                source_image_id=self.source.pk,
                prompt="Greener yard",
            )

        self.assertEqual(generation.status, AIGenerationStatus.COMPLETED)
        put_object.assert_called_once()
        self.assertTrue(JobImage.objects.filter(job=self.job, kind=JobImageKind.GENERATED).exists())

    def test_marks_the_generation_failed_when_the_provider_errors(self):
        """A provider failure is recorded against the generation and re-raised."""
        client = MagicMock()
        client.images.generate.side_effect = RuntimeError("provider down")
        with (
            patch.object(services, "get_openai_client", return_value=client),
            patch.object(services.uploads, "get_download_url", return_value="https://signed.test/x"),
            self.assertRaises(RuntimeError),
        ):
            services.generate_image(
                job_id=self.job.pk,
                user_id=self.user.pk,
                source_image_id=self.source.pk,
                prompt="Greener yard",
            )

        self.assertEqual(AIGeneration.objects.get(job=self.job).status, AIGenerationStatus.FAILED)

    def test_retry_only_applies_to_failed_generations(self):
        """Retrying a completed generation is refused."""
        generation = AIGenerationFactory(job=self.job, status=AIGenerationStatus.COMPLETED)
        with self.assertRaises(BadRequestError):
            services.retry_generation(generation.pk, self.user.pk)
