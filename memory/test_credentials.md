# Test Credentials

## Admin (Super Admin)
- Email: `admin@oll.co`
- Password: `OllistheBest@2026`
- Role: `admin` (full access)
- Used for: All admin CRM/dashboard testing, /admin/students Friendship Day tab


## Future Skills Centre Owner (scoped login)
- Any centre with `owner_email` + `owner_password` set in the admin's
  Centres tab becomes a login that only sees its own centre's data.
- Role: `fs_center_owner` — locked to `/admin/future-skills`, sidebar hides all
  other admin pages, Centres/Batches management tab is hidden.
- Backend enforces scope via `_fs_scope_center_id(user)` on every future-skills
  admin endpoint.

## Public (Friendship Day)
- No auth needed. Public endpoints:
  - GET  /api/friendship-day/catalog
  - POST /api/friendship-day/register
  - POST /api/friendship-day/initiate-payment
  - GET  /api/friendship-day/verify/{order_id}
