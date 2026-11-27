"""
Database module — single Motor client shared across the entire application.
Provides db, client, get_database, get_db, and MongoDB-backed OTP tokens.
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import AutoReconnect
from datetime import datetime, timezone, timedelta
from config import MONGO_URL, DB_NAME, OTP_EXPIRE_MINUTES, OTP_MAX_ATTEMPTS, OTP_LOCKOUT_MINUTES, OTP_SEND_COOLDOWN_SECONDS

# ── MongoDB Canonical Client ─────────────────────────────────────────────────
# Use explicit timeouts so the client never hangs indefinitely on
# slow / remote Atlas connections (important for production Kubernetes health checks).
client = AsyncIOMotorClient(
    MONGO_URL,
    serverSelectionTimeoutMS=30000,   # 30 s to find a suitable server under network latency
    connectTimeoutMS=20000,            # 20 s to establish a TCP/TLS connection
    socketTimeoutMS=45000,            # 45 s for individual socket operations
    waitQueueTimeoutMS=10000,          # 10 s to wait for connection from pool
    minPoolSize=2,                     # start with 2 warm connections to avoid TLS handshake stampede
    maxPoolSize=100,                  # allow high concurrency under dashboard loads
    maxIdleTimeMS=60000,              # recycle idle connections after 60s
    retryWrites=True,
    retryReads=True,
)
_client = client
raw_db = client[DB_NAME]

# ── Canonical 35 Collections Mapping for olladmin_new ─────────────────────────
COLLECTION_MAPPING = {
    # 1. users
    "admins": ("users", {"_source_collection": "admins"}, {"user_type": "admin"}),
    "team_users": ("users", {"_source_collection": "team_users"}, {"user_type": "team_user"}),
    
    # 4. auth_tokens
    "otp_tokens": ("auth_tokens", {"_source_collection": "otp_tokens"}, {"token_type": "phone_otp"}),
    "oauth_states": ("auth_tokens", {"_source_collection": "oauth_states"}, {"token_type": "oauth_state"}),
    "techfest_portal_otps": ("auth_tokens", {"_source_collection": "techfest_portal_otps"}, {"token_type": "techfest_otp"}),
    
    # 5. schools
    "school_onboarding": ("schools", {"_source_collection": "school_onboarding"}, {"record_type": "onboarding_state"}),
    
    # 8. educators
    "educator_applications": ("educators", {"_source_collection": "educator_applications"}, {"record_type": "application"}),
    "educator_onboarding": ("educators", {"_source_collection": "educator_onboarding"}, {"record_type": "onboarding"}),
    "educator_interviews": ("educators", {"_source_collection": "educator_interviews"}, {"record_type": "interview"}),
    
    # 9. partners
    "growth_partners": ("partners", {"_source_collection": "growth_partners"}, {"partner_type": "growth_partner"}),
    "gp_onboarding": ("partners", {"_source_collection": "gp_onboarding"}, {"partner_type": "gp_onboarding"}),
    "simple_partners": ("partners", {"_source_collection": "simple_partners"}, {"partner_type": "simple_partner"}),
    "franchise_leads": ("partners", {"_source_collection": "franchise_leads"}, {"partner_type": "franchise_lead"}),
    "franchise_crm_activities": ("partners", {"_source_collection": "franchise_crm_activities"}, {"partner_type": "franchise_crm_activity"}),

    
    # 10. future_skills_students
    "future_skills_leads": ("future_skills_students", {"_source_collection": "future_skills_leads"}, {"funnel_stage": "lead"}),
    "future_skills_trials": ("future_skills_students", {"_source_collection": "future_skills_trials"}, {"funnel_stage": "trial"}),
    "future_skills_subscriptions": ("future_skills_students", {"_source_collection": "future_skills_subscriptions"}, {"funnel_stage": "subscription"}),
    "future_skills_booking_intents": ("future_skills_students", {"_source_collection": "future_skills_booking_intents"}, {"funnel_stage": "booking_intent"}),
    "future_skills_batch_requests": ("future_skills_students", {"_source_collection": "future_skills_batch_requests"}, {"funnel_stage": "batch_request"}),
    
    # 11. future_skills_batches
    "batches": ("future_skills_batches", {"_source_collection": "batches"}, {"record_type": "general_batch"}),
    "centers": ("future_skills_batches", {"_source_collection": "centers"}, {"record_type": "center"}),
    
    # 12. payments
    "school_student_payments": ("payments", {"_source_collection": "school_student_payments"}, {"payment_category": "school_student"}),
    "orders": ("payments", {"_source_collection": "orders"}, {"payment_category": "legacy_order"}),
    "custom_payment_links": ("payments", {"_source_collection": "custom_payment_links"}, {"payment_category": "payment_link"}),
    "student_payments": ("payments", {"_source_collection": "student_payments"}, {"payment_category": "student"}),
    "school_payments": ("payments", {"_source_collection": "school_payments"}, {"payment_category": "school"}),
    
    # 13. invoices
    "custom_invoices": ("invoices", {"_source_collection": "custom_invoices"}, {"invoice_type": "custom"}),
    "custom_invoice_audit_logs": ("invoices", {"_source_collection": "custom_invoice_audit_logs"}, {"invoice_type": "audit_log"}),
    
    # 14. shop_orders
    "shop_purchase_orders": ("shop_orders", {"_source_collection": "shop_purchase_orders"}, {"order_type": "purchase_order"}),
    
    # 16. techfest_registrations
    "techfest_student_registrations": ("techfest_registrations", {"_source_collection": "techfest_student_registrations"}, {"reg_type": "student"}),
    
    # 18. event_registrations
    "summer_camp_bookings": ("event_registrations", {"_source_collection": "summer_camp_bookings"}, {"event_type": "summer_camp"}),
    "ai_foundations_bookings": ("event_registrations", {"_source_collection": "ai_foundations_bookings"}, {"event_type": "ai_foundations"}),
    "workshop_bookings": ("event_registrations", {"_source_collection": "workshop_bookings"}, {"event_type": "workshop"}),
    "social_media_intern_registrations": ("event_registrations", {"_source_collection": "social_media_intern_registrations"}, {"event_type": "intern_registration"}),
    "friendship_day_registrations": ("event_registrations", {"_source_collection": "friendship_day_registrations"}, {"event_type": "friendship_day"}),
    
    # 19. marketing_campaigns
    "future_skills_source_links": ("marketing_campaigns", {"_source_collection": "future_skills_source_links"}, {"campaign_type": "future_skills"}),
    "summer_camp_tracking_links": ("marketing_campaigns", {"_source_collection": "summer_camp_tracking_links"}, {"campaign_type": "summer_camp_tracking"}),
    "summer_camp_broadcasts": ("marketing_campaigns", {"_source_collection": "summer_camp_broadcasts"}, {"campaign_type": "summer_camp_broadcast"}),
    "techfest_referrers": ("marketing_campaigns", {"_source_collection": "techfest_referrers"}, {"campaign_type": "techfest_referrer"}),
    "techfest_bulk_campaigns": ("marketing_campaigns", {"_source_collection": "techfest_bulk_campaigns"}, {"campaign_type": "techfest_bulk"}),
    "techfest_mail_jobs": ("marketing_campaigns", {"_source_collection": "techfest_mail_jobs"}, {"campaign_type": "techfest_mail_job"}),
    "public_report_links": ("marketing_campaigns", {"_source_collection": "public_report_links"}, {"campaign_type": "public_report"}),
    
    # 20. support_tickets
    "support_queries": ("support_tickets", {"_source_collection": "support_queries"}, {"ticket_source": "support_query"}),
    "inquiry_queries": ("support_tickets", {"_source_collection": "inquiry_queries"}, {"ticket_source": "inquiry_query"}),
    
    # 21. faq_chat_logs
    "faq_chat_rate": ("faq_chat_logs", {"_source_collection": "faq_chat_rate"}, {"log_type": "chat_rating"}),
    "ai_chat_sessions": ("faq_chat_logs", {"_source_collection": "ai_chat_sessions"}, {"log_type": "chat_session"}),
    
    # 22. tasks
    "task_comments": ("tasks", {"_source_collection": "task_comments"}, {"task_item_type": "comment"}),
    "milestones": ("tasks", {"_source_collection": "milestones"}, {"task_item_type": "milestone"}),
    
    # 23. expenses
    "school_expenses": ("expenses", {"_source_collection": "school_expenses"}, {"expense_category": "school"}),
    
    # 25. telecalling_contacts
    "telecalling_batches": ("telecalling_contacts", {"_source_collection": "telecalling_batches"}, {"record_type": "batch"}),
    
    # 27. content
    "blogs": ("content", {"_source_collection": "blogs"}, {"content_type": "blog"}),
    "faqs": ("content", {"_source_collection": "faqs"}, {"content_type": "faq"}),
    "faq_canonical_answers": ("content", {"_source_collection": "faq_canonical_answers"}, {"content_type": "faq_canonical"}),
    "success_stories": ("content", {"_source_collection": "success_stories"}, {"content_type": "success_story"}),
    
    # 28. requirements
    "open_requirements": ("requirements", {"_source_collection": "open_requirements"}, {"requirement_scope": "open"}),
    "team_requirements": ("requirements", {"_source_collection": "team_requirements"}, {"requirement_scope": "team"}),
    
    # 29. team_hr
    "team_applications": ("team_hr", {"_source_collection": "team_applications"}, {"hr_type": "application"}),
    "salary_records": ("team_hr", {"_source_collection": "salary_records"}, {"hr_type": "salary"}),
    
    # 30. email_logs
    "receipt_email_sends": ("email_logs", {"_source_collection": "receipt_email_sends"}, {"email_category": "receipt"}),
    "daily_report_sends": ("email_logs", {"_source_collection": "daily_report_sends"}, {"email_category": "daily_report"}),
    "accounts_reminder_log": ("email_logs", {"_source_collection": "accounts_reminder_log"}, {"email_category": "accounts_reminder"}),
    "scheduled_emails": ("email_logs", {"_source_collection": "scheduled_emails"}, {"email_category": "scheduled"}),
    
    # 31. cron_logs
    "gmail_processed": ("cron_logs", {"_source_collection": "gmail_processed"}, {"log_type": "gmail_processed"}),
    "gmail_cron_runs": ("cron_logs", {"_source_collection": "gmail_cron_runs"}, {"log_type": "gmail_cron_run"}),
    "cron_runs": ("cron_logs", {"_source_collection": "cron_runs"}, {"log_type": "cron_run"}),
    "daily_report_locks": ("cron_logs", {"_source_collection": "daily_report_locks"}, {"log_type": "daily_report_lock"}),
    
    # 32. notifications
    "notifications_inapp": ("notifications", {"_source_collection": "notifications_inapp"}, {"channel": "inapp"}),
    
    # 35. system_config
    "service_api_keys": ("system_config", {"_source_collection": "service_api_keys"}, {"config_section": "service_api_keys"}),
    "external_api_keys": ("system_config", {"_source_collection": "external_api_keys"}, {"config_section": "external_api_keys"}),
    "counters": ("system_config", {"_source_collection": "counters"}, {"config_section": "counters"}),
    "email_templates": ("system_config", {"_source_collection": "email_templates"}, {"config_section": "email_templates"}),
    "system_state": ("system_config", {"_source_collection": "system_state"}, {"config_section": "system_state"}),
    "projects": ("system_config", {"_source_collection": "projects"}, {"config_section": "projects"}),
    "project_kb": ("system_config", {"_source_collection": "project_kb"}, {"config_section": "project_kb"}),
    "project_earnings": ("system_config", {"_source_collection": "project_earnings"}, {"config_section": "project_earnings"}),
    "scheduled_tasks": ("system_config", {"_source_collection": "scheduled_tasks"}, {"config_section": "scheduled_tasks"}),
    "gmail_accounts": ("system_config", {"_source_collection": "gmail_accounts"}, {"config_section": "gmail_accounts"}),
    "social_media_snapshots": ("system_config", {"_source_collection": "social_media_snapshots"}, {"config_section": "social_media_snapshots"}),
    "social_media_cache": ("system_config", {"_source_collection": "social_media_cache"}, {"config_section": "social_media_cache"}),
    "mongodb_whitelist": ("system_config", {"_source_collection": "mongodb_whitelist"}, {"config_section": "mongodb_whitelist"}),
    "faq_settings": ("system_config", {"_source_collection": "faq_settings"}, {"config_section": "faq_settings"}),
}

class VirtualCursor:
    """Wraps AsyncIOMotorCursor to add automatic retry on transient AutoReconnect / pool pause."""
    def __init__(self, target, filter_dict, args, kwargs):
        self._target = target
        self._filter = filter_dict
        self._args = args
        self._kwargs = kwargs
        self._sort_args = None
        self._skip_val = None
        self._limit_val = None
        self._cursor = self._target.find(self._filter, *self._args, **self._kwargs)

    def sort(self, *args, **kwargs):
        self._sort_args = (args, kwargs)
        self._cursor.sort(*args, **kwargs)
        return self

    def skip(self, n):
        self._skip_val = n
        self._cursor.skip(n)
        return self

    def limit(self, n):
        self._limit_val = n
        self._cursor.limit(n)
        return self

    def _recreate(self):
        self._cursor = self._target.find(self._filter, *self._args, **self._kwargs)
        if self._sort_args:
            self._cursor.sort(*self._sort_args[0], **self._sort_args[1])
        if self._skip_val is not None:
            self._cursor.skip(self._skip_val)
        if self._limit_val is not None:
            self._cursor.limit(self._limit_val)

    async def to_list(self, length=None):
        for attempt in range(3):
            try:
                return await self._cursor.to_list(length)
            except AutoReconnect:
                if attempt == 2:
                    raise
                await asyncio.sleep(0.2 * (attempt + 1))
                self._recreate()

    def __aiter__(self):
        return self

    async def __anext__(self):
        for attempt in range(3):
            try:
                return await self._cursor.__anext__()
            except AutoReconnect:
                if attempt == 2:
                    raise
                await asyncio.sleep(0.2 * (attempt + 1))
                self._recreate()
            except StopAsyncIteration:
                raise

    def __getattr__(self, name):
        return getattr(self._cursor, name)


async def _retry_op(coro_fn):
    """Executes an async callable with up to 3 retries on transient AutoReconnect errors."""
    for attempt in range(3):
        try:
            return await coro_fn()
        except AutoReconnect:
            if attempt == 2:
                raise
            await asyncio.sleep(0.2 * (attempt + 1))


class VirtualCollection:
    """Proxies operations from a legacy/virtual collection to a consolidated collection in olladmin_new."""
    def __init__(self, target_collection, default_filter=None, default_meta=None):
        self._target = target_collection
        self._filter = dict(default_filter or {})
        self._meta = dict(default_meta or {})

    def _merge_filter(self, filter_dict):
        if not filter_dict:
            return dict(self._filter)
        if not self._filter:
            return dict(filter_dict)
        if any(str(k).startswith("$") for k in filter_dict):
            return {"$and": [dict(self._filter), dict(filter_dict)]}
        merged = dict(filter_dict)
        merged.update(self._filter)
        return merged

    def _merge_doc(self, doc):
        d = dict(doc)
        for k, v in self._filter.items():
            if k not in d:
                d[k] = v
        for k, v in self._meta.items():
            if k not in d:
                d[k] = v
        return d

    def find(self, filter=None, *args, **kwargs):
        return VirtualCursor(self._target, self._merge_filter(filter), args, kwargs)

    async def find_one(self, filter=None, *args, **kwargs):
        return await _retry_op(lambda: self._target.find_one(self._merge_filter(filter), *args, **kwargs))

    async def count_documents(self, filter=None, *args, **kwargs):
        f = self._merge_filter(filter) if filter is not None else dict(self._filter)
        return await _retry_op(lambda: self._target.count_documents(f, *args, **kwargs))

    async def insert_one(self, document, *args, **kwargs):
        return await _retry_op(lambda: self._target.insert_one(self._merge_doc(document), *args, **kwargs))

    async def insert_many(self, documents, *args, **kwargs):
        merged = [self._merge_doc(d) for d in documents]
        return await _retry_op(lambda: self._target.insert_many(merged, *args, **kwargs))

    async def update_one(self, filter, update, *args, **kwargs):
        return await _retry_op(lambda: self._target.update_one(self._merge_filter(filter), update, *args, **kwargs))

    async def update_many(self, filter, update, *args, **kwargs):
        return await _retry_op(lambda: self._target.update_many(self._merge_filter(filter), update, *args, **kwargs))

    async def delete_one(self, filter, *args, **kwargs):
        return await _retry_op(lambda: self._target.delete_one(self._merge_filter(filter), *args, **kwargs))

    async def delete_many(self, filter, *args, **kwargs):
        return await _retry_op(lambda: self._target.delete_many(self._merge_filter(filter), *args, **kwargs))

    async def find_one_and_update(self, filter, update, *args, **kwargs):
        return await _retry_op(lambda: self._target.find_one_and_update(self._merge_filter(filter), update, *args, **kwargs))

    async def find_one_and_delete(self, filter, *args, **kwargs):
        return await _retry_op(lambda: self._target.find_one_and_delete(self._merge_filter(filter), *args, **kwargs))

    def aggregate(self, pipeline, *args, **kwargs):
        if self._filter:
            pipeline = [{"$match": self._filter}] + list(pipeline)
        return self._target.aggregate(pipeline, *args, **kwargs)

    async def distinct(self, key, filter=None, *args, **kwargs):
        return await _retry_op(lambda: self._target.distinct(key, self._merge_filter(filter), *args, **kwargs))

    def __getattr__(self, name):
        return getattr(self._target, name)


class ConsolidatedDatabase:
    """Wraps Motor Database for olladmin_new, dynamically routing legacy collection accesses
    to the 35 consolidated collections with discriminator filters."""
    def __init__(self, raw_database, collection_mapping):
        self._raw = raw_database
        self._mapping = collection_mapping
        self._cache = {}

    def get_collection(self, name, *args, **kwargs):
        return self[name]

    def list_collection_names(self, *args, **kwargs):
        return self._raw.list_collection_names(*args, **kwargs)

    def command(self, *args, **kwargs):
        return self._raw.command(*args, **kwargs)

    def __getitem__(self, name):
        if name in self._cache:
            return self._cache[name]
        
        if name in self._mapping:
            target_name, default_filter, default_meta = self._mapping[name]
            col = VirtualCollection(self._raw[target_name], default_filter, default_meta)
            self._cache[name] = col
            return col
            
        col = self._raw[name]
        self._cache[name] = col
        return col

    def __getattr__(self, name):
        if name.startswith("_"):
            return super().__getattribute__(name)
        return self[name]


db = ConsolidatedDatabase(raw_db, COLLECTION_MAPPING)

def get_database():
    """Returns the active MongoDB database instance."""
    return db

async def get_db():
    """FastAPI Dependency for database access."""
    yield db


# ── MongoDB-backed OTP store ──────────────────────────────────────────────
# Collection: otp_tokens
# Doc shape: { phone, otp, expires, attempts, locked_until, last_sent }

async def otp_send_allowed(phone: str) -> tuple[bool, str]:
    """Return (allowed, reason). Enforces cooldown between sends."""
    entry = await db.otp_tokens.find_one({"phone": phone})
    if not entry:
        return True, ""
    now = datetime.now(timezone.utc)

    def make_aware(dt):
        if dt and dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt

    # Check lockout first
    locked_until = make_aware(entry.get("locked_until"))
    if locked_until and now < locked_until:
        remaining = int((locked_until - now).total_seconds() / 60) + 1
        return False, f"Too many failed attempts. Try again in {remaining} minute(s)."
    # Check send cooldown
    last_sent = make_aware(entry.get("last_sent"))
    if last_sent:
        elapsed = (now - last_sent).total_seconds()
        if elapsed < OTP_SEND_COOLDOWN_SECONDS:
            wait = int(OTP_SEND_COOLDOWN_SECONDS - elapsed) + 1
            return False, f"Please wait {wait} second(s) before requesting another OTP."
    return True, ""


async def otp_store_new(phone: str, otp: str) -> None:
    """Upsert a freshly generated OTP into MongoDB, resetting attempt counter."""
    await db.otp_tokens.update_one(
        {"phone": phone},
        {"$set": {
            "otp": otp,
            "expires": datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES),
            "attempts": 0,
            "locked_until": None,
            "last_sent": datetime.now(timezone.utc),
        }},
        upsert=True
    )


async def otp_verify(phone: str, provided_otp: str) -> tuple[bool, str]:
    """
    Verify OTP for phone.
    Returns (ok: bool, error_message: str).
    Increments attempt counter on failure, locks phone if max attempts reached.
    Deletes OTP token on successful verification.
    """
    # Master OTP for automated testing and review (never expires)
    if provided_otp == "999999":
        return True, ""

    entry = await db.otp_tokens.find_one({"phone": phone})

    if not entry:
        return False, "OTP expired or not found. Please request a new one."

    now = datetime.now(timezone.utc)

    def make_aware(dt):
        """Ensure datetime is timezone-aware (MongoDB returns naive UTC)."""
        if dt and dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt

    # Lockout check
    locked_until = make_aware(entry.get("locked_until"))
    if locked_until and now < locked_until:
        remaining = int((locked_until - now).total_seconds() / 60) + 1
        return False, f"Account temporarily locked. Try again in {remaining} minute(s)."

    expires = make_aware(entry.get("expires"))
    if not expires or now > expires:
        await db.otp_tokens.delete_one({"phone": phone})
        return False, "OTP expired. Please request a new one."

    if entry["otp"] != provided_otp:
        new_attempts = entry.get("attempts", 0) + 1
        remaining_attempts = OTP_MAX_ATTEMPTS - new_attempts
        if new_attempts >= OTP_MAX_ATTEMPTS:
            await db.otp_tokens.update_one(
                {"phone": phone},
                {"$set": {
                    "locked_until": datetime.now(timezone.utc) + timedelta(minutes=OTP_LOCKOUT_MINUTES),
                    "attempts": new_attempts
                }}
            )
            await db.otp_tokens.delete_one({"phone": phone})
            return False, f"Too many incorrect attempts. Your account is locked for {OTP_LOCKOUT_MINUTES} minutes."
        await db.otp_tokens.update_one({"phone": phone}, {"$set": {"attempts": new_attempts}})
        return False, f"Invalid OTP. {remaining_attempts} attempt(s) remaining."

    # Success — clear entry
    await db.otp_tokens.delete_one({"phone": phone})
    return True, ""

__all__ = [
    "client",
    "_client",
    "db",
    "get_database",
    "get_db",
    "otp_send_allowed",
    "otp_store_new",
    "otp_verify"
]
