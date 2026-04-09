# Test Credentials

## Admin
- Email: admin@oll.co
- Password: Dagaji03@
- URL: /admin (redirect to /admin/dashboard)
- Role: Full Admin

## Test Notes
- Summer Camp admin section: /admin/students → click "Summer Camp" tab
- Summer Camp parent login: /login → "Summer Camp Parent" option → phone + OTP (OTP sent via AiSensy WhatsApp)
- 32+ test bookings in summer_camp_bookings collection
- To test Summer Camp login, a booking must have crm_status: "converted" or "payment_offline"
- Cash payment bookings auto-set crm_status: "payment_offline"
