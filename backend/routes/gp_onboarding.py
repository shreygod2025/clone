"""
GP (Growth Partner) Onboarding routes.
Endpoints: /gp-onboarding/*, /gp-onboard/*
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import httpx
import os

from .shared import db, get_current_user
import bcrypt
import random
import string

# ── Models (inline copies to avoid circular imports) ─────────────────────
class TeamUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    phone: str = ""  # Phone number for WhatsApp notifications
    username: str  # unique, used for /add/{username}
    password_hash: str = ""
    role: str = "team_member"
    role_id: str = ""  # Reference to roles collection
    city: str = ""  # City for location-based assignment
    is_active: bool = True
    permissions: List[str] = []  # ['students', 'schools', 'educators', 'growth_partners']
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class GPOnboarding(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    growth_partner_id: str  # Reference to growth partner
    name: str
    email: str = ""
    phone: str
    city: str = ""
    interest_type: str = ""
    tracking_token: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    status: str = "onboarding"  # onboarding, active, discontinued
    
    # Onboarding steps (6 main steps for GP)
    steps: dict = Field(default_factory=lambda: {
        "personal_info": {"completed": False, "completed_at": None, "data": {}},
        "bank_details": {"completed": False, "completed_at": None, "data": {}},
        "contract_signing": {"completed": False, "completed_at": None, "data": {}},
        "payment": {"completed": False, "completed_at": None, "verified": False, "verified_by": None, "verified_at": None, "data": {}},
        "kit_delivery": {"completed": False, "completed_at": None, "delivered": False, "delivered_at": None, "tracking_number": "", "data": {}},
        "training": {"completed": False, "completed_at": None, "data": {}}
    })
    
    # Step 1: Personal Information
    personal_info: dict = Field(default_factory=lambda: {
        "full_name": "",
        "email": "",
        "phone": "",
        "aadhar_number": "",
        "aadhar_url": "",  # Uploaded Aadhar document
        "pan_number": "",
        "pan_url": "",  # Uploaded PAN document
        "address": "",
        "city": "",
        "state": "",
        "pincode": "",
        "tshirt_size": ""  # XS, S, M, L, XL, XXL
    })
    
    # Step 2: Bank Details (for commission payouts)
    bank_details: dict = Field(default_factory=lambda: {
        "account_holder_name": "",
        "bank_name": "",
        "account_number": "",
        "ifsc_code": "",
        "branch": "",
        "upi_id": "",
        "cancelled_cheque_url": ""  # Uploaded cancelled cheque
    })
    
    # Step 3: Contract
    contract_url: str = ""
    contract_signed_at: Optional[str] = None
    contract_signature_url: str = ""  # Digital signature image
    commission_structure: dict = Field(default_factory=dict)  # student_referral, school_referral rates
    
    # Step 4: Payment
    payment_amount: float = 0
    payment_status: str = ""  # pending, paid, verified
    payment_screenshot_url: str = ""
    payment_transaction_id: str = ""
    payment_date: str = ""
    
    # Step 5: Kit Delivery
    kit_delivery_status: str = ""  # pending, shipped, delivered
    kit_tracking_number: str = ""
    kit_delivery_date: str = ""
    kit_received_confirmation: bool = False
    
    # Step 6: Training - All sub-steps
    training_progress: dict = Field(default_factory=lambda: {
        "about_company": {
            "completed": False,
            "completed_at": None,
            "videos_watched": [],
            "assessment": {
                "submitted": False,
                "submitted_at": None,
                "answers": {},  # MCQ answers
                "score": 0,
                "passed": False
            }
        },
        "about_skill": {
            "completed": False,
            "completed_at": None,
            "videos_watched": [],
            "assessment": {
                "submitted": False,
                "submitted_at": None,
                "answers": {},  # Long text answers
                "reviewed": False,
                "review_notes": "",
                "passed": False
            }
        },
        "implementation_models": {
            "completed": False,
            "completed_at": None,
            "videos_watched": [],
            "assessment": {
                "submitted": False,
                "submitted_at": None,
                "answers": {},  # FAQ answers
                "reviewed": False,
                "review_notes": "",
                "passed": False
            }
        },
        "product_training": {
            "completed": False,
            "completed_at": None,
            "videos_watched": [],
            "samples_created": [],  # URLs of sample project photos/videos
            "component_names_learned": False
        },
        "target_audiences": {
            "completed": False,
            "completed_at": None,
            "videos_watched": [],
            "assessment": {
                "submitted": False,
                "submitted_at": None,
                "pitch_videos": {
                    "trustee_management": "",  # Video URL
                    "principal": "",
                    "teachers_demo": "",
                    "students_demo": "",
                    "parent_orientation": ""
                },
                "reviewed": False,
                "review_notes": "",
                "passed": False
            }
        },
        "pricing_training": {
            "completed": False,
            "completed_at": None,
            "materials_reviewed": False,
            "assessment": {
                "submitted": False,
                "submitted_at": None,
                "negotiation_scenarios": {},  # Answers to negotiation scenarios
                "reviewed": False,
                "review_notes": "",
                "passed": False
            }
        },
        "software_training": {
            "completed": False,
            "completed_at": None,
            "assessment": {
                "submitted": False,
                "submitted_at": None,
                "proposal_url": "",
                "mou_url": "",
                "email_sent": False,
                "whatsapp_sent": False,
                "campaign_created": False,
                "reviewed": False,
                "review_notes": "",
                "passed": False
            }
        }
    })
    
    # Training completion
    training_completed_at: Optional[str] = None
    training_notes: str = ""
    
    # Discontinuation
    discontinued_reason: str = ""
    discontinued_at: Optional[str] = None
    
    # Team user created (GP gets user access after training)
    team_user_id: str = ""
    team_user_credentials: dict = Field(default_factory=dict)  # Store login info to show GP
    
    # Performance metrics
    total_referrals: int = 0
    successful_conversions: int = 0
    total_earnings: float = 0
    
    # LMS Access (shown after training)
    lms_access_granted: bool = False
    lms_credentials: dict = Field(default_factory=dict)
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Expense Model for PnL Reports

router = APIRouter()

@router.post("/gp-onboarding/direct-add-active")
async def direct_add_active_gp(
    data: dict,
    user: dict = Depends(get_current_user)
):
    """
    Directly create an Active Growth Partner, skipping all lead/onboarding stages.
    Creates: growth_partners record + gp_onboarding record (active) + team_user account.
    Returns credentials to display to the admin.
    """
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    phone = (data.get("phone") or "").strip()
    city = (data.get("city") or "").strip()
    interest_type = (data.get("interest_type") or "distributor").strip()

    if not name or not email or not phone:
        raise HTTPException(status_code=400, detail="Name, email, and phone are required.")

    # Check for duplicate email in team_users
    if await db.team_users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="A user with this email already exists.")

    partner_id = str(uuid.uuid4())
    onboarding_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    # 1. Create growth_partner record (converted/active)
    partner_doc = {
        "id": partner_id,
        "name": name,
        "email": email,
        "phone": phone,
        "city": city,
        "interest_type": interest_type,
        "status": "converted",
        "source": "direct_add",
        "onboarding_id": onboarding_id,
        "created_at": now,
        "updated_at": now,
    }
    await db.growth_partners.insert_one(partner_doc)

    # 2. Create gp_onboarding record with all steps marked complete
    completed_steps = {
        step: {"completed": True, "completed_at": now, "skipped": True}
        for step in ["personal_info", "bank_details", "contract_signing", "payment", "kit_delivery", "training"]
    }
    onboarding_doc = {
        "id": onboarding_id,
        "growth_partner_id": partner_id,
        "name": name,
        "email": email,
        "phone": phone,
        "city": city,
        "interest_type": interest_type,
        "status": "active",
        "steps": completed_steps,
        "tracking_token": str(uuid.uuid4())[:8],
        "notes": data.get("notes", ""),
        "created_at": now,
        "updated_at": now,
    }
    await db.gp_onboarding.insert_one(onboarding_doc)

    # 3. Generate credentials
    base_username = email.split("@")[0].lower().replace(".", "_").replace("-", "_")
    username = base_username
    if await db.team_users.find_one({"username": username}):
        username = f"gp_{base_username}_{str(uuid.uuid4())[:4]}"

    temp_password = "".join(random.choices(string.ascii_letters + string.digits, k=10))
    password_hash = bcrypt.hashpw(temp_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    # Get or create GP role
    gp_role = await db.roles.find_one({"name": "Growth Partner"}, {"_id": 0})
    if not gp_role:
        gp_role = {
            "id": str(uuid.uuid4()),
            "name": "Growth Partner",
            "permissions": ["dashboard", "students", "schools", "growth_partners"],
            "created_at": now,
        }
        await db.roles.insert_one(gp_role)

    team_user_id = str(uuid.uuid4())
    team_user_doc = {
        "id": team_user_id,
        "email": email,
        "name": name,
        "username": username,
        "password_hash": password_hash,
        "role_id": gp_role["id"],
        "city": city,
        "phone": phone,
        "permissions": ["dashboard", "students", "schools", "growth_partners"],
        "is_growth_partner": True,
        "gp_onboarding_id": onboarding_id,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    await db.team_users.insert_one(team_user_doc)

    # 4. Link team_user back to onboarding & partner
    await db.gp_onboarding.update_one(
        {"id": onboarding_id},
        {"$set": {"team_user_id": team_user_id}}
    )
    await db.growth_partners.update_one(
        {"id": partner_id},
        {"$set": {"team_user_id": team_user_id}}
    )

    return {
        "message": "Growth Partner created and activated",
        "partner_id": partner_id,
        "onboarding_id": onboarding_id,
        "username": username,
        "email": email,
        "temp_password": temp_password,
        "login_url": f"{os.getenv('FRONTEND_URL', 'https://oll.co')}/admin-login",
    }


@router.post("/gp-onboarding/init/{partner_id}")
async def init_gp_onboarding(
    partner_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Initialize onboarding for a converted growth partner"""
    partner = await db.growth_partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Growth Partner not found")
    
    # Check if onboarding already exists
    existing = await db.gp_onboarding.find_one({"growth_partner_id": partner_id}, {"_id": 0})
    if existing:
        # Update GP status to onboarding (in case it was reverted)
        await db.growth_partners.update_one(
            {"id": partner_id},
            {"$set": {"status": "onboarding", "onboarding_id": existing.get('id')}}
        )
        # Also update onboarding status if it was discontinued
        if existing.get('status') == 'discontinued':
            new_token = str(uuid.uuid4())[:8]
            await db.gp_onboarding.update_one(
                {"id": existing.get('id')},
                {"$set": {"status": "onboarding", "tracking_token": new_token, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            existing['status'] = 'onboarding'
            existing['tracking_token'] = new_token
        return existing
    
    onboarding = GPOnboarding(
        growth_partner_id=partner_id,
        name=partner.get('name', ''),
        email=partner.get('email', ''),
        phone=partner.get('phone', ''),
        city=partner.get('city', ''),
        interest_type=partner.get('interest_type', ''),
    )
    
    doc = onboarding.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.gp_onboarding.insert_one(doc)
    
    # Update GP status to onboarding
    await db.growth_partners.update_one(
        {"id": partner_id},
        {"$set": {"status": "onboarding", "onboarding_id": onboarding.id}}
    )
    
    return {**doc, "_id": None}

@router.get("/gp-onboarding/track/{token}")
async def get_gp_onboarding_public(token: str):
    """Public endpoint to track GP onboarding progress by token"""
    onboarding = await db.gp_onboarding.find_one({"tracking_token": token}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Invalid tracking link")
    return {
        "name": onboarding.get("name"),
        "email": onboarding.get("email"),
        "phone": onboarding.get("phone"),
        "city": onboarding.get("city"),
        "interest_type": onboarding.get("interest_type"),
        "status": onboarding.get("status"),
        "steps": onboarding.get("steps"),
        "created_at": onboarding.get("created_at"),
    }

@router.get("/gp-onboarding")
async def get_gp_onboardings(
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get all GP onboarding records"""
    query = {}
    if status:
        query["status"] = status
    
    onboardings = await db.gp_onboarding.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return onboardings

@router.get("/gp-onboarding/{onboarding_id}")
async def get_gp_onboarding(onboarding_id: str, user: dict = Depends(get_current_user)):
    """Get a specific GP onboarding record"""
    onboarding = await db.gp_onboarding.find_one({"id": onboarding_id}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Onboarding not found")
    return onboarding

@router.post("/gp-onboarding/{onboarding_id}/complete-step")
async def complete_gp_onboarding_step(
    onboarding_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Mark a GP onboarding step as complete"""
    step_name = data.get('step')
    step_data = data.get('data', {})
    
    if step_name not in ["personal_info", "contract_signing", "training"]:
        raise HTTPException(status_code=400, detail="Invalid step name")
    
    update_data = {
        f"steps.{step_name}.completed": True,
        f"steps.{step_name}.completed_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Store step-specific data
    if step_name == "personal_info" and step_data:
        update_data["personal_info"] = step_data
        if step_data.get('bank_details'):
            update_data["bank_details"] = step_data['bank_details']
    elif step_name == "contract_signing":
        if step_data.get('contract_url'):
            update_data["contract_url"] = step_data['contract_url']
        if step_data.get('commission_structure'):
            update_data["commission_structure"] = step_data['commission_structure']
        update_data["contract_signed_at"] = datetime.now(timezone.utc).isoformat()
    elif step_name == "training":
        update_data["training_completed_at"] = datetime.now(timezone.utc).isoformat()
        if step_data.get('notes'):
            update_data["training_notes"] = step_data['notes']
    
    await db.gp_onboarding.update_one({"id": onboarding_id}, {"$set": update_data})
    onboarding = await db.gp_onboarding.find_one({"id": onboarding_id}, {"_id": 0})
    return onboarding

@router.post("/gp-onboarding/{onboarding_id}/verify-payment")
async def verify_gp_payment(
    onboarding_id: str,
    user: dict = Depends(get_current_user)
):
    """Verify GP payment - admin action"""
    onboarding = await db.gp_onboarding.find_one({"id": onboarding_id}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Onboarding not found")
    
    # Update payment step to verified
    now = datetime.now(timezone.utc).isoformat()
    await db.gp_onboarding.update_one(
        {"id": onboarding_id},
        {"$set": {
            "steps.payment.verified": True,
            "steps.payment.verified_at": now,
            "steps.payment.verified_by": user.get('id') or user.get('email'),
            "payment_status": "verified",
            "updated_at": now
        }}
    )
    
    updated = await db.gp_onboarding.find_one({"id": onboarding_id}, {"_id": 0})
    return {"message": "Payment verified successfully", "onboarding": updated}

@router.post("/gp-onboarding/{onboarding_id}/kit-delivery")
async def update_kit_delivery(
    onboarding_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Update kit delivery status - admin action"""
    onboarding = await db.gp_onboarding.find_one({"id": onboarding_id}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Onboarding not found")
    
    now = datetime.now(timezone.utc).isoformat()
    status = data.get('status', 'pending')
    
    update_data = {
        "kit_delivery_status": status,
        "kit_tracking_number": data.get('tracking_number', ''),
        "kit_courier_name": data.get('courier_name', ''),
        "kit_dispatch_date": data.get('dispatch_date', ''),
        "kit_expected_delivery_date": data.get('expected_delivery_date', ''),
        "updated_at": now
    }
    
    # If dispatched, mark step as in progress
    if status == 'dispatched':
        update_data["kit_dispatched_at"] = now
        update_data["kit_dispatched_by"] = user.get('id') or user.get('email')
    
    # If delivered, mark step as completed and auto-move to training
    if status == 'delivered':
        update_data["kit_delivered_at"] = now
        update_data["kit_delivery_date"] = now[:10]  # Just the date part
        update_data["steps.kit_delivery.completed"] = True
        update_data["steps.kit_delivery.completed_at"] = now
        update_data["steps.kit_delivery.data"] = {
            "delivered_at": now,
            "tracking_number": data.get('tracking_number', ''),
            "courier_name": data.get('courier_name', '')
        }
    
    await db.gp_onboarding.update_one({"id": onboarding_id}, {"$set": update_data})
    
    updated = await db.gp_onboarding.find_one({"id": onboarding_id}, {"_id": 0})
    return {"message": f"Kit delivery updated to {status}", "onboarding": updated}

@router.post("/gp-onboarding/{onboarding_id}/activate")
async def activate_gp(
    onboarding_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Activate GP - creates a new team user with GP Manager role"""
    onboarding = await db.gp_onboarding.find_one({"id": onboarding_id}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Onboarding not found")
    
    # Check if all steps are complete
    steps = onboarding.get('steps', {})
    incomplete = [s for s, v in steps.items() if not v.get('completed')]
    if incomplete:
        raise HTTPException(status_code=400, detail=f"Complete all steps first: {', '.join(incomplete)}")
    
    # Find or create GP Manager role
    gp_role = await db.roles.find_one({"name": "GP Manager"}, {"_id": 0})
    if not gp_role:
        # Create the role
        gp_role = {
            "id": str(uuid.uuid4()),
            "name": "GP Manager",
            "description": "Growth Partner Manager - Can manage schools and student leads",
            "permissions": ["dashboard", "students", "schools", "growth_partners"],
            "is_system": False,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.roles.insert_one(gp_role)
    
    role_id = data.get('role_id') or gp_role['id']
    
    # Create team user
    username = onboarding.get('email', '').split('@')[0] or onboarding.get('name', '').lower().replace(' ', '_')
    existing = await db.team_users.find_one({"username": username})
    if existing:
        username = f"gp_{username}_{str(uuid.uuid4())[:4]}"
    
    temp_password = str(uuid.uuid4())[:8]
    
    team_user = TeamUser(
        email=onboarding.get('email', f"{username}@oll.co"),
        name=onboarding.get('name', ''),
        username=username,
        password_hash=bcrypt.hashpw(temp_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
        role_id=role_id,
        city=onboarding.get('city', ''),
        permissions=["dashboard", "students", "schools", "growth_partners"]  # GP Manager permissions
    )
    
    doc = team_user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['is_growth_partner'] = True  # Mark as GP user
    doc['gp_onboarding_id'] = onboarding_id
    await db.team_users.insert_one(doc)
    
    # Update onboarding status
    await db.gp_onboarding.update_one(
        {"id": onboarding_id},
        {"$set": {
            "status": "active",
            "team_user_id": team_user.id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update growth partner status
    await db.growth_partners.update_one(
        {"id": onboarding.get('growth_partner_id')},
        {"$set": {"status": "converted", "team_user_id": team_user.id}}
    )
    
    return {
        "message": "Growth Partner activated",
        "team_user_id": team_user.id,
        "username": username,
        "email": team_user.email,
        "temp_password": temp_password
    }

@router.post("/gp-onboarding/{onboarding_id}/discontinue")
async def discontinue_gp(
    onboarding_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Discontinue a Growth Partner"""
    reason = data.get('reason', '')
    
    if not reason:
        raise HTTPException(status_code=400, detail="Reason required")
    
    # Deactivate the team user if exists
    onboarding = await db.gp_onboarding.find_one({"id": onboarding_id}, {"_id": 0})
    if onboarding and onboarding.get('team_user_id'):
        await db.team_users.update_one(
            {"id": onboarding['team_user_id']},
            {"$set": {"is_active": False}}
        )
    
    await db.gp_onboarding.update_one(
        {"id": onboarding_id},
        {"$set": {
            "status": "discontinued",
            "discontinued_reason": reason,
            "discontinued_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update growth partner status
    if onboarding:
        await db.growth_partners.update_one(
            {"id": onboarding.get('growth_partner_id')},
            {"$set": {"status": "archived"}}
        )
    
    return {"message": "Growth Partner discontinued"}

# PUBLIC GP ONBOARDING SUBMISSION ENDPOINTS (No auth required - use tracking token)

@router.get("/gp-onboard/{token}")
async def get_gp_onboarding_full(token: str):
    """Public endpoint to get full GP onboarding data for filling form"""
    onboarding = await db.gp_onboarding.find_one({"tracking_token": token}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Invalid tracking link")
    
    # Return all data needed for the onboarding form
    return onboarding

@router.post("/gp-onboard/{token}/personal-info")
async def submit_gp_personal_info(token: str, data: dict):
    """Public endpoint for GP to submit personal information"""
    onboarding = await db.gp_onboarding.find_one({"tracking_token": token}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Invalid tracking link")
    
    # Update personal info
    personal_info = {
        "full_name": data.get("full_name", ""),
        "email": data.get("email", ""),
        "phone": data.get("phone", ""),
        "aadhar_number": data.get("aadhar_number", ""),
        "aadhar_url": data.get("aadhar_url", ""),
        "pan_number": data.get("pan_number", ""),
        "pan_url": data.get("pan_url", ""),
        "address": data.get("address", ""),
        "city": data.get("city", ""),
        "state": data.get("state", ""),
        "pincode": data.get("pincode", ""),
        "tshirt_size": data.get("tshirt_size", "")
    }
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.gp_onboarding.update_one(
        {"tracking_token": token},
        {"$set": {
            "personal_info": personal_info,
            "name": data.get("full_name", onboarding.get("name", "")),
            "email": data.get("email", onboarding.get("email", "")),
            "phone": data.get("phone", onboarding.get("phone", "")),
            "city": data.get("city", onboarding.get("city", "")),
            "steps.personal_info.completed": True,
            "steps.personal_info.completed_at": now,
            "steps.personal_info.data": personal_info,
            "updated_at": now
        }}
    )
    
    return {"message": "Personal information saved", "next_step": "bank_details"}

@router.post("/gp-onboard/{token}/bank-details")
async def submit_gp_bank_details(token: str, data: dict):
    """Public endpoint for GP to submit bank details"""
    onboarding = await db.gp_onboarding.find_one({"tracking_token": token}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Invalid tracking link")
    
    bank_details = {
        "account_holder_name": data.get("account_holder_name", ""),
        "bank_name": data.get("bank_name", ""),
        "account_number": data.get("account_number", ""),
        "ifsc_code": data.get("ifsc_code", ""),
        "branch": data.get("branch", ""),
        "upi_id": data.get("upi_id", ""),
        "cancelled_cheque_url": data.get("cancelled_cheque_url", "")
    }
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.gp_onboarding.update_one(
        {"tracking_token": token},
        {"$set": {
            "bank_details": bank_details,
            "steps.bank_details.completed": True,
            "steps.bank_details.completed_at": now,
            "steps.bank_details.data": bank_details,
            "updated_at": now
        }}
    )
    
    return {"message": "Bank details saved", "next_step": "contract_signing"}

@router.post("/gp-onboard/{token}/contract")
async def submit_gp_contract(token: str, data: dict):
    """Public endpoint for GP to submit signed contract"""
    onboarding = await db.gp_onboarding.find_one({"tracking_token": token}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Invalid tracking link")
    
    now = datetime.now(timezone.utc).isoformat()
    signed_contract_url = data.get("signed_contract_url", "")
    
    await db.gp_onboarding.update_one(
        {"tracking_token": token},
        {"$set": {
            "contract_signed_at": now,
            "signed_contract_url": signed_contract_url,
            "contract_url": signed_contract_url,  # Also save to contract_url for admin view
            "steps.contract_signing.completed": True,
            "steps.contract_signing.completed_at": now,
            "steps.contract_signing.data": {
                "signed_at": now,
                "signed_contract_url": signed_contract_url,
                "agreed_terms": True
            },
            "updated_at": now
        }}
    )
    
    return {"message": "Contract submitted", "next_step": "payment"}

@router.post("/gp-onboard/{token}/payment")
async def submit_gp_payment(token: str, data: dict):
    """Public endpoint for GP to submit payment proof"""
    onboarding = await db.gp_onboarding.find_one({"tracking_token": token}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Invalid tracking link")
    
    now = datetime.now(timezone.utc).isoformat()
    
    payment_data = {
        "amount": data.get("amount", 0),
        "transaction_id": data.get("transaction_id", ""),
        "screenshot_url": data.get("screenshot_url", ""),
        "payment_date": data.get("payment_date", now[:10]),
        "payment_method": data.get("payment_method", "")
    }
    
    await db.gp_onboarding.update_one(
        {"tracking_token": token},
        {"$set": {
            "payment_amount": data.get("amount", 0),
            "payment_status": "pending_verification",
            "payment_screenshot_url": data.get("screenshot_url", ""),
            "payment_transaction_id": data.get("transaction_id", ""),
            "payment_date": data.get("payment_date", now[:10]),
            "steps.payment.completed": True,
            "steps.payment.completed_at": now,
            "steps.payment.data": payment_data,
            "steps.payment.verified": False,
            "updated_at": now
        }}
    )
    
    return {"message": "Payment proof submitted. Awaiting admin verification.", "next_step": "kit_delivery"}

@router.post("/gp-onboard/{token}/training/{step}")
async def submit_gp_training_step(token: str, step: str, data: dict):
    """Public endpoint for GP to submit training step progress"""
    onboarding = await db.gp_onboarding.find_one({"tracking_token": token}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Invalid tracking link")
    
    valid_steps = ["about_company", "about_skill", "implementation_models", "product_training", 
                   "target_audiences", "pricing_training", "software_training"]
    if step not in valid_steps:
        raise HTTPException(status_code=400, detail=f"Invalid training step. Valid steps: {valid_steps}")
    
    now = datetime.now(timezone.utc).isoformat()
    training_progress = onboarding.get("training_progress", {})
    step_data = training_progress.get(step, {})
    
    # Update videos watched
    if "video_id" in data:
        videos_watched = step_data.get("videos_watched", [])
        if data["video_id"] not in videos_watched:
            videos_watched.append(data["video_id"])
        step_data["videos_watched"] = videos_watched
    
    # Update assessment
    if "assessment" in data:
        step_data["assessment"] = {
            **step_data.get("assessment", {}),
            **data["assessment"],
            "submitted": True,
            "submitted_at": now
        }
    
    # Mark step as completed if all required items are done
    if data.get("mark_complete", False):
        step_data["completed"] = True
        step_data["completed_at"] = now
    
    training_progress[step] = step_data
    
    # Check if all training steps are complete
    all_training_complete = all(
        training_progress.get(s, {}).get("completed", False) 
        for s in valid_steps
    )
    
    update_data = {
        f"training_progress.{step}": step_data,
        "updated_at": now
    }
    
    if all_training_complete:
        update_data["steps.training.completed"] = True
        update_data["steps.training.completed_at"] = now
        update_data["training_completed_at"] = now
    
    await db.gp_onboarding.update_one(
        {"tracking_token": token},
        {"$set": update_data}
    )
    
    next_steps = {
        "about_company": "about_skill",
        "about_skill": "implementation_models",
        "implementation_models": "product_training",
        "product_training": "target_audiences",
        "target_audiences": "pricing_training",
        "pricing_training": "software_training",
        "software_training": "complete"
    }
    
    return {
        "message": f"Training step '{step}' updated",
        "next_step": next_steps.get(step, "complete"),
        "all_training_complete": all_training_complete
    }

@router.post("/gp-onboarding/{onboarding_id}/ship-kit")
async def ship_gp_kit(
    onboarding_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Admin endpoint to mark kit as shipped"""
    now = datetime.now(timezone.utc).isoformat()
    
    await db.gp_onboarding.update_one(
        {"id": onboarding_id},
        {"$set": {
            "kit_delivery_status": "shipped",
            "kit_tracking_number": data.get("tracking_number", ""),
            "steps.kit_delivery.tracking_number": data.get("tracking_number", ""),
            "updated_at": now
        }}
    )
    
    return {"message": "Kit marked as shipped"}

@router.post("/gp-onboard/{token}/confirm-kit")
async def confirm_gp_kit_delivery(token: str, data: dict):
    """Public endpoint for GP to confirm kit received"""
    onboarding = await db.gp_onboarding.find_one({"tracking_token": token}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Invalid tracking link")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.gp_onboarding.update_one(
        {"tracking_token": token},
        {"$set": {
            "kit_delivery_status": "delivered",
            "kit_delivery_date": now[:10],
            "kit_received_confirmation": True,
            "steps.kit_delivery.completed": True,
            "steps.kit_delivery.completed_at": now,
            "steps.kit_delivery.delivered": True,
            "steps.kit_delivery.delivered_at": now,
            "updated_at": now
        }}
    )
    
    return {"message": "Kit delivery confirmed", "next_step": "training"}

@router.post("/gp-onboarding/{onboarding_id}/review-assessment")
async def review_gp_assessment(
    onboarding_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Admin endpoint to review GP training assessment"""
    training_step = data.get("training_step")
    passed = data.get("passed", False)
    review_notes = data.get("review_notes", "")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.gp_onboarding.update_one(
        {"id": onboarding_id},
        {"$set": {
            f"training_progress.{training_step}.assessment.reviewed": True,
            f"training_progress.{training_step}.assessment.review_notes": review_notes,
            f"training_progress.{training_step}.assessment.passed": passed,
            f"training_progress.{training_step}.assessment.reviewed_by": user.get("id"),
            f"training_progress.{training_step}.assessment.reviewed_at": now,
            "updated_at": now
        }}
    )
    
    return {"message": f"Assessment for {training_step} reviewed", "passed": passed}

@router.post("/gp-onboarding/{onboarding_id}/complete-onboarding")
async def complete_gp_onboarding(
    onboarding_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Admin endpoint to complete GP onboarding and create credentials"""
    onboarding = await db.gp_onboarding.find_one({"id": onboarding_id}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Onboarding not found")
    
    # Verify all steps are complete
    steps = onboarding.get("steps", {})
    incomplete_steps = []
    for step_key, step_val in steps.items():
        if not step_val.get("completed"):
            incomplete_steps.append(step_key)
    
    if incomplete_steps:
        raise HTTPException(status_code=400, detail=f"Incomplete steps: {', '.join(incomplete_steps)}")
    
    # Find or create GP Manager role
    gp_role = await db.roles.find_one({"name": "GP Manager"}, {"_id": 0})
    if not gp_role:
        gp_role = {
            "id": str(uuid.uuid4()),
            "name": "GP Manager",
            "description": "Growth Partner Manager - Can manage schools and student leads",
            "permissions": ["dashboard", "students", "schools", "growth_partners"],
            "is_system": False,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.roles.insert_one(gp_role)
    role_id = gp_role.get("id")
    
    # Generate credentials
    email = onboarding.get("email") or onboarding.get("personal_info", {}).get("email", "")
    name = onboarding.get("name") or onboarding.get("personal_info", {}).get("full_name", "")
    phone = onboarding.get("phone") or onboarding.get("personal_info", {}).get("phone", "")
    
    username = email.split("@")[0] if email else name.lower().replace(" ", "_")
    # Ensure unique username
    existing = await db.team_users.find_one({"username": username})
    if existing:
        username = f"gp_{username}_{str(uuid.uuid4())[:4]}"
    
    temp_password = str(uuid.uuid4())[:8]
    
    # Create team user
    team_user_id = str(uuid.uuid4())
    team_user_doc = {
        "id": team_user_id,
        "name": name,
        "email": email,
        "phone": phone,
        "username": username,
        "password_hash": bcrypt.hashpw(temp_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
        "role_id": role_id,
        "role_name": "GP Manager",
        "is_active": True,
        "is_growth_partner": True,
        "gp_onboarding_id": onboarding_id,
        "permissions": ["dashboard", "schools", "students", "growth_partners"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.team_users.insert_one(team_user_doc)
    
    now = datetime.now(timezone.utc).isoformat()
    credentials = {
        "username": username,
        "email": email,
        "temp_password": temp_password,
        "login_url": "/admin/login",
        "created_at": now
    }
    
    # Update onboarding record
    await db.gp_onboarding.update_one(
        {"id": onboarding_id},
        {"$set": {
            "status": "active",
            "team_user_id": team_user_id,
            "team_user_credentials": credentials,
            "lms_access_granted": True,
            "updated_at": now
        }}
    )
    
    # Update growth partner status
    await db.growth_partners.update_one(
        {"id": onboarding.get("growth_partner_id")},
        {"$set": {"status": "active", "team_user_id": team_user_id}}
    )
    
    return {
        "message": "GP onboarding completed",
        "credentials": credentials,
        "team_user_id": team_user_id
    }

# ========================
# EXPENSE ENDPOINTS
# ========================

