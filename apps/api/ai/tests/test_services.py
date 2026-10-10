"""The AI services, with the OpenAI client and storage replaced by fakes.

Each service takes its clients in the constructor, so these tests pass fakes
instead of patching module paths. They assert our orchestration — what we send,
what we persist and how failures are recorded.
"""

import json
from types import SimpleNamespace
from unittest.mock import MagicMock

from django.test import TestCase, override_settings

from accounts.factories import UserFactory
from ai.clients.openai_client import OpenAIClient
from ai.factories import AIGenerationFactory, JobImageFactory
from ai.models import AIGeneration, AIGenerationStatus, JobImage, JobImageKind
from ai.services.diagnose_service import DiagnoseService
from ai.services.email_draft_service import EmailDraftService
from ai.services.image_generation_service import ImageGenerationService
from contractors.factories import ContractorFactory
from core.errors import BadRequestError
from core.services.storage_service import StorageService
from homes.factories import HomeFactory
from jobs.factories import JobFactory
from jobs.models import Job, JobIntent


def tool_call(name: str, arguments: dict) -> SimpleNamespace:
    """Returns a stub tool call carrying the given arguments."""
    return SimpleNamespace(function=SimpleNamespace(name=name, arguments=json.dumps(arguments)))


def fake_openai(*, tool_calls=None, content=None) -> MagicMock:
    """Returns a fake OpenAIClient whose chat() replies with the given tool calls or content."""
    openai = MagicMock(spec=OpenAIClient)
    openai.chat.return_value = SimpleNamespace(tool_calls=tool_calls, content=content)
    return openai


def fake_storage() -> MagicMock:
    """Returns a fake StorageService with deterministic keys and URLs."""
    storage = MagicMock(spec=StorageService)
    storage.job_file_key.return_value = "jobs/j/generated/fixed.png"
    storage.download_url.return_value = "https://signed.test/x"
    return storage


class DiagnoseStartTests(TestCase):
    """DiagnoseService.start()"""

    def test_returns_the_first_question_and_opens_the_session(self):
        """The opening question is returned and stored as the session's first message."""
        job = JobFactory(intent=JobIntent.ISSUE)
        openai = fake_openai(
            tool_calls=[
                tool_call("ask_question", {"question": "Where is the leak?", "options": ["Kitchen", "Bath"]})
            ]
        )
        result = DiagnoseService(openai=openai).start(job_id=job.pk)

        self.assertEqual(result["question"], "Where is the leak?")
        self.assertEqual(result["options"], ["Kitchen", "Bath"])
        self.assertEqual(
            Job.objects.get(pk=job.pk).ai_session["messages"][0]["content"], "Where is the leak?"
        )

    def test_uses_the_prompt_for_the_jobs_intent(self):
        """A recurring-work job is scoped with the recurring-work system prompt."""
        job = JobFactory(intent=JobIntent.RECURRING_WORK)
        openai = fake_openai(
            tool_calls=[tool_call("ask_question", {"question": "How often?", "options": ["Weekly"]})]
        )
        DiagnoseService(openai=openai).start(job_id=job.pk)

        system_message = openai.chat.call_args.kwargs["messages"][0]["content"]
        self.assertIn("recurring home maintenance service", system_message)

    def test_requires_an_api_key(self):
        """With no key configured the real client refuses with a bad request rather than a crash."""
        job = JobFactory()
        with override_settings(OPENAI_API_KEY=""), self.assertRaises(BadRequestError):
            DiagnoseService().start(job_id=job.pk)


class DiagnoseAnswerTests(TestCase):
    """DiagnoseService.answer()"""

    def test_appends_the_exchange_to_the_transcript(self):
        """The user's answer and the assistant's reply both land in the session."""
        job = JobFactory(
            ai_session={"messages": [{"role": "assistant", "content": "Where?"}], "summary": None}
        )
        openai = fake_openai(
            tool_calls=[tool_call("ask_question", {"question": "Since when?", "options": ["Today"]})]
        )
        result = DiagnoseService(openai=openai).answer(job_id=job.pk, message="Under the sink")

        self.assertEqual([m["role"] for m in result["messages"]], ["assistant", "user", "assistant"])
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
        openai = fake_openai(tool_calls=[tool_call("generate_summary", summary_args)])
        result = DiagnoseService(openai=openai).answer(job_id=job.pk, message="It drips")

        self.assertEqual(result["summary"]["rootCause"], "Worn washer")
        self.assertEqual(result["summary"]["intent"], JobIntent.ISSUE)
        self.assertEqual(Job.objects.get(pk=job.pk).ai_session["summary"]["scope"], "Replace the washer")

    def test_reads_several_tool_calls_from_one_turn(self):
        """The assistant may ask a question and suggest categories in the same turn."""
        job = JobFactory()
        openai = fake_openai(
            tool_calls=[
                tool_call("suggest_categories", {"suggestions": [{"category": "HVAC", "reason": "Ducted"}]}),
                tool_call("ask_question", {"question": "Which room?", "options": ["Attic"]}),
            ]
        )
        result = DiagnoseService(openai=openai).answer(job_id=job.pk, message="It is the vents")

        self.assertEqual(result["question"], "Which room?")
        self.assertEqual(result["suggested_categories"], [{"category": "HVAC", "reason": "Ducted"}])


class EmailDraftTests(TestCase):
    """EmailDraftService.draft()"""

    def setUp(self):
        """Creates a user with a job on their home."""
        self.user = UserFactory()
        self.job = JobFactory(home=HomeFactory(owner=self.user), created_by=self.user)

    def test_returns_one_draft_per_contractor_and_records_each_generation(self):
        """Each contractor gets a draft, and each call is logged as a generation."""
        first, second = ContractorFactory(), ContractorFactory()
        openai = fake_openai(
            content=json.dumps({"subject": "Quote request", "bodyText": "Hello", "bodyHtml": "<p>Hello</p>"})
        )
        drafts = EmailDraftService(openai=openai).draft(
            job_id=self.job.pk, user_id=self.user.pk, contractor_ids=[first.pk, second.pk]
        )

        self.assertEqual(len(drafts), 2)
        self.assertEqual(drafts[0]["subject"], "Quote request")
        self.assertEqual(AIGeneration.objects.filter(job_id=self.job.pk).count(), 2)

    def test_passes_the_requested_tone_to_the_model(self):
        """The caller's tone reaches the system prompt."""
        openai = fake_openai(content=json.dumps({"subject": "s", "bodyText": "b", "bodyHtml": "h"}))
        EmailDraftService(openai=openai).draft(
            job_id=self.job.pk, user_id=self.user.pk, contractor_ids=[ContractorFactory().pk], tone="friendly"
        )

        system_message = openai.chat.call_args.kwargs["messages"][0]["content"]
        self.assertIn("friendly tone", system_message)


class ImageGenerationTests(TestCase):
    """ImageGenerationService.generate() and retry()"""

    def setUp(self):
        """Creates a job with a source image."""
        self.user = UserFactory()
        self.job = JobFactory(home=HomeFactory(owner=self.user), created_by=self.user)
        self.source = JobImageFactory(job=self.job, uploaded_by=self.user, kind=JobImageKind.SOURCE)

    def test_stores_the_generated_image_and_completes(self):
        """A successful generation writes a GENERATED image and marks itself complete."""
        openai = MagicMock(spec=OpenAIClient)
        openai.generate_image.return_value = b"png-bytes"
        storage = fake_storage()
        generation = ImageGenerationService(openai=openai, storage=storage).generate(
            job_id=self.job.pk, user_id=self.user.pk, source_image_id=self.source.pk, prompt="Greener yard"
        )

        self.assertEqual(generation.status, AIGenerationStatus.COMPLETED)
        storage.put.assert_called_once_with(
            key="jobs/j/generated/fixed.png", body=b"png-bytes", content_type="image/png"
        )
        self.assertTrue(JobImage.objects.filter(job=self.job, kind=JobImageKind.GENERATED).exists())

    def test_marks_the_generation_failed_when_the_provider_errors(self):
        """A provider failure is recorded against the generation and re-raised."""
        openai = MagicMock(spec=OpenAIClient)
        openai.generate_image.side_effect = RuntimeError("provider down")
        with self.assertRaises(RuntimeError):
            ImageGenerationService(openai=openai, storage=fake_storage()).generate(
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
            ImageGenerationService(openai=MagicMock(spec=OpenAIClient), storage=fake_storage()).retry(
                generation_id=generation.pk, user_id=self.user.pk
            )
