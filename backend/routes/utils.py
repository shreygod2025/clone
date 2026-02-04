# Shared utilities for route handlers
from datetime import datetime, timezone, timedelta
from typing import Optional

def get_date_range(start_date: Optional[str], end_date: Optional[str], period: Optional[str]):
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
        # Default to all time
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
    if isinstance(date_val, str):
        try:
            # Handle ISO format with Z
            dt = datetime.fromisoformat(date_val.replace('Z', '+00:00'))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except:
            pass
        try:
            # Handle simple date format
            dt = datetime.strptime(date_val, "%Y-%m-%d")
            return dt.replace(tzinfo=timezone.utc)
        except:
            pass
        try:
            # Handle datetime without timezone
            dt = datetime.strptime(date_val, "%Y-%m-%dT%H:%M:%S")
            return dt.replace(tzinfo=timezone.utc)
        except:
            pass
    return None
