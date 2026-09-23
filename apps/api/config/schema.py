"""The GraphQL schema root.

Each app contributes a Query and a Mutation class; they are combined here so
the schema file stays a single, readable index of the whole API surface.
"""

import graphene

from accounts.schema import AccountsMutation, AccountsQuery
from ai.schema import AiMutation, AiQuery
from communications.schema import CommunicationsMutation, CommunicationsQuery
from contractors.schema import ContractorsMutation, ContractorsQuery
from core.audit import AuditQuery
from homes.schema import HomesMutation, HomesQuery
from integrations.schema import IntegrationsMutation, IntegrationsQuery
from jobs.schema import JobsMutation, JobsQuery
from quotes.schema import QuotesMutation, QuotesQuery
from user_contractors.schema import UserContractorsMutation, UserContractorsQuery


class Query(
    AccountsQuery,
    HomesQuery,
    ContractorsQuery,
    UserContractorsQuery,
    JobsQuery,
    QuotesQuery,
    CommunicationsQuery,
    AiQuery,
    IntegrationsQuery,
    AuditQuery,
    graphene.ObjectType,
):
    """Every read operation the API exposes."""


class Mutation(
    AccountsMutation,
    HomesMutation,
    ContractorsMutation,
    UserContractorsMutation,
    JobsMutation,
    QuotesMutation,
    CommunicationsMutation,
    AiMutation,
    IntegrationsMutation,
    graphene.ObjectType,
):
    """Every write operation the API exposes."""


schema = graphene.Schema(query=Query, mutation=Mutation)
