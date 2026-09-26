"""Regression test for the "Support Center · No. of tickets resolved" KPI.

Bug (2026-02): Kirti (Customer Support) resolved more tickets than the number
shown in Performance for the month. Root cause was that
`_compute_support_metrics` filtered resolved tickets by `created_at` in the
selected month — so a ticket created in Jan and resolved in Feb was excluded
from Feb's resolved count.

Fix: switched the resolved query to use `resolved_at` (fallback `updated_at`
for pre-`resolved_at` rows) within the range, matching `daily_report.py`.

This test uses an in-memory mongomock-style stub to avoid depending on a
running MongoDB. If mongomock isn't available, the test is skipped.
"""
import pytest


@pytest.mark.asyncio
async def test_resolved_tickets_use_resolved_at_not_created_at(monkeypatch):
    mongomock_motor = pytest.importorskip("mongomock_motor")
    client = mongomock_motor.AsyncMongoMockClient()
    fake_db = client["testdb"]

    # Patch the `db` handle inside kpis.py before importing the metric fn.
    from routes import kpis as kpis_mod  # noqa: WPS433
    monkeypatch.setattr(kpis_mod, "db", fake_db)

    uid = "user-kirti"
    coll = fake_db.support_queries

    # Ticket 1 — created Jan, resolved Feb (must count for Feb)
    await coll.insert_one({
        "assigned_to": uid,
        "status": "resolved",
        "created_at":  "2026-01-15T10:00:00+00:00",
        "resolved_at": "2026-02-05T12:00:00+00:00",
        "updated_at":  "2026-02-05T12:00:00+00:00",
    })
    # Ticket 2 — created + resolved in Feb
    await coll.insert_one({
        "assigned_to": uid,
        "status": "closed",
        "created_at":  "2026-02-10T09:00:00+00:00",
        "resolved_at": "2026-02-11T09:00:00+00:00",
        "updated_at":  "2026-02-11T09:00:00+00:00",
    })
    # Ticket 3 — legacy row without `resolved_at`, updated_at = Feb
    await coll.insert_one({
        "assigned_to": uid,
        "status": "resolved",
        "created_at":  "2025-12-20T09:00:00+00:00",
        "updated_at":  "2026-02-12T09:00:00+00:00",
    })
    # Ticket 4 — created in Feb but resolved in March (must NOT count for Feb)
    await coll.insert_one({
        "assigned_to": uid,
        "status": "resolved",
        "created_at":  "2026-02-25T09:00:00+00:00",
        "resolved_at": "2026-03-05T09:00:00+00:00",
        "updated_at":  "2026-03-05T09:00:00+00:00",
    })
    # Ticket 5 — belongs to a different user (must NOT count)
    await coll.insert_one({
        "assigned_to": "someone-else",
        "status": "resolved",
        "created_at":  "2026-02-01T09:00:00+00:00",
        "resolved_at": "2026-02-10T09:00:00+00:00",
        "updated_at":  "2026-02-10T09:00:00+00:00",
    })

    feb_start = "2026-02-01T00:00:00+00:00"
    feb_end   = "2026-02-28T23:59:59.999999+00:00"
    metrics = await kpis_mod._compute_support_metrics(uid, feb_start, feb_end)

    # Only tickets 1, 2 and 3 should count → 3
    assert metrics["support_tickets_resolved"] == 3, metrics
    # `assigned` is still keyed on `created_at` in-range → tickets 2 and 4
    assert metrics["support_tickets_assigned"] == 2, metrics
