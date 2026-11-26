"""
Shared pytest fixtures + secret loader.

Reads admin test credentials from environment variables so they are NEVER
hardcoded across the dozens of test files (which is what triggered the
"hardcoded secret" code-review finding). Defaults match `/app/memory/test_credentials.md`
so the suite still runs locally out of the box, but production CI / forks
can override safely.
"""
import os
import sys
import pytest
from dotenv import load_dotenv

# Ensure backend root is always on sys.path for test discovery
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Pull backend/.env so TEST_ADMIN_* can be overridden per environment.
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

TEST_ADMIN_EMAIL = os.getenv("TEST_ADMIN_EMAIL", "admin@oll.co")
TEST_ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", os.getenv("TEST_ADMIN_PASSWORD", "Dagaji03@"))


@pytest.fixture(scope="session")
def admin_credentials():
    """Test admin email + password. Honors TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD env vars."""
    return {"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
