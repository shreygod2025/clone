"""One-off script to dispatch a live task-assignment notification email
to shreyaan@oll.co via the same code path used by tasks.py.

Run with:  python /app/backend/tests/send_test_task_email.py
"""
import asyncio
import logging
import os
import sys

# Route the module's own [task-email] logs to stdout so we can see the
# Resend status inline when running standalone.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    stream=sys.stdout,
)

# Ensure /app/backend is importable when running standalone.
sys.path.insert(0, "/app/backend")

from routes.inapp_notifications import _send_task_email, _get_resend_key  # noqa: E402


async def main():
    to_email = "shreyaan@oll.co"
    to_name = "Shreyaan"
    subject = "[TEST] New task assigned: Verify email notification pipeline"
    heading = "New task assigned to you"
    body = (
        "This is a live verification that the task-assignment email "
        "pipeline (Resend + create_notification) is working end-to-end. "
        "You were assigned as the owner of the task <strong>Verify email notification pipeline</strong>. "
        "Due date: today. Priority: high."
    )
    cta_label = "Open Task"
    cta_url = f"{os.environ.get('FRONTEND_URL', 'https://oll.co').rstrip('/')}/admin/tasks"

    key = await _get_resend_key()
    print(f"[test] resend key present: {bool(key)} (len={len(key) if key else 0})")
    print(f"[test] dispatching test task email -> {to_email}")

    await _send_task_email(
        to_email=to_email,
        to_name=to_name,
        subject=subject,
        heading=heading,
        body=body,
        cta_label=cta_label,
        cta_url=cta_url,
    )
    # _send_task_email is fire-and-forget internally, but we invoked it
    # directly (awaited) so the Resend HTTP round-trip is complete here.
    print("[test] done (see backend logs for [task-email] status).")


if __name__ == "__main__":
    asyncio.run(main())
