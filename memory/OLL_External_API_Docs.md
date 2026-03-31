# OLL Schools External API — Integration Guide

**Base URL:** `https://neon-camp-book.preview.emergentagent.com`  
**Version:** v1  
**Last Updated:** March 2026

---

## Authentication

Every request must include an API key in the request header.

```
X-API-Key: oll_sk_your_key_here
```

> **Get your key**: Log in to the OLL Admin Panel → Settings → API Keys → click the copy icon next to your key.  
> **Important**: The URL **must** include `/api` — e.g. `.../api/external/schools/active`. Requests to `.../external/schools/active` (without `/api`) will return the website HTML, not JSON data.

---

## Endpoints

### 1. Active Partner Schools (Flat Format)

Returns a simple flat list of all active OLL partner schools (status: `active`, `converted`, or `renewed`). Best for maps, directories, and simple integrations.

```
GET /api/external/schools/active
```

**Query Parameters**

| Parameter | Type   | Required | Description                        |
|-----------|--------|----------|------------------------------------|
| `city`    | string | No       | Filter schools by city (partial match, case-insensitive) |
| `limit`   | int    | No       | Max records to return (default 500, max 1000) |

**Example Request**
```bash
curl -H "X-API-Key: oll_sk_your_key_here" \
  "https://neon-camp-book.preview.emergentagent.com/api/external/schools/active"
```

**Example Response**
```json
{
  "count": 19,
  "generated_at": "2026-03-26T08:00:00Z",
  "schools": [
    {
      "school_name": "Delhi Public School",
      "address": "Sector 45, Gurugram, Haryana",
      "city": "Gurugram",
      "state": "Haryana",
      "latitude": 28.4595,
      "longitude": 77.0266,
      "contact_person": "Ramesh Kumar",
      "contact_phone": "9876543210",
      "contact_email": "principal@dps.edu",
      "board": "CBSE",
      "status": "active"
    }
  ]
}
```

---

### 2. All Schools (Full Format, Paginated)

Returns all schools in the CRM with full details including relationship manager info, location coordinates, and school details. Supports filtering by status and city.

```
GET /api/external/schools
```

**Query Parameters**

| Parameter | Type   | Required | Default | Description |
|-----------|--------|----------|---------|-------------|
| `status`  | string | No       | all     | Filter by stage. See [Status Values](#status-values) below. |
| `city`    | string | No       | —       | Filter by city (partial match) |
| `limit`   | int    | No       | 100     | Records per page (max 500) |
| `offset`  | int    | No       | 0       | Pagination offset |

**Status Values**

| Value              | Meaning                              |
|--------------------|--------------------------------------|
| `new`              | Lead just added                      |
| `meeting_done`     | First meeting completed              |
| `converted`        | School signed up / deal closed       |
| `active`           | Currently running the OLL program    |
| `renewal_meeting`  | Renewal discussion in progress       |
| `renewed`          | Contract renewed                     |
| `follow_up`        | Pending follow-up                    |
| `lost`             | Deal lost                            |
| `archived`         | Archived / inactive                  |

**Example Request**
```bash
# Get all active schools
curl -H "X-API-Key: oll_sk_your_key_here" \
  "https://neon-camp-book.preview.emergentagent.com/api/external/schools?status=active&limit=50"

# Paginate — next page
curl -H "X-API-Key: oll_sk_your_key_here" \
  "https://neon-camp-book.preview.emergentagent.com/api/external/schools?status=active&limit=50&offset=50"
```

**Example Response**
```json
{
  "data": [
    {
      "id": "09dcd297-f09a-4f16-a8eb-e52747b8d46c",
      "school_name": "Delhi Public School",
      "status": "active",
      "stage": "active",
      "contact": {
        "name": "Ramesh Kumar",
        "phone": "9876543210",
        "email": "principal@dps.edu",
        "designation": "Principal"
      },
      "location": {
        "city": "Gurugram",
        "state": "Haryana",
        "address": "Sector 45, Gurugram",
        "area": null,
        "latitude": 28.4595,
        "longitude": 77.0266,
        "geofence_radius": 500
      },
      "relationship_manager": {
        "id": "rm-uuid",
        "name": "Priya Sharma",
        "email": "priya@oll.co",
        "phone": "9123456789"
      },
      "school_details": {
        "board": "CBSE",
        "student_count": 1200,
        "type": "Private"
      },
      "created_at": "2025-06-01T10:00:00Z",
      "updated_at": "2026-01-15T14:30:00Z",
      "converted_at": "2025-08-10T09:00:00Z"
    }
  ],
  "pagination": {
    "total": 85,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

---

### 3. Get School by ID

Returns full details for a single school.

```
GET /api/external/schools/{school_id}
```

**Path Parameter**

| Parameter   | Type   | Description                       |
|-------------|--------|-----------------------------------|
| `school_id` | string | UUID of the school (from the `id` field in list responses) |

**Example Request**
```bash
curl -H "X-API-Key: oll_sk_your_key_here" \
  "https://neon-camp-book.preview.emergentagent.com/api/external/schools/09dcd297-f09a-4f16-a8eb-e52747b8d46c"
```

**Example Response**
```json
{
  "id": "09dcd297-f09a-4f16-a8eb-e52747b8d46c",
  "school_name": "Delhi Public School",
  "status": "active",
  "contact": {
    "name": "Ramesh Kumar",
    "phone": "9876543210",
    "email": "principal@dps.edu",
    "designation": "Principal"
  },
  "location": {
    "city": "Gurugram",
    "state": "Haryana",
    "address": "Sector 45, Gurugram",
    "latitude": 28.4595,
    "longitude": 77.0266
  },
  "relationship_manager": {
    "name": "Priya Sharma",
    "email": "priya@oll.co",
    "phone": "9123456789"
  },
  "school_details": {
    "board": "CBSE",
    "student_count": 1200,
    "type": "Private"
  },
  "additional_contacts": [],
  "created_at": "2025-06-01T10:00:00Z",
  "updated_at": "2026-01-15T14:30:00Z",
  "converted_at": "2025-08-10T09:00:00Z"
}
```

---

### 4. Summary Statistics

Returns a count of schools grouped by status — useful for dashboards.

```
GET /api/external/schools/stats/summary
```

**Example Request**
```bash
curl -H "X-API-Key: oll_sk_your_key_here" \
  "https://neon-camp-book.preview.emergentagent.com/api/external/schools/stats/summary"
```

**Example Response**
```json
{
  "total_schools": 134,
  "by_status": {
    "active": 42,
    "converted": 18,
    "renewed": 9,
    "new": 31,
    "meeting_done": 15,
    "lost": 12,
    "follow_up": 7
  },
  "generated_at": "2026-03-26T08:00:00Z"
}
```

---

## Error Responses

| HTTP Code | Meaning                              | Example body                                |
|-----------|--------------------------------------|---------------------------------------------|
| `401`     | Missing or invalid API key           | `{"detail": "Invalid or inactive API key"}` |
| `403`     | Key is inactive / revoked            | `{"detail": "API key is inactive"}`         |
| `404`     | School ID not found                  | `{"detail": "School not found"}`            |
| `422`     | Invalid query parameter              | Validation error details                    |
| `500`     | Server error                         | `{"detail": "Internal server error"}`       |

> If you receive **HTML instead of JSON**, you are missing the `/api` prefix in the URL.  
> ❌ Wrong: `.../external/schools/active`  
> ✅ Correct: `.../api/external/schools/active`

---

## Quick Start (Python)

```python
import requests

BASE_URL = "https://neon-camp-book.preview.emergentagent.com"
API_KEY  = "oll_sk_your_key_here"   # replace with your actual key

headers = {"X-API-Key": API_KEY}

# Get all active schools
response = requests.get(f"{BASE_URL}/api/external/schools/active", headers=headers)
data = response.json()

print(f"Total active schools: {data['count']}")
for school in data["schools"]:
    print(f"  {school['school_name']} — {school['city']}")
```

---

## Quick Start (JavaScript / Node)

```javascript
const BASE_URL = "https://neon-camp-book.preview.emergentagent.com";
const API_KEY  = "oll_sk_your_key_here";   // replace with your actual key

const res = await fetch(`${BASE_URL}/api/external/schools/active`, {
  headers: { "X-API-Key": API_KEY }
});
const data = await res.json();

console.log(`Total active schools: ${data.count}`);
data.schools.forEach(s => console.log(`${s.school_name} — ${s.city}`));
```

---

## Rate Limits & Notes

- No hard rate limit currently, but please cache responses when possible.
- All timestamps are in **UTC ISO 8601** format.
- `latitude` / `longitude` may be `null` if the school's location hasn't been geo-coded yet.
- The `geofence_radius` field is in metres (default 500m).
- For the highest freshness, call the API **on demand** rather than caching for more than 24 hours.

---

*For API key issues or to request additional fields, contact the OLL tech team.*
