"""GraphQL surface for the audit log.

django-auditlog records every create, update and delete on the registered
domain models. The log is admin-only: it names who changed what, and when.
"""

import graphene
from auditlog.models import LogEntry

from core.graphql import admin_required
from core.types import ACTIONS, AuditLogEntryType


class AuditQuery(graphene.ObjectType):
    """Audit log reads. Admin only."""

    audit_log = graphene.List(
        graphene.NonNull(AuditLogEntryType),
        object_type=graphene.String(),
        object_id=graphene.String(),
        actor_id=graphene.ID(),
        limit=graphene.Int(),
        required=True,
    )

    @admin_required
    def resolve_audit_log(self, info, object_type=None, object_id=None, actor_id=None, limit=None):
        """Returns audit entries, most recent first, narrowed by object or actor."""
        entries = LogEntry.objects.select_related("content_type", "actor").order_by("-timestamp")
        if object_type:
            entries = entries.filter(content_type__model=object_type.lower())
        if object_id:
            entries = (
                entries.filter(object_id=object_id)
                if str(object_id).isdigit()
                else entries.filter(object_pk=object_id)
            )
        if actor_id:
            entries = entries.filter(actor_id=actor_id)
        return [
            AuditLogEntryType(
                id=entry.pk,
                action=ACTIONS.get(entry.action, "UNKNOWN"),
                object_type=entry.content_type.model if entry.content_type else "",
                object_id=entry.object_pk,
                object_repr=entry.object_repr,
                actor_id=entry.actor_id,
                actor_email=entry.actor.email if entry.actor else None,
                changes=entry.changes,
                remote_addr=str(entry.remote_addr) if entry.remote_addr else None,
                timestamp=entry.timestamp,
            )
            for entry in entries[: min(limit or 100, 500)]
        ]
