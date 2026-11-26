"""
Content & Support Schemas (Blog, FAQ, Support Ticket, About)
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr

class BlogCreate(BaseModel):
    title: str
    slug: str
    content: str
    summary: Optional[str] = ""
    featured_image: Optional[str] = None
    author: Optional[str] = "OLL Team"
    tags: List[str] = []
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None

class BlogUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    featured_image: Optional[str] = None
    is_published: Optional[bool] = None
    tags: Optional[List[str]] = None

class BlogResponse(BaseModel):
    id: str
    title: str
    slug: str
    summary: str
    author: str
    is_published: bool
    published_at: datetime

class FAQCreate(BaseModel):
    question: str
    answer: str
    category: Optional[str] = "general"
    order: Optional[int] = 0

class FAQUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None

class FAQResponse(BaseModel):
    id: str
    question: str
    answer: str
    category: str
    is_active: bool

class SupportTicketCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    subject: str
    query_type: Optional[str] = "General"
    description: str
    priority: Optional[str] = "medium"

class SupportTicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None

class SupportTicketResponse(BaseModel):
    id: str
    name: str
    subject: str
    status: str
    priority: str
    created_at: datetime

class AboutContentUpdate(BaseModel):
    vision: Optional[str] = None
    mission: Optional[str] = None
    founders_note: Optional[str] = None
    team_members: Optional[List[Dict[str, Any]]] = None
    stats: Optional[Dict[str, Any]] = None
