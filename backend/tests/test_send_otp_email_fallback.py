"""Regression: /api/auth/send-otp must fall back to email for ANY user_type
when the AiSensy WhatsApp campaign fails (previously the fallback only
kicked in when the caller passed user_type='educator').

Symptom that caused the fix: an educator (Yash Wadekar) reported that
the educator apply form's OTP resend step never delivered a code and
therefore he could not submit. The frontend resend call defaulted
user_type to 'student', so even though we had his email on file the
backend refused to email him after WhatsApp failed.
"""
import pytest
from httpx import AsyncClient, ASGITransport


@pytest.mark.asyncio
async def test_send_otp_falls_back_to_email_for_any_user_type(monkeypatch):
    pytest.importorskip("mongomock_motor")

    import sys, importlib
    # Force `os.environ["AISENSY_API_KEY"]` = "test-key" so the code
    # attempts a WhatsApp call.
    monkeypatch.setenv("AISENSY_API_KEY", "test-key")

    # Patch httpx.AsyncClient.post used inside users.py to simulate an
    # AiSensy 402 credits-exhausted error. Then the code MUST call
    # _send_otp_via_email even when user_type='student'.
    from routes import users as users_mod

    class _Resp:
        status_code = 402
        text = '{"errorCode":402,"errorMessage":"WhatsApp Conversation Credits exhausted"}'
        def json(self):  # noqa: D401
            return {"errorCode": 402, "errorMessage": "WhatsApp Conversation Credits exhausted"}

    class _FakeClient:
        async def __aenter__(self):    return self
        async def __aexit__(self, *a): return False
        async def post(self, *a, **kw):
            return _Resp()

    import httpx as _httpx
    monkeypatch.setattr(_httpx, "AsyncClient", _FakeClient, raising=False)

    email_calls: list[tuple] = []
    async def _fake_email(email, otp):
        email_calls.append((email, otp))
        return True

    monkeypatch.setattr(users_mod, "_send_otp_via_email", _fake_email)

    # Neutralise the DB-backed OTP guard functions so we don't touch Mongo.
    async def _ok_send_allowed(_phone): return True, ""
    async def _noop_store_new(_phone, _otp): return None
    monkeypatch.setattr(users_mod, "otp_send_allowed", _ok_send_allowed)
    monkeypatch.setattr(users_mod, "otp_store_new",    _noop_store_new)

    # Build a minimal FastAPI app just around the users router so we don't
    # spin up all of server.py.
    from fastapi import FastAPI
    app = FastAPI()
    app.include_router(users_mod.router, prefix="/api")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as ac:
        r = await ac.post(
            "/api/auth/send-otp",
            json={"phone": "9324105247", "user_type": "student", "email": "yash@example.com"},
        )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("sent") is True
    assert data.get("channel") == "email"
    assert email_calls and email_calls[0][0] == "yash@example.com"
