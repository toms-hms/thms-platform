"""The GraphQL schema root.

Each app contributes a Query and a Mutation class; they are combined here so
the schema file stays a single, readable index of the whole API surface.
"""

import graphene

from accounts.mutations import AccountsMutation
from accounts.queries import AccountsQuery
from ai.mutations import AiMutation
from ai.queries import AiQuery
from communications.mutations import CommunicationsMutation
from communications.queries import CommunicationsQuery
from contractors.mutations import ContractorsMutation
from contractors.queries import ContractorsQuery
from core.queries import AuditQuery
from homes.mutations import HomesMutation
from homes.queries import HomesQuery
from integrations.mutations import IntegrationsMutation
from integrations.queries import IntegrationsQuery
from jobs.mutations import JobsMutation
from jobs.queries import JobsQuery
from quotes.mutations import QuotesMutation
from quotes.queries import QuotesQuery
from user_contractors.mutations import UserContractorsMutation
from user_contractors.queries import UserContractorsQuery


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
