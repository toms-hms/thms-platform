"""Seeds a development database with demo users, homes, contractors and jobs.

Idempotent: running it twice leaves the same rows rather than duplicating them.
Replaces the Node `db/seed.ts` script.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import User, UserRole
from contractors.models import Contractor, TradeCategory
from core.hashing import hash_password
from homes.models import Home, HomeRole, UserHome
from jobs.models import Job, JobIntent, JobStatus

DEMO_PASSWORD = "password123"

USERS = [
    ("demo@thms.dev", "Demo", "User", UserRole.USER),
    ("nohomes@thms.dev", "No", "Homes", UserRole.USER),
    ("admin@thms.dev", "Admin", "User", UserRole.ADMIN),
]

HOMES = [
    {
        "name": "Main Residence",
        "address1": "123 Maple Street",
        "city": "Austin",
        "state": "TX",
        "zip_code": "78701",
    },
    {
        "name": "Rental Unit",
        "address1": "456 Oak Avenue",
        "address2": "Unit 2B",
        "city": "Austin",
        "state": "TX",
        "zip_code": "78702",
    },
]

CONTRACTORS = [
    ([TradeCategory.PLUMBING], "Mike Torres", "Torres Plumbing", "mike@torresplumbing.com", "5125550101"),
    ([TradeCategory.ELECTRICAL], "Sarah Chen", "Chen Electric", "sarah@chenelectric.com", "5125550102"),
    ([TradeCategory.HVAC], "David Park", "Park Heating & Cooling", "david@parkhvac.com", "5125550103"),
    (
        [TradeCategory.ROOFING],
        "James Williams",
        "Williams Roofing Co.",
        "james@williamsroofing.com",
        "5125550104",
    ),
    ([TradeCategory.PAINTING], "Ana Reyes", "Reyes Painting", "ana@reyespainting.com", "5125550105"),
    ([TradeCategory.LANDSCAPING], "Tom Green", "Green Thumb Landscaping", "tom@greenthumb.com", "5125550106"),
    (
        [TradeCategory.GENERAL_CONTRACTING],
        "Lisa Brown",
        "Brown Build & Renovate",
        "lisa@brownbuild.com",
        "5125550107",
    ),
    ([TradeCategory.CARPENTRY], "Carlos Rivera", "Rivera Woodworks", "carlos@riverawood.com", "5125550108"),
    ([TradeCategory.FLOORING], "Emma Davis", "Davis Floors", "emma@davisfloors.com", "5125550109"),
    (
        [TradeCategory.PEST_CONTROL],
        "Kevin Nguyen",
        "Nguyen Pest Solutions",
        "kevin@nguyenpest.com",
        "5125550110",
    ),
]

JOBS = [
    (
        JobIntent.ISSUE,
        TradeCategory.PLUMBING,
        "Fix kitchen sink leak",
        "Slow drain and dripping faucet under the kitchen sink.",
    ),
    (
        JobIntent.ISSUE,
        TradeCategory.ELECTRICAL,
        "Replace outdoor outlets",
        "Two outdoor GFCI outlets need replacement; one is not functioning.",
    ),
    (
        JobIntent.RECURRING_WORK,
        TradeCategory.HVAC,
        "Annual AC tune-up",
        "Pre-summer inspection and tune-up of central air conditioning unit.",
    ),
    (
        JobIntent.ISSUE,
        TradeCategory.ROOFING,
        "Repair storm-damaged shingles",
        "Several shingles were blown off during the last storm; need inspection and repair.",
    ),
    (
        JobIntent.IMPROVEMENT,
        TradeCategory.PAINTING,
        "Interior living room repaint",
        "Paint living room and hallway — approx 400 sq ft, walls only.",
    ),
    (
        JobIntent.RECURRING_WORK,
        TradeCategory.LANDSCAPING,
        "Spring yard cleanup",
        "Trim hedges, clear flower beds, and aerate the back lawn.",
    ),
    (
        JobIntent.IMPROVEMENT,
        TradeCategory.GENERAL_CONTRACTING,
        "Kitchen cabinet refresh",
        "Replace cabinet doors and hardware in the kitchen.",
    ),
    (
        JobIntent.IMPROVEMENT,
        TradeCategory.CARPENTRY,
        "Build backyard deck",
        "New 12x16 ft cedar deck off the back door.",
    ),
    (
        JobIntent.IMPROVEMENT,
        TradeCategory.FLOORING,
        "Replace master bedroom carpet",
        "Remove old carpet and install hardwood flooring in master bedroom (~200 sq ft).",
    ),
    (
        JobIntent.ISSUE,
        TradeCategory.PEST_CONTROL,
        "Ant and termite inspection",
        "Noticed ant trails along the foundation; need inspection and treatment.",
    ),
]


class Command(BaseCommand):
    """Populates a development database with a usable demo dataset."""

    help = "Seed the development database with demo users, homes, contractors and jobs."

    @transaction.atomic
    def handle(self, *args, **options) -> None:
        """Creates the demo rows, skipping anything that already exists."""
        password_hash = hash_password(DEMO_PASSWORD)
        users = {}
        for email, first_name, last_name, role in USERS:
            users[email], _ = User.objects.get_or_create(
                email=email,
                defaults={
                    "password": password_hash,
                    "first_name": first_name,
                    "last_name": last_name,
                    "role": role,
                },
            )

        demo_user = users["demo@thms.dev"]
        homes = []
        for fields in HOMES:
            home, _ = Home.objects.get_or_create(name=fields["name"], defaults=fields)
            UserHome.objects.get_or_create(user=demo_user, home=home, defaults={"role": HomeRole.OWNER})
            homes.append(home)

        for categories, name, company_name, email, phone in CONTRACTORS:
            Contractor.objects.get_or_create(
                email=email,
                defaults={
                    "name": name,
                    "company_name": company_name,
                    "phone": phone,
                    "categories": categories,
                    "is_global": True,
                },
            )

        for intent, category, title, description in JOBS:
            Job.objects.get_or_create(
                title=title,
                home=homes[0],
                defaults={
                    "intent": intent,
                    "category": category,
                    "description": description,
                    "status": JobStatus.DRAFT,
                    "created_by": demo_user,
                },
            )

        self.stdout.write(self.style.SUCCESS("Seed complete."))
        for email, *_rest, role in USERS:
            self.stdout.write(f"  {email:20} / {DEMO_PASSWORD}  ({role})")
