"""
Admin Analytics & Reports routes.
Endpoints: /admin/reports/*
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime, timezone, timedelta

from .shared import db, get_current_user

# ── Utility helpers (used across report endpoints) ──────────────────────────

def get_date_range(start_date, end_date, period):
    """Get date range for filtering"""
    now = datetime.now(timezone.utc)
    if start_date and end_date:
        start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        end = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
    elif period == "day":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == "week":
        start = (now - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == "month":
        start = (now - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == "year":
        start = (now - timedelta(days=365)).replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    else:
        start = datetime(2020, 1, 1, tzinfo=timezone.utc)
        end = now
    return start, end


def parse_date_field(date_val):
    """Parse date field from various formats and ensure timezone awareness"""
    if not date_val:
        return None
    if isinstance(date_val, datetime):
        if date_val.tzinfo is None:
            return date_val.replace(tzinfo=timezone.utc)
        return date_val
    try:
        if isinstance(date_val, str):
            if 'T' in date_val:
                dt = datetime.fromisoformat(date_val.replace('Z', '+00:00'))
            else:
                dt = datetime.strptime(date_val, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        pass
    return None

router = APIRouter()

@router.get("/admin/reports/overview")
async def get_reports_overview(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = None,
    assigned_to: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get overall metrics for the dashboard"""
    start, end = get_date_range(start_date, end_date, period)
    
    # Get all student inquiries for date filtering
    all_student_inquiries = await db.student_inquiries.find({}, {"_id": 0}).to_list(10000)
    student_inquiries = []
    for inq in all_student_inquiries:
        created = parse_date_field(inq.get('created_at'))
        if created and start <= created <= end:
            if assigned_to and inq.get('assigned_to') != assigned_to:
                continue
            student_inquiries.append(inq)
    
    # Get all school inquiries
    all_school_inquiries = await db.school_inquiries.find({}, {"_id": 0}).to_list(10000)
    school_inquiries = []
    for inq in all_school_inquiries:
        created = parse_date_field(inq.get('created_at'))
        if created and start <= created <= end:
            if assigned_to and inq.get('assigned_to') != assigned_to:
                continue
            school_inquiries.append(inq)
    
    # Get all educator applications
    all_educators = await db.educator_applications.find({}, {"_id": 0}).to_list(10000)
    educators = []
    for edu in all_educators:
        created = parse_date_field(edu.get('created_at'))
        if created and start <= created <= end:
            if assigned_to and edu.get('assigned_to') != assigned_to:
                continue
            educators.append(edu)
    
    # Get demo bookings
    all_demos = await db.demo_bookings.find({}, {"_id": 0}).to_list(10000)
    demos = []
    for demo in all_demos:
        created = parse_date_field(demo.get('created_at'))
        if created and start <= created <= end:
            demos.append(demo)
    
    # Calculate metrics
    total_students = len(student_inquiries)
    paid_students = len([s for s in student_inquiries if s.get('status') == 'converted' or s.get('payment_status') == 'paid'])
    
    total_schools = len(school_inquiries)
    converted_schools = len([s for s in school_inquiries if s.get('status') == 'converted'])
    
    total_educators = len(educators)
    active_educators = len([e for e in educators if e.get('status') == 'active'])
    
    total_demos = len(demos)
    completed_demos = len([d for d in demos if d.get('status') == 'completed'])
    
    # Revenue calculation - includes amount_paid AND conversion_amount from onboarding
    student_revenue = 0
    for s in student_inquiries:
        if s.get('payment_status') == 'paid' or s.get('status') == 'converted':
            # Check for conversion_amount first (from onboarding), then amount_paid
            amount = float(s.get('conversion_amount') or s.get('amount_paid') or 0)
            student_revenue += amount
    
    school_revenue = 0
    for s in school_inquiries:
        if s.get('status') in ['converted', 'active', 'renewed']:
            # Check for conversion_amount, onboarding_data.total_amount, or amount_paid
            onboarding_data = s.get('onboarding_data', {})
            amount = float(s.get('conversion_amount') or onboarding_data.get('total_amount') or s.get('amount_paid') or 0)
            school_revenue += amount
    total_revenue = student_revenue + school_revenue
    
    return {
        "overview": {
            "total_revenue": total_revenue,
            "student_revenue": student_revenue,
            "school_revenue": school_revenue,
            "paid_students": paid_students,
            "converted_schools": converted_schools,
            "active_educators": active_educators,
        },
        "students": {
            "total": total_students,
            "new": len([s for s in student_inquiries if s.get('status') == 'new']),
            "demo_scheduled": len([s for s in student_inquiries if s.get('status') == 'demo_scheduled']),
            "demo_completed": len([s for s in student_inquiries if s.get('status') == 'demo_completed']),
            "converted": paid_students,
        },
        "schools": {
            "total": total_schools,
            "new": len([s for s in school_inquiries if s.get('status') == 'new']),
            "meeting_scheduled": len([s for s in school_inquiries if s.get('status') == 'meeting_scheduled']),
            "proposal_sent": len([s for s in school_inquiries if s.get('status') == 'proposal_sent']),
            "converted": converted_schools,
        },
        "educators": {
            "total": total_educators,
            "new": len([e for e in educators if e.get('status') == 'new']),
            "demo_scheduled": len([e for e in educators if e.get('status') == 'demo_scheduled']),
            "onboarding": len([e for e in educators if e.get('status') == 'onboarding']),
            "active": active_educators,
        },
        "demos": {
            "total": total_demos,
            "scheduled": len([d for d in demos if d.get('status') == 'scheduled']),
            "completed": completed_demos,
        },
        "period": {
            "start": start.isoformat(),
            "end": end.isoformat(),
        }
    }

@router.get("/admin/reports/sales-funnel")
async def get_sales_funnel_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = None,
    user_type: str = "students",  # students, schools
    assigned_to: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get sales funnel metrics with conversion rates"""
    start, end = get_date_range(start_date, end_date, period)
    
    if user_type == "students":
        collection = db.student_inquiries
    else:
        collection = db.school_inquiries
    
    all_items = await collection.find({}, {"_id": 0}).to_list(10000)
    items = []
    for item in all_items:
        created = parse_date_field(item.get('created_at'))
        if created and start <= created <= end:
            if assigned_to and item.get('assigned_to') != assigned_to:
                continue
            items.append(item)
    
    total = len(items)
    if total == 0:
        return {
            "funnel": [],
            "conversion_rates": {},
            "revenue": 0,
            "period": {"start": start.isoformat(), "end": end.isoformat()}
        }
    
    # Define stages based on user type
    if user_type == "students":
        stages = [
            {"name": "New Leads", "status": "new"},
            {"name": "Demo Scheduled", "status": "demo_scheduled"},
            {"name": "Demo Completed", "status": "demo_completed"},
            {"name": "Converted", "status": "converted"},
        ]
    else:
        stages = [
            {"name": "New Leads", "status": "new"},
            {"name": "Meeting Scheduled", "status": "meeting_scheduled"},
            {"name": "Proposal Sent", "status": "proposal_sent"},
            {"name": "Negotiation", "status": "negotiation"},
            {"name": "Converted", "status": "converted"},
        ]
    
    funnel = []
    for i, stage in enumerate(stages):
        count = len([item for item in items if item.get('status') == stage['status']])
        # Include all later stages in the count (funnel logic)
        for later_stage in stages[i+1:]:
            count += len([item for item in items if item.get('status') == later_stage['status']])
        funnel.append({
            "stage": stage['name'],
            "count": count,
            "percentage": round(count / total * 100, 1) if total > 0 else 0
        })
    
    # Calculate conversion rates
    converted = len([item for item in items if item.get('status') == 'converted'])
    demo_scheduled = len([item for item in items if item.get('status') in ['demo_scheduled', 'demo_completed', 'converted', 'meeting_scheduled', 'proposal_sent', 'negotiation']])
    
    conversion_rates = {
        "lead_to_demo": round(demo_scheduled / total * 100, 1) if total > 0 else 0,
        "demo_to_conversion": round(converted / demo_scheduled * 100, 1) if demo_scheduled > 0 else 0,
        "overall_conversion": round(converted / total * 100, 1) if total > 0 else 0,
    }
    
    # Revenue - includes conversion_amount from onboarding
    revenue = 0
    for item in items:
        if item.get('status') == 'converted' or item.get('payment_status') == 'paid':
            amount = float(item.get('conversion_amount') or item.get('amount_paid') or 0)
            revenue += amount
    
    return {
        "funnel": funnel,
        "conversion_rates": conversion_rates,
        "revenue": revenue,
        "total_leads": total,
        "period": {"start": start.isoformat(), "end": end.isoformat()}
    }

@router.get("/admin/reports/lead-analytics")
async def get_lead_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get lead analytics - source, age group, course interest breakdown"""
    start, end = get_date_range(start_date, end_date, period)
    
    all_items = await db.student_inquiries.find({}, {"_id": 0}).to_list(10000)
    items = []
    for item in all_items:
        created = parse_date_field(item.get('created_at'))
        if created and start <= created <= end:
            items.append(item)
    
    # Source breakdown
    sources = {}
    for item in items:
        source = item.get('source', 'website') or 'website'
        sources[source] = sources.get(source, 0) + 1
    
    # Age group breakdown
    age_groups = {}
    for item in items:
        age = item.get('child_age') or item.get('age_group', 'Unknown')
        if isinstance(age, (int, float)):
            if age < 6:
                age_group = "Under 6"
            elif age < 10:
                age_group = "6-9"
            elif age < 14:
                age_group = "10-13"
            else:
                age_group = "14+"
        else:
            age_group = str(age) if age else "Unknown"
        age_groups[age_group] = age_groups.get(age_group, 0) + 1
    
    # Course interest breakdown
    courses = {}
    for item in items:
        course = item.get('course_interest') or item.get('skill', 'Not Specified')
        if isinstance(course, list):
            for c in course:
                courses[c] = courses.get(c, 0) + 1
        else:
            courses[course] = courses.get(course, 0) + 1
    
    # Stage breakdown
    stages = {}
    for item in items:
        stage = item.get('status', 'new')
        stages[stage] = stages.get(stage, 0) + 1
    
    return {
        "by_source": [{"name": k, "count": v} for k, v in sorted(sources.items(), key=lambda x: -x[1])],
        "by_age_group": [{"name": k, "count": v} for k, v in sorted(age_groups.items(), key=lambda x: -x[1])],
        "by_course": [{"name": k, "count": v} for k, v in sorted(courses.items(), key=lambda x: -x[1])],
        "by_stage": [{"name": k, "count": v} for k, v in sorted(stages.items(), key=lambda x: -x[1])],
        "total": len(items),
        "period": {"start": start.isoformat(), "end": end.isoformat()}
    }

@router.get("/admin/reports/educator-metrics")
async def get_educator_metrics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get educator/teacher quality metrics"""
    start, end = get_date_range(start_date, end_date, period)
    
    # Get all educators
    all_educators = await db.educator_applications.find({}, {"_id": 0}).to_list(10000)
    
    # Filter by date range for new educators
    new_educators = []
    all_active = []
    for edu in all_educators:
        created = parse_date_field(edu.get('created_at'))
        if created and start <= created <= end:
            new_educators.append(edu)
        if edu.get('status') == 'active':
            all_active.append(edu)
    
    # Get demo bookings to calculate demos per educator
    all_demos = await db.demo_bookings.find({}, {"_id": 0}).to_list(10000)
    demos_in_period = []
    for demo in all_demos:
        created = parse_date_field(demo.get('created_at'))
        if created and start <= created <= end:
            demos_in_period.append(demo)
    
    # Calculate demos per active educator
    educator_demo_count = {}
    for demo in demos_in_period:
        edu_id = demo.get('educator_id')
        if edu_id:
            educator_demo_count[edu_id] = educator_demo_count.get(edu_id, 0) + 1
    
    total_demos = sum(educator_demo_count.values())
    active_count = len(all_active)
    avg_demos_per_educator = round(total_demos / active_count, 1) if active_count > 0 else 0
    
    # Calculate earnings per educator (simplified)
    # Assuming each completed demo has a fixed earning or from demo_bookings
    demo_earning = 500  # Default earning per demo
    total_earnings = total_demos * demo_earning
    avg_earnings = round(total_earnings / active_count, 0) if active_count > 0 else 0
    
    # Status breakdown
    status_breakdown = {}
    for edu in new_educators:
        status = edu.get('status', 'new')
        status_breakdown[status] = status_breakdown.get(status, 0) + 1
    
    # Top performers (by demo count)
    top_educators = []
    for edu in all_active[:10]:
        demo_count = educator_demo_count.get(edu.get('id'), 0)
        if demo_count > 0:
            top_educators.append({
                "name": edu.get('name'),
                "demos": demo_count,
                "earnings": demo_count * demo_earning
            })
    top_educators.sort(key=lambda x: -x['demos'])
    
    return {
        "summary": {
            "new_educators": len(new_educators),
            "total_active": active_count,
            "avg_demos_per_educator": avg_demos_per_educator,
            "avg_earnings_per_educator": avg_earnings,
            "total_demos_conducted": total_demos,
        },
        "by_status": [{"name": k, "count": v} for k, v in sorted(status_breakdown.items(), key=lambda x: -x[1])],
        "top_performers": top_educators[:5],
        "period": {"start": start.isoformat(), "end": end.isoformat()}
    }

@router.get("/admin/reports/support-metrics")
async def get_support_metrics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get support query metrics"""
    start, end = get_date_range(start_date, end_date, period)
    
    # Get support queries with date filter in query (optimized)
    query_filter = {}
    if start and end:
        query_filter["created_at"] = {"$gte": start.isoformat(), "$lte": end.isoformat()}
    
    all_queries = await db.support_queries.find(query_filter, {"_id": 0}).to_list(5000)
    queries = []
    for q in all_queries:
        created = parse_date_field(q.get('created_at'))
        if created and start <= created <= end:
            queries.append(q)
    
    total = len(queries)
    
    # Status breakdown
    new_queries = len([q for q in queries if q.get('status') == 'new'])
    open_queries = len([q for q in queries if q.get('status') in ['new', 'open', 'in_progress']])
    resolved_queries = len([q for q in queries if q.get('status') in ['resolved', 'closed']])
    
    # Query type breakdown
    query_types = {}
    for q in queries:
        qtype = q.get('query_type') or q.get('category', 'General')
        query_types[qtype] = query_types.get(qtype, 0) + 1
    
    # Calculate average resolution time (for resolved queries)
    resolution_times = []
    for q in queries:
        if q.get('status') in ['resolved', 'closed']:
            created = parse_date_field(q.get('created_at'))
            resolved = parse_date_field(q.get('resolved_at') or q.get('updated_at'))
            if created and resolved:
                diff = (resolved - created).total_seconds() / 3600  # hours
                resolution_times.append(diff)
    
    avg_resolution_time = round(sum(resolution_times) / len(resolution_times), 1) if resolution_times else 0
    
    # Priority breakdown
    priority_breakdown = {}
    for q in queries:
        priority = q.get('priority', 'normal')
        priority_breakdown[priority] = priority_breakdown.get(priority, 0) + 1
    
    return {
        "summary": {
            "total": total,
            "new": new_queries,
            "open": open_queries,
            "resolved": resolved_queries,
            "avg_resolution_time_hours": avg_resolution_time,
        },
        "by_type": [{"name": k, "count": v} for k, v in sorted(query_types.items(), key=lambda x: -x[1])],
        "by_priority": [{"name": k, "count": v} for k, v in sorted(priority_breakdown.items(), key=lambda x: -x[1])],
        "period": {"start": start.isoformat(), "end": end.isoformat()}
    }

@router.get("/admin/reports/user-stages")
async def get_user_stages_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get all user types and their stages"""
    start, end = get_date_range(start_date, end_date, period)
    
    def is_in_range(item):
        created = parse_date_field(item.get('created_at'))
        if created is None:
            return True  # Include items without dates
        return start <= created <= end
    
    # Students
    all_students = await db.student_inquiries.find({}, {"_id": 0}).to_list(10000)
    students = [s for s in all_students if is_in_range(s)]
    
    student_stages = {}
    for s in students:
        stage = s.get('status', 'new')
        student_stages[stage] = student_stages.get(stage, 0) + 1
    
    # Schools
    all_schools = await db.school_inquiries.find({}, {"_id": 0}).to_list(10000)
    schools = [s for s in all_schools if is_in_range(s)]
    
    school_stages = {}
    for s in schools:
        stage = s.get('status', 'new')
        school_stages[stage] = school_stages.get(stage, 0) + 1
    
    # Educators
    all_educators = await db.educator_applications.find({}, {"_id": 0}).to_list(10000)
    educators = [e for e in all_educators if is_in_range(e)]
    
    educator_stages = {}
    for e in educators:
        stage = e.get('status', 'new')
        educator_stages[stage] = educator_stages.get(stage, 0) + 1
    
    # Team applications
    all_team = await db.team_applications.find({}, {"_id": 0}).to_list(10000)
    team = [t for t in all_team if is_in_range(t)]
    
    team_stages = {}
    for t in team:
        stage = t.get('status', 'new')
        team_stages[stage] = team_stages.get(stage, 0) + 1
    
    # Growth Partners
    all_gps = await db.growth_partners.find({}, {"_id": 0}).to_list(10000)
    gps = [g for g in all_gps if is_in_range(g)]
    
    gp_stages = {}
    for g in gps:
        stage = g.get('status', 'new')
        gp_stages[stage] = gp_stages.get(stage, 0) + 1
    
    return {
        "students": {
            "total": len(students),
            "stages": [{"name": k, "count": v} for k, v in sorted(student_stages.items(), key=lambda x: -x[1])]
        },
        "schools": {
            "total": len(schools),
            "stages": [{"name": k, "count": v} for k, v in sorted(school_stages.items(), key=lambda x: -x[1])]
        },
        "educators": {
            "total": len(educators),
            "stages": [{"name": k, "count": v} for k, v in sorted(educator_stages.items(), key=lambda x: -x[1])]
        },
        "team": {
            "total": len(team),
            "stages": [{"name": k, "count": v} for k, v in sorted(team_stages.items(), key=lambda x: -x[1])]
        },
        "growth_partners": {
            "total": len(gps),
            "stages": [{"name": k, "count": v} for k, v in sorted(gp_stages.items(), key=lambda x: -x[1])]
        },
        "period": {"start": start.isoformat(), "end": end.isoformat()}
    }

@router.get("/admin/reports/team-member/{user_id}")
async def get_team_member_report(
    user_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get performance report for a specific team member"""
    start, end = get_date_range(start_date, end_date, period)
    
    # Get the team member info
    team_member = await db.team_users.find_one({"id": user_id}, {"_id": 0})
    if not team_member:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    # Get their role
    role = await db.roles.find_one({"id": team_member.get('role_id')}, {"_id": 0})
    role_name = role.get('name', 'Unknown') if role else 'Unknown'
    
    def is_in_range(item):
        created = parse_date_field(item.get('created_at'))
        if created is None:
            return True
        return start <= created <= end
    
    # Calculate metrics based on assigned leads and activities
    # Students assigned
    all_student_leads = await db.student_inquiries.find({"assigned_to": user_id}, {"_id": 0}).to_list(10000)
    student_leads = [s for s in all_student_leads if is_in_range(s)]
    student_converted = len([s for s in student_leads if s.get('status') == 'converted'])
    
    # Schools assigned
    all_school_leads = await db.school_inquiries.find({"assigned_to": user_id}, {"_id": 0}).to_list(10000)
    school_leads = [s for s in all_school_leads if is_in_range(s)]
    school_converted = len([s for s in school_leads if s.get('status') in ['converted', 'active', 'renewed']])
    
    # Schools as RM
    all_rm_schools = await db.school_inquiries.find({"relationship_manager": user_id}, {"_id": 0}).to_list(10000)
    rm_schools = [s for s in all_rm_schools if is_in_range(s)]
    
    # Educators assigned
    all_educator_leads = await db.educator_applications.find({"assigned_to": user_id}, {"_id": 0}).to_list(10000)
    educator_leads = [e for e in all_educator_leads if is_in_range(e)]
    educator_active = len([e for e in educator_leads if e.get('status') == 'active'])
    
    # Support tickets handled
    all_tickets = await db.support_queries.find({"assigned_to": user_id}, {"_id": 0}).to_list(10000)
    tickets = [t for t in all_tickets if is_in_range(t)]
    tickets_resolved = len([t for t in tickets if t.get('status') == 'resolved'])
    
    # Demo bookings facilitated
    all_demos = await db.demo_bookings.find({"assigned_to": user_id}, {"_id": 0}).to_list(10000)
    demos = [d for d in all_demos if is_in_range(d)]
    demos_completed = len([d for d in demos if d.get('status') == 'completed'])
    
    # Calculate conversion rates
    student_conversion_rate = round((student_converted / len(student_leads) * 100) if student_leads else 0, 1)
    school_conversion_rate = round((school_converted / len(school_leads) * 100) if school_leads else 0, 1)
    ticket_resolution_rate = round((tickets_resolved / len(tickets) * 100) if tickets else 0, 1)
    
    return {
        "member": {
            "id": user_id,
            "name": team_member.get('name'),
            "email": team_member.get('email'),
            "role": role_name,
            "city": team_member.get('city', ''),
            "is_active": team_member.get('is_active', True),
            "joined_at": team_member.get('created_at')
        },
        "metrics": {
            "students": {
                "assigned": len(student_leads),
                "converted": student_converted,
                "conversion_rate": student_conversion_rate
            },
            "schools": {
                "assigned": len(school_leads),
                "converted": school_converted,
                "conversion_rate": school_conversion_rate,
                "as_rm": len(rm_schools)
            },
            "educators": {
                "assigned": len(educator_leads),
                "active": educator_active
            },
            "support": {
                "total_tickets": len(tickets),
                "resolved": tickets_resolved,
                "resolution_rate": ticket_resolution_rate
            },
            "demos": {
                "total": len(demos),
                "completed": demos_completed
            }
        },
        "period": {"start": start.isoformat(), "end": end.isoformat()}
    }

@router.get("/admin/reports/b2c-insights")
async def get_b2c_insights(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get B2C (Student) insights - courses, age groups, cities, modes, preferred times"""
    start, end = get_date_range(start_date, end_date, period)
    
    all_students = await db.student_inquiries.find({}, {"_id": 0}).to_list(10000)
    students = []
    for s in all_students:
        created = parse_date_field(s.get('created_at'))
        if created and start <= created <= end:
            students.append(s)
    
    # Course/Skill breakdown
    courses = {}
    for s in students:
        course = s.get('course') or s.get('skill') or s.get('interest') or 'Unknown'
        courses[course] = courses.get(course, 0) + 1
    
    # Age group breakdown
    age_groups = {'Under 6': 0, '6-10': 0, '11-15': 0, '16-18': 0, 'Adult': 0, 'Unknown': 0}
    for s in students:
        age = s.get('age') or s.get('student_age')
        if age:
            try:
                age = int(age)
                if age < 6: age_groups['Under 6'] += 1
                elif age <= 10: age_groups['6-10'] += 1
                elif age <= 15: age_groups['11-15'] += 1
                elif age <= 18: age_groups['16-18'] += 1
                else: age_groups['Adult'] += 1
            except: age_groups['Unknown'] += 1
        else:
            age_groups['Unknown'] += 1
    
    # Learning goal breakdown
    goals = {}
    for s in students:
        goal = s.get('learning_goal') or s.get('goal') or 'Not specified'
        goals[goal] = goals.get(goal, 0) + 1
    
    # City breakdown
    cities = {}
    for s in students:
        city = s.get('city') or 'Unknown'
        cities[city] = cities.get(city, 0) + 1
    
    # Mode breakdown (online/offline)
    modes = {'online': 0, 'offline': 0, 'hybrid': 0, 'unknown': 0}
    for s in students:
        mode = (s.get('preferred_mode') or s.get('mode') or 'unknown').lower()
        if mode in modes:
            modes[mode] += 1
        else:
            modes['unknown'] += 1
    
    # Preferred days (from demo bookings)
    all_demos = await db.demo_bookings.find({}, {"_id": 0}).to_list(10000)
    day_counts = {'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0, 'Friday': 0, 'Saturday': 0, 'Sunday': 0}
    time_slots = {'Morning (9-12)': 0, 'Afternoon (12-4)': 0, 'Evening (4-8)': 0, 'Night (8+)': 0}
    
    for demo in all_demos:
        demo_date = demo.get('scheduled_date') or demo.get('date')
        demo_time = demo.get('scheduled_time') or demo.get('time')
        if demo_date:
            try:
                d = parse_date_field(demo_date)
                if d:
                    day_name = d.strftime('%A')
                    if day_name in day_counts:
                        day_counts[day_name] += 1
            except: pass
        if demo_time:
            try:
                hour = int(demo_time.split(':')[0])
                if 9 <= hour < 12: time_slots['Morning (9-12)'] += 1
                elif 12 <= hour < 16: time_slots['Afternoon (12-4)'] += 1
                elif 16 <= hour < 20: time_slots['Evening (4-8)'] += 1
                else: time_slots['Night (8+)'] += 1
            except: pass
    
    # Calculate revenue
    student_revenue = sum(float(s.get('payment_amount', 0) or 0) for s in students if s.get('status') == 'converted')
    
    return {
        "total_students": len(students),
        "revenue": student_revenue,
        "courses": [{"name": k, "count": v} for k, v in sorted(courses.items(), key=lambda x: -x[1])[:10]],
        "age_groups": [{"name": k, "count": v} for k, v in age_groups.items()],
        "learning_goals": [{"name": k, "count": v} for k, v in sorted(goals.items(), key=lambda x: -x[1])[:8]],
        "cities": [{"name": k, "count": v} for k, v in sorted(cities.items(), key=lambda x: -x[1])[:10]],
        "modes": [{"name": k, "count": v} for k, v in modes.items()],
        "preferred_days": [{"name": k, "count": v} for k, v in day_counts.items()],
        "demo_times": [{"name": k, "count": v} for k, v in time_slots.items()],
        "period": {"start": start.isoformat(), "end": end.isoformat()}
    }

@router.get("/admin/reports/b2b-insights")
async def get_b2b_insights(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get B2B (School) insights - offerings, cities, boards, active schools"""
    start, end = get_date_range(start_date, end_date, period)
    
    all_schools = await db.school_inquiries.find({}, {"_id": 0}).to_list(10000)
    schools = []
    for s in all_schools:
        created = parse_date_field(s.get('created_at'))
        if created and start <= created <= end:
            schools.append(s)
    
    # Status breakdown including active, renewal_meeting, renewed, lost
    status_counts = {}
    for s in all_schools:  # Use all schools for status breakdown
        status = s.get('status', 'unknown')
        status_counts[status] = status_counts.get(status, 0) + 1
    
    active_count = status_counts.get('active', 0)
    renewal_meeting_count = status_counts.get('renewal_meeting', 0)
    renewed_count = status_counts.get('renewed', 0)
    lost_count = status_counts.get('lost', 0)
    converted_count = status_counts.get('converted', 0)
    
    # Offering breakdown
    offerings = {}
    for s in schools:
        selected = s.get('selected_offerings') or []
        if isinstance(selected, list):
            for off in selected:
                offerings[off] = offerings.get(off, 0) + 1
        offering = (s.get('onboarding_data') or {}).get('offering')
        if offering:
            offerings[offering] = offerings.get(offering, 0) + 1
    
    # City breakdown
    cities = {}
    for s in schools:
        city = s.get('city') or 'Unknown'
        cities[city] = cities.get(city, 0) + 1
    
    # Board breakdown
    boards = {}
    for s in schools:
        board = s.get('board') or 'Unknown'
        boards[board] = boards.get(board, 0) + 1
    
    # School type breakdown
    types = {}
    for s in schools:
        school_type = s.get('school_type') or s.get('type') or 'Unknown'
        types[school_type] = types.get(school_type, 0) + 1
    
    # Calculate revenue
    school_revenue = sum(float(s.get('conversion_amount', 0) or s.get('quoted_price', 0) or 0) for s in all_schools if s.get('status') in ['converted', 'active', 'renewed'])
    
    # Calculate renewal ratio: Renewed / (Active + Renewed + Lost)
    renewal_base = active_count + renewed_count + lost_count
    renewal_ratio = round((renewed_count / renewal_base * 100) if renewal_base > 0 else 0, 1)
    
    return {
        "total_schools": len(schools),
        "revenue": school_revenue,
        "active_schools": active_count,
        "renewal_meeting": renewal_meeting_count,
        "renewed": renewed_count,
        "lost": lost_count,
        "converted": converted_count,
        "renewal_ratio": renewal_ratio,
        "status_breakdown": [{"name": k, "count": v} for k, v in sorted(status_counts.items(), key=lambda x: -x[1])],
        "offerings": [{"name": k, "count": v} for k, v in sorted(offerings.items(), key=lambda x: -x[1])[:10]],
        "cities": [{"name": k, "count": v} for k, v in sorted(cities.items(), key=lambda x: -x[1])[:10]],
        "boards": [{"name": k, "count": v} for k, v in sorted(boards.items(), key=lambda x: -x[1])],
        "school_types": [{"name": k, "count": v} for k, v in sorted(types.items(), key=lambda x: -x[1])],
        "period": {"start": start.isoformat(), "end": end.isoformat()}
    }

@router.get("/admin/reports/support-insights")
async def get_support_insights(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get Support insights - resolution time, query types, team member performance"""
    start, end = get_date_range(start_date, end_date, period)
    
    all_queries = await db.support_queries.find({}, {"_id": 0}).to_list(10000)
    queries = []
    for q in all_queries:
        created = parse_date_field(q.get('created_at'))
        if created and start <= created <= end:
            queries.append(q)
    
    # Query type breakdown
    query_types = {}
    for q in queries:
        qtype = q.get('query_type') or q.get('type') or q.get('category') or 'General'
        query_types[qtype] = query_types.get(qtype, 0) + 1
    
    # Status breakdown
    status_counts = {'open': 0, 'in_progress': 0, 'resolved': 0, 'closed': 0}
    for q in queries:
        status = q.get('status', 'open').lower()
        if status in status_counts:
            status_counts[status] += 1
        else:
            status_counts['open'] += 1
    
    # Calculate resolution times
    resolution_times = []
    for q in queries:
        if q.get('status') in ['resolved', 'closed'] and q.get('resolved_at'):
            created = parse_date_field(q.get('created_at'))
            resolved = parse_date_field(q.get('resolved_at'))
            if created and resolved:
                delta = (resolved - created).total_seconds() / 3600  # Hours
                resolution_times.append(delta)
    
    avg_resolution_time = round(sum(resolution_times) / len(resolution_times), 1) if resolution_times else 0
    
    # Team member performance
    team_performance = {}
    team_users = await db.team_users.find({}, {"_id": 0}).to_list(1000)
    user_names = {u['id']: u.get('name', 'Unknown') for u in team_users}
    
    for q in queries:
        assigned = q.get('assigned_to')
        if assigned:
            if assigned not in team_performance:
                team_performance[assigned] = {'name': user_names.get(assigned, 'Unknown'), 'total': 0, 'resolved': 0}
            team_performance[assigned]['total'] += 1
            if q.get('status') in ['resolved', 'closed']:
                team_performance[assigned]['resolved'] += 1
    
    # Calculate resolution rates for each team member
    team_stats = []
    for uid, data in team_performance.items():
        resolution_rate = round((data['resolved'] / data['total'] * 100) if data['total'] > 0 else 0, 1)
        team_stats.append({
            'user_id': uid,
            'name': data['name'],
            'total': data['total'],
            'resolved': data['resolved'],
            'resolution_rate': resolution_rate
        })
    team_stats.sort(key=lambda x: -x['resolved'])
    
    # Priority breakdown
    priority_counts = {'high': 0, 'medium': 0, 'low': 0}
    for q in queries:
        priority = (q.get('priority') or 'medium').lower()
        if priority in priority_counts:
            priority_counts[priority] += 1
        else:
            priority_counts['medium'] += 1
    
    # Source breakdown
    source_counts = {}
    for q in queries:
        source = q.get('source') or q.get('user_type') or 'Unknown'
        source_counts[source] = source_counts.get(source, 0) + 1
    
    return {
        "total_queries": len(queries),
        "resolved": status_counts['resolved'] + status_counts['closed'],
        "pending": status_counts['open'] + status_counts['in_progress'],
        "avg_resolution_time_hours": avg_resolution_time,
        "query_types": [{"name": k, "count": v} for k, v in sorted(query_types.items(), key=lambda x: -x[1])],
        "status_breakdown": [{"name": k, "count": v} for k, v in status_counts.items()],
        "priority_breakdown": [{"name": k, "count": v} for k, v in priority_counts.items()],
        "source_breakdown": [{"name": k, "count": v} for k, v in sorted(source_counts.items(), key=lambda x: -x[1])],
        "team_performance": team_stats[:10],
        "period": {"start": start.isoformat(), "end": end.isoformat()}
    }




# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC REPORT LINK MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────

from pydantic import BaseModel
import bcrypt
import uuid

class PublicReportLinkCreate(BaseModel):
    password: str

class PublicReportPasswordVerify(BaseModel):
    password: str

class PublicReportPasswordUpdate(BaseModel):
    new_password: str


@router.post("/admin/reports/public-link")
async def create_or_update_public_link(
    data: PublicReportLinkCreate,
    user: dict = Depends(get_current_user)
):
    """Create or update the public report link with password"""
    if not data.password or len(data.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    
    # Hash the password
    password_hash = bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Check if a public link already exists
    existing = await db.public_report_links.find_one({})
    
    if existing:
        # Update existing link
        await db.public_report_links.update_one(
            {"id": existing["id"]},
            {"$set": {
                "password_hash": password_hash,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user.get("email")
            }}
        )
        token = existing["token"]
    else:
        # Create new link
        token = str(uuid.uuid4())[:8]  # Short token for URL
        new_link = {
            "id": str(uuid.uuid4()),
            "token": token,
            "password_hash": password_hash,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user.get("email"),
            "is_active": True
        }
        await db.public_report_links.insert_one(new_link)
    
    return {
        "success": True,
        "token": token,
        "message": "Public report link created/updated successfully"
    }


@router.get("/admin/reports/public-link")
async def get_public_link_info(
    user: dict = Depends(get_current_user)
):
    """Get current public report link info (without password)"""
    link = await db.public_report_links.find_one({}, {"_id": 0, "password_hash": 0})
    
    if not link:
        return {"exists": False}
    
    return {
        "exists": True,
        "token": link.get("token"),
        "is_active": link.get("is_active", True),
        "created_at": link.get("created_at"),
        "updated_at": link.get("updated_at"),
        "created_by": link.get("created_by")
    }


@router.patch("/admin/reports/public-link/password")
async def update_public_link_password(
    data: PublicReportPasswordUpdate,
    user: dict = Depends(get_current_user)
):
    """Update the password for public report link"""
    if not data.new_password or len(data.new_password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    
    link = await db.public_report_links.find_one({})
    if not link:
        raise HTTPException(status_code=404, detail="No public link exists. Create one first.")
    
    password_hash = bcrypt.hashpw(data.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    await db.public_report_links.update_one(
        {"id": link["id"]},
        {"$set": {
            "password_hash": password_hash,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user.get("email")
        }}
    )
    
    return {"success": True, "message": "Password updated successfully"}


@router.delete("/admin/reports/public-link")
async def delete_public_link(
    user: dict = Depends(get_current_user)
):
    """Delete the public report link"""
    result = await db.public_report_links.delete_many({})
    return {"success": True, "deleted": result.deleted_count}


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC REPORT ACCESS (No Admin Auth Required)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/public/reports/{token}/verify")
async def verify_public_report_access(
    token: str,
    data: PublicReportPasswordVerify
):
    """Verify password for public report access"""
    link = await db.public_report_links.find_one({"token": token})
    
    if not link:
        raise HTTPException(status_code=404, detail="Invalid report link")
    
    if not link.get("is_active", True):
        raise HTTPException(status_code=403, detail="This report link has been disabled")
    
    # Verify password
    if not bcrypt.checkpw(data.password.encode('utf-8'), link["password_hash"].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid password")
    
    # Generate a short-lived access token (valid for 24 hours)
    import jwt
    import os
    
    secret = os.environ.get("JWT_SECRET", "your-secret-key")
    access_token = jwt.encode(
        {
            "type": "public_report",
            "token": token,
            "exp": datetime.now(timezone.utc) + timedelta(hours=24)
        },
        secret,
        algorithm="HS256"
    )
    
    return {
        "success": True,
        "access_token": access_token,
        "expires_in": 86400  # 24 hours in seconds
    }


async def verify_public_report_token(authorization: str = None):
    """Verify the public report access token"""
    import jwt
    import os
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    secret = os.environ.get("JWT_SECRET", "your-secret-key")
    
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        if payload.get("type") != "public_report":
            raise HTTPException(status_code=401, detail="Invalid token type")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/public/reports/{token}/data")
async def get_public_report_data(
    token: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = None,
    authorization: str = Query(None, alias="auth")
):
    """Get public report data (with sensitive info masked)"""
    # Verify access
    await verify_public_report_token(f"Bearer {authorization}")
    
    # Verify link exists and is active
    link = await db.public_report_links.find_one({"token": token})
    if not link or not link.get("is_active", True):
        raise HTTPException(status_code=403, detail="Report link is invalid or disabled")
    
    start, end = get_date_range(start_date, end_date, period)
    
    # ── Fetch all data (reusing existing logic) ──
    
    # Students
    all_students = await db.student_inquiries.find({}, {"_id": 0}).to_list(10000)
    students = []
    for s in all_students:
        created = parse_date_field(s.get('created_at'))
        if created and start <= created <= end:
            students.append(s)
    
    # Schools
    all_schools = await db.school_inquiries.find({}, {"_id": 0}).to_list(10000)
    schools = []
    for s in all_schools:
        created = parse_date_field(s.get('created_at'))
        if created and start <= created <= end:
            schools.append(s)
    
    # Educators
    all_educators = await db.educator_applications.find({}, {"_id": 0}).to_list(10000)
    educators = []
    for e in all_educators:
        created = parse_date_field(e.get('created_at'))
        if created and start <= created <= end:
            educators.append(e)
    
    # Team
    all_team = await db.team_applications.find({}, {"_id": 0}).to_list(10000)
    team = [t for t in all_team if parse_date_field(t.get('created_at')) and start <= parse_date_field(t.get('created_at')) <= end]
    
    # Growth Partners
    all_gps = await db.growth_partners.find({}, {"_id": 0}).to_list(10000)
    gps = [g for g in all_gps if parse_date_field(g.get('created_at')) and start <= parse_date_field(g.get('created_at')) <= end]
    
    # Support queries
    all_support = await db.support_queries.find({}, {"_id": 0}).to_list(10000)
    support = []
    for q in all_support:
        created = parse_date_field(q.get('created_at'))
        if created and start <= created <= end:
            support.append(q)
    
    # Expenses
    all_expenses = await db.expenses.find({}, {"_id": 0}).to_list(10000)
    expenses = []
    for e in all_expenses:
        exp_date = e.get('date')
        if exp_date:
            try:
                if isinstance(exp_date, str):
                    exp_dt = datetime.strptime(exp_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                else:
                    exp_dt = exp_date
                if start <= exp_dt <= end:
                    expenses.append(e)
            except:
                pass
    
    # ── Calculate Overview Metrics ──
    
    # Student metrics
    total_students = len(students)
    paid_students = len([s for s in students if s.get('status') == 'converted' or s.get('payment_status') == 'paid'])
    student_revenue = sum(float(s.get('conversion_amount') or s.get('amount_paid') or 0) for s in students if s.get('status') == 'converted' or s.get('payment_status') == 'paid')
    
    # School metrics
    total_schools = len(schools)
    converted_schools = len([s for s in schools if s.get('status') == 'converted'])
    active_schools = len([s for s in all_schools if s.get('status') == 'active'])
    renewed_schools = len([s for s in all_schools if s.get('status') == 'renewed'])
    lost_schools = len([s for s in all_schools if s.get('status') in ['lost', 'lost_lead', 'lost_customer']])
    school_revenue = sum(float(s.get('conversion_amount') or (s.get('onboarding_data') or {}).get('total_amount') or 0) for s in all_schools if s.get('status') in ['converted', 'active', 'renewed'])
    
    # Educator metrics
    total_educators = len(educators)
    active_educators = len([e for e in educators if e.get('status') == 'active'])
    
    # Team metrics
    team_total = len(team)
    team_hired = len([t for t in team if t.get('status') == 'hired'])
    
    # GP metrics
    gp_total = len(gps)
    gp_converted = len([g for g in gps if g.get('status') == 'converted'])
    
    # Support metrics
    support_total = len(support)
    support_resolved = len([q for q in support if q.get('status') in ['resolved', 'closed']])
    
    # Expense metrics
    total_expenses = sum(float(e.get('amount') or 0) for e in expenses)
    expenses_by_category = {}
    for e in expenses:
        cat = e.get('category') or 'Other'
        expenses_by_category[cat] = expenses_by_category.get(cat, 0) + float(e.get('amount') or 0)
    
    # Total revenue and profit
    total_revenue = student_revenue + school_revenue
    net_profit = total_revenue - total_expenses
    
    # ── Stage Breakdowns ──
    
    def get_stage_breakdown(items, default_status='new'):
        stages = {}
        for item in items:
            stage = item.get('status', default_status)
            stages[stage] = stages.get(stage, 0) + 1
        return [{"name": k, "count": v} for k, v in sorted(stages.items(), key=lambda x: -x[1])]
    
    # ── Build Response (No sensitive data) ──
    
    return {
        "overview": {
            "total_revenue": total_revenue,
            "student_revenue": student_revenue,
            "school_revenue": school_revenue,
            "total_expenses": total_expenses,
            "net_profit": net_profit,
            "paid_students": paid_students,
            "converted_schools": converted_schools,
            "active_educators": active_educators,
        },
        "students": {
            "total": total_students,
            "stages": get_stage_breakdown(students),
            "new": len([s for s in students if s.get('status') == 'new']),
            "demo_scheduled": len([s for s in students if s.get('status') == 'demo_scheduled']),
            "demo_completed": len([s for s in students if s.get('status') == 'demo_completed']),
            "converted": paid_students,
        },
        "schools": {
            "total": total_schools,
            "stages": get_stage_breakdown(schools),
            "new": len([s for s in schools if s.get('status') == 'new']),
            "meeting_done": len([s for s in schools if s.get('status') == 'meeting_done']),
            "converted": converted_schools,
            "active": active_schools,
            "renewed": renewed_schools,
            "lost": lost_schools,
        },
        "educators": {
            "total": total_educators,
            "stages": get_stage_breakdown(educators),
            "new": len([e for e in educators if e.get('status') == 'new']),
            "demo_scheduled": len([e for e in educators if e.get('status') == 'demo_scheduled']),
            "onboarding": len([e for e in educators if e.get('status') == 'onboarding']),
            "active": active_educators,
        },
        "team": {
            "total": team_total,
            "stages": get_stage_breakdown(team),
            "hired": team_hired,
        },
        "growth_partners": {
            "total": gp_total,
            "stages": get_stage_breakdown(gps),
            "converted": gp_converted,
        },
        "support": {
            "total": support_total,
            "stages": get_stage_breakdown(support, 'open'),
            "resolved": support_resolved,
            "pending": support_total - support_resolved,
        },
        "expenses": {
            "total": total_expenses,
            "by_category": [{"name": k, "amount": v} for k, v in sorted(expenses_by_category.items(), key=lambda x: -x[1])],
        },
        "period": {
            "start": start.isoformat(),
            "end": end.isoformat(),
        }
    }
