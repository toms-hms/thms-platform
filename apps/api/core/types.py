"""GraphQL types for the audit log."""

import graphene
from auditlog.models import LogEntry

ACTIONS = {
    LogEntry.Action.CREATE: "CREATE",
    LogEntry.Action.UPDATE: "UPDATE",
    LogEntry.Action.DELETE: "DELETE",
}


class AuditLogEntryType(graphene.ObjectType):
    """One recorded change to a domain object."""

    id = graphene.ID(required=True)
    action = graphene.String(required=True)
    object_type = graphene.String(required=True, description="Model name, e.g. 'job'.")
    object_id = graphene.String(required=True)
    object_repr = graphene.String(required=True)
    actor_id = graphene.ID(description="The user who made the change, when one was authenticated.")
    actor_email = graphene.String()
    changes = graphene.JSONString(required=True, description="Field-level before/after values.")
    remote_addr = graphene.String()
    timestamp = graphene.DateTime(required=True)
