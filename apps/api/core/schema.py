"""GraphQL surface for the audit log.

django-auditlog records every create, update and delete on the registered
domain models. The log is admin-only: it names who changed what, and when.
"""

import graphene
from auditlog.models import LogEntry
from django.db.models import Q

from core.graphql import admin_required
from core.types import ACTIONS, AuditLogEntryType


class AuditQuery(graphene.ObjectType):
    """Audit log reads. Admin only."""

    audit_log = graphene.List(
        graphene.NonNull(AuditLogEntryType),
        object_types=graphene.List(graphene.NonNull(graphene.String)),
        object_ids=graphene.List(graphene.NonNull(graphene.String)),
        actor_ids=graphene.List(graphene.NonNull(graphene.ID)),
        limit=graphene.Int(),
        required=True,
    )

    @admin_required
    def resolve_audit_log(self, info, object_types=None, object_ids=None, actor_ids=None, limit=None):
        """Returns audit entries, most recent first, narrowed by object types, objects or actors."""
        entries = LogEntry.objects.select_related("content_type", "actor").order_by("-timestamp")
        if object_types is not None:
            entries = entries.filter(content_type__model__in=[t.lower() for t in object_types])
        if object_ids is not None:
            numeric = [int(i) for i in object_ids if str(i).isdigit()]
            entries = entries.filter(Q(object_pk__in=object_ids) | Q(object_id__in=numeric))
        if actor_ids is not None:
            entries = entries.filter(actor_id__in=actor_ids)
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
