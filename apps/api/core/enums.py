"""GraphQL enums mirroring the model-level TextChoices.

Inputs are typed with these so an invalid value is rejected by the schema rather
than by a service. Output fields stay plain strings (`convert_choices_to_enum`
is off on every type) so clients keep comparing against the same literals the
REST API returned.
"""

import graphene

from accounts.models import UserRole
from ai.models import AIGenerationStatus
from communications.models import CommunicationDirection
from contractors.models import TradeCategory
from homes.models import HomeRole
from jobs.models import JobContractorStatus, JobIntent, JobStatus
from quotes.models import QuoteStatus

TradeCategoryEnum = graphene.Enum.from_enum(TradeCategory)
JobIntentEnum = graphene.Enum.from_enum(JobIntent)
JobStatusEnum = graphene.Enum.from_enum(JobStatus)
JobContractorStatusEnum = graphene.Enum.from_enum(JobContractorStatus)
QuoteStatusEnum = graphene.Enum.from_enum(QuoteStatus)
CommunicationDirectionEnum = graphene.Enum.from_enum(CommunicationDirection)
HomeRoleEnum = graphene.Enum.from_enum(HomeRole)
UserRoleEnum = graphene.Enum.from_enum(UserRole)
AIGenerationStatusEnum = graphene.Enum.from_enum(AIGenerationStatus)
