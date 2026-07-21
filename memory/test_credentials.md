# Test Credentials

## Admin (Super Admin)
- Email: `admin@oll.co`
- Password: `Dagaji03@`
- Role: `admin` (full access)
- Used for: All admin CRM/dashboard testing, /admin/students Friendship Day tab

## Public (Friendship Day)
- No auth needed. Public endpoints:
  - GET  /api/friendship-day/catalog
  - POST /api/friendship-day/register
  - POST /api/friendship-day/initiate-payment
  - GET  /api/friendship-day/verify/{order_id}
