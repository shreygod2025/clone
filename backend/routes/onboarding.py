# Onboarding Router - For GP and Team onboarding endpoints
# Existing onboarding endpoints are in server.py
# This file is for organizing new onboarding-related code

from fastapi import APIRouter, Depends
from typing import Optional

router = APIRouter(tags=["Onboarding"])

# Note: The main onboarding endpoints are still in server.py
# This router is prepared for future extraction of onboarding endpoints
#
# Current onboarding endpoints in server.py:
# 
# Team Onboarding:
# - POST /team-onboarding/init/{application_id} (line 2592)
# - GET /team-onboarding (line 2631)
# - GET /team-onboarding/track/{token} (line 2641)
# - PATCH /team-onboarding/{onboarding_id}/step (line 2657)
# - POST /team-onboarding/{onboarding_id}/complete-step (line 2657)
# - POST /team-onboarding/{onboarding_id}/activate (line ~2700)
# - POST /team-onboarding/{onboarding_id}/discontinue (line ~2750)
#
# GP Onboarding:
# - POST /gp-onboarding/{partner_id}/initiate (line ~2800)
# - GET /gp-onboarding (line ~2850)
# - GET /gp-onboarding/track/{token} (line ~2900)
# - PATCH /gp-onboarding/{onboarding_id}/step (line ~2950)
# - POST /gp-onboarding/{onboarding_id}/complete (line ~3000)
# - PATCH /gp-onboarding/{onboarding_id}/discontinue (line ~3050)
