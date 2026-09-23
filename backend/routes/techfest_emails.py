"""Techfest × OLL Robotics Championship — email templates.

Two templates:
  1. `techfest_school_invite`   — outreach email to a school (invite to register)
  2. `techfest_registration_confirmed` — post-registration confirmation with
     kit info and next steps.

Uses inline CSS + hosted OLL and Techfest logos so it renders in Gmail/Outlook.
"""
from typing import Optional

# Both logos are already served from /app/frontend/public/techfest and OLL's asset host.
OLL_LOGO_URL = "https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png"
# Served from the preview app (production URL 404s the logo until the next deploy).
TECHFEST_LOGO_URL = "https://camp-lead-capture.preview.emergentagent.com/techfest/techfest-iitb-logo-email.png"

CAMPAIGN_URL = "https://eventmate-19.emergent.host/techfest"
REGISTER_URL = "https://eventmate-19.emergent.host/techfest/register"
PROBLEM_STATEMENT_URL = "https://eventmate-19.emergent.host/techfest/problem-statement.pdf"
PARENT_CIRCULAR_URL = "https://eventmate-19.emergent.host/techfest/parent-circular.docx"
WHATSAPP_URL = "https://chat.whatsapp.com/L3QZmVcVxbxEugCCDTQxzr"
SUMO_KIT_URL = "https://eventmate-19.emergent.host/shop/product/robo-sumo-kit-specially-for-techfest-iit-bombay-22b5228a"
RACER_KIT_URL = "https://eventmate-19.emergent.host/shop/product/robo-racer-kit-specially-made-for-iit-bombay-8bf545dc"
TECHFEST_SUPPORT_EMAIL = "techfest@oll.co"


def _shell(title: str, preheader: str, body_html: str) -> str:
    """Wrap body in the shared email shell (header + footer + OLL branding)."""
    return f"""<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;color:#0A1F44;">
<span style="display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">{preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
  <tr><td align="center">
    <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.08);">
      <!-- Header — OLL × Techfest lockup on a clean white background (dark-text logos need light bg) -->
      <tr>
        <td style="background:#ffffff;padding:22px 28px;border-bottom:4px solid #DC2626;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;">
                <img src="{OLL_LOGO_URL}" alt="OLL" height="48" style="height:48px;display:inline-block;vertical-align:middle;" />
                <span style="display:inline-block;width:1px;height:44px;background:#e2e8f0;margin:0 16px;vertical-align:middle;"></span>
                <img src="{TECHFEST_LOGO_URL}" alt="Techfest IIT Bombay" height="52" style="height:52px;display:inline-block;vertical-align:middle;" />
              </td>
              <td align="right" style="vertical-align:middle;">
                <span style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#DC2626;">Championship 2026</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <!-- Body -->
      <tr><td style="padding:32px 28px 8px 28px;color:#0A1F44;line-height:1.55;">{body_html}</td></tr>
      <!-- Footer -->
      <tr>
        <td style="background:#0A1F44;color:#cbd5e1;padding:22px 28px;font-size:12px;line-height:1.6;">
          <div><strong style="color:#fff;">OLL × Techfest IIT Bombay 2026</strong></div>
          <div style="margin-top:4px;">Grand Finale · 17 December 2026 · IIT Bombay Campus</div>
          <div style="margin-top:12px;">
            <a href="{CAMPAIGN_URL}" style="color:#FCA5A5;text-decoration:none;">Campaign page</a> &nbsp;·&nbsp;
            <a href="{PROBLEM_STATEMENT_URL}" style="color:#FCA5A5;text-decoration:none;">Problem Statement (PDF)</a> &nbsp;·&nbsp;
            <a href="{WHATSAPP_URL}" style="color:#FCA5A5;text-decoration:none;">WhatsApp community</a>
          </div>
          <div style="margin-top:14px;color:#94a3b8;">You&apos;re receiving this because you (or someone at your school) reached out to OLL about the Championship. Reach us at <a href="mailto:techfest@oll.co" style="color:#FCA5A5;text-decoration:none;">techfest@oll.co</a>.</div>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>"""


def school_invite_html(school_name: Optional[str] = None) -> str:
    greeting = f"Dear {school_name} team," if school_name else "Dear Principal / Coordinator,"
    body = f"""
      <div style="font-size:11px;font-weight:800;letter-spacing:0.28em;text-transform:uppercase;color:#DC2626;">Invitation to Register</div>
      <h1 style="font-size:26px;line-height:1.2;margin:6px 0 8px 0;color:#0A1F44;">Bring your school to the OLL Robotics Championship, Techfest IIT Bombay 2026.</h1>
      <p style="font-size:15px;color:#334155;margin:0 0 16px 0;">{greeting}</p>
      <p style="font-size:15px;color:#334155;margin:0 0 16px 0;">
        We&rsquo;re inviting your school to participate in India&rsquo;s most prestigious school robotics event — the
        <strong>OLL Robotics Championship</strong>, held in partnership with <strong>Techfest, IIT Bombay</strong>.
        This is a landmark opportunity for your students to build, compete and represent your institution on a national stage.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:8px 0 20px 0;">
        <tr><td style="padding:16px 18px;">
          <div style="font-size:11px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Three tracks · one stage</div>
          <ul style="margin:0;padding:0 0 0 18px;color:#0A1F44;font-size:14px;line-height:1.7;">
            <li><strong>RoboSumo</strong> — 1v1 arena knockouts (teams of 3–5)</li>
            <li><strong>RoboRacer</strong> — 2 parallel-lane speed duel (teams of 3–5)</li>
            <li><strong>Robotics Innovation Challenge</strong> — Junior (4–7) &amp; Senior (8–12) prototype pitch</li>
          </ul>
        </td></tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td width="50%" style="padding-right:6px;">
            <table role="presentation" width="100%" style="background:#fff5f5;border:1px solid #fecaca;border-radius:12px;">
              <tr><td style="padding:14px 16px;">
                <div style="font-size:11px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:#DC2626;">Prize Pool</div>
                <div style="font-size:22px;font-weight:800;color:#0A1F44;margin-top:4px;">Upto ₹1,50,000</div>
                <div style="font-size:12px;color:#64748b;margin-top:2px;">Awarded across the top 3 teams of each track.</div>
              </td></tr>
            </table>
          </td>
          <td width="50%" style="padding-left:6px;">
            <table role="presentation" width="100%" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;">
              <tr><td style="padding:14px 16px;">
                <div style="font-size:11px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:#16a34a;">Registration Fee</div>
                <div style="font-size:22px;font-weight:800;color:#0A1F44;margin-top:4px;">Completely FREE</div>
                <div style="font-size:12px;color:#64748b;margin-top:2px;">Across all rounds — online, regional, finale.</div>
              </td></tr>
            </table>
          </td>
        </tr>
      </table>

      <div style="font-size:11px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:#64748b;">Why participate</div>
      <ul style="margin:6px 0 20px 0;padding:0 0 0 18px;color:#334155;font-size:14px;line-height:1.7;">
        <li>Nationally-recognised platform for your school and students</li>
        <li>Live regional qualifiers · East: IIT Kanpur (24 Oct) · South: RVU College, Bangalore (26 Nov) · West: IIT Bombay (17 Dec) · North &amp; Central: dates TBA</li>
        <li>Grand Finale on the iconic IIT Bombay campus, 17 December 2026</li>
        <li>Certificate of Participation for every student · Finalist Recognition for grand-finale competitors</li>
        <li>Optional OLL Robo Sumo &amp; Robo Racer kits available for schools that want the official gear</li>
      </ul>

      <div style="text-align:center;margin:24px 0 20px 0;">
        <a href="{REGISTER_URL}" style="display:inline-block;background:#DC2626;color:#ffffff;padding:14px 28px;border-radius:999px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;font-size:14px;text-decoration:none;">Register your School →</a>
      </div>
      <div style="text-align:center;font-size:12px;color:#64748b;">
        or read the full
        <a href="{PROBLEM_STATEMENT_URL}" style="color:#DC2626;text-decoration:underline;">Problem Statement (PDF)</a>
        &nbsp;·&nbsp;
        <a href="{CAMPAIGN_URL}" style="color:#DC2626;text-decoration:underline;">visit the campaign page</a>
      </div>

      <p style="font-size:14px;color:#334155;margin:28px 0 0 0;">
        Warm regards,<br/>
        <strong style="color:#0A1F44;">Team OLL</strong> — India&rsquo;s leading K-12 robotics platform
      </p>
    """
    return _shell(
        title="Register your school for OLL Robotics Championship — Techfest IIT Bombay 2026",
        preheader="Free to enter · ₹1,50,000 prize pool · Grand Finale at IIT Bombay",
        body_html=body,
    )


def registration_confirmed_html(*, name: str, reg_type: str, tracks: Optional[list] = None) -> str:
    is_school = reg_type == "school"
    who = "Your school" if is_school else "You"
    kit_block = f"""
      <div style="font-size:11px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:#DC2626;margin-top:26px;">Get the Competition Kits</div>
      <p style="font-size:14px;color:#334155;margin:6px 0 12px 0;">
        The OLL Robo Sumo &amp; Robo Racer kits are the official gear for the arena — engineered exactly to the Techfest rulebook (metal chassis, motors, wheels, RC controller and arena/track included).
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td width="50%" style="padding-right:6px;">
            <a href="{SUMO_KIT_URL}" style="display:block;background:#0A1F44;color:#ffffff;text-align:center;padding:14px 12px;border-radius:12px;font-weight:800;font-size:14px;text-decoration:none;">Robo Sumo Kit →</a>
          </td>
          <td width="50%" style="padding-left:6px;">
            <a href="{RACER_KIT_URL}" style="display:block;background:#0A1F44;color:#ffffff;text-align:center;padding:14px 12px;border-radius:12px;font-weight:800;font-size:14px;text-decoration:none;">Robo Racer Kit →</a>
          </td>
        </tr>
      </table>
    """
    body = f"""
      <div style="font-size:11px;font-weight:800;letter-spacing:0.28em;text-transform:uppercase;color:#DC2626;">Registration Confirmed</div>
      <h1 style="font-size:26px;line-height:1.2;margin:6px 0 8px 0;color:#0A1F44;">Welcome to the arena, {name}.</h1>
      <p style="font-size:15px;color:#334155;margin:0 0 16px 0;">
        {who}&rsquo;re officially registered for the <strong>OLL Robotics Championship</strong> at <strong>Techfest, IIT Bombay 2026</strong>. The OLL team will reach out on your phone and email within 24 hours with the next steps.
      </p>

      <div style="font-size:11px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:#64748b;margin-top:20px;">Your Next Steps</div>
      <ol style="margin:8px 0 20px 0;padding:0 0 0 18px;color:#0A1F44;font-size:14px;line-height:1.7;">
        <li><strong>Read the Problem Statement</strong> — full rulebook, bot spec, submission format and judging rubric.</li>
        <li><strong>Form your team(s)</strong> — 3–5 students for RoboSumo / RoboRacer, 1–5 students for the Innovation Challenge.</li>
        <li><strong>Get the official OLL kit</strong> (RoboSumo &amp; RoboRacer only) so your bot matches the rulebook exactly.</li>
        <li><strong>Join our WhatsApp community</strong> — live updates, mentor Q&amp;A and cohort chat.</li>
        <li><strong>Submit Round 1</strong> — design brief, chassis diagram and a 1–3 min demo video on techfest.org before the deadline.</li>
      </ol>

      <div style="text-align:center;margin:22px 0 6px 0;">
        <a href="{PROBLEM_STATEMENT_URL}" style="display:inline-block;background:#DC2626;color:#ffffff;padding:12px 22px;border-radius:999px;font-weight:800;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;text-decoration:none;">Read Problem Statement (PDF) →</a>
      </div>
      <div style="text-align:center;margin:12px 0 20px 0;font-size:12px;color:#64748b;">
        <a href="{PARENT_CIRCULAR_URL}" style="color:#DC2626;text-decoration:underline;">Parent circular (.docx)</a> &nbsp;·&nbsp;
        <a href="{WHATSAPP_URL}" style="color:#25D366;text-decoration:underline;">Join WhatsApp community</a> &nbsp;·&nbsp;
        <a href="{CAMPAIGN_URL}" style="color:#0A1F44;text-decoration:underline;">Campaign page</a>
      </div>

      {kit_block}

      <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:12px;padding:14px 16px;margin-top:10px;">
        <div style="font-size:11px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:#DC2626;">Championship at a glance</div>
        <table role="presentation" width="100%" style="font-size:13px;color:#0A1F44;margin-top:8px;">
          <tr><td style="padding:4px 0;width:120px;color:#64748b;">Prize Pool</td><td style="padding:4px 0;"><strong>Upto ₹1,50,000</strong> across top 3 teams / track</td></tr>
          <tr><td style="padding:4px 0;color:#64748b;">Registration</td><td style="padding:4px 0;"><strong>Completely FREE</strong> across all rounds</td></tr>
          <tr><td style="padding:4px 0;color:#64748b;">Regional Qualifier</td><td style="padding:4px 0;">East · IIT Kanpur · 24 Oct &nbsp;·&nbsp; South · RVU College, Bangalore · 26 Nov &nbsp;·&nbsp; West · IIT Bombay · 17 Dec &nbsp;·&nbsp; North &amp; Central · dates TBA</td></tr>
          <tr><td style="padding:4px 0;color:#64748b;">Grand Finale</td><td style="padding:4px 0;">IIT Bombay · 17 Dec 2026</td></tr>
        </table>
      </div>

      <p style="font-size:14px;color:#334155;margin:28px 0 0 0;">
        See you on the arena floor,<br/>
        <strong style="color:#0A1F44;">Team OLL</strong>
      </p>
    """
    return _shell(
        title="Registration confirmed — OLL Robotics Championship @ Techfest IIT Bombay",
        preheader="You're in. Read the Problem Statement, get your kit, join the WhatsApp community.",
        body_html=body,
    )


def submission_confirmed_html(
    *,
    lead_name: str,
    competition_label: str,
    zone_label: Optional[str] = None,
    age_category_label: Optional[str] = None,
    school_name: Optional[str] = None,
    reference_id: Optional[str] = None,
    team_members: Optional[list] = None,
    drive_link: Optional[str] = None,
) -> str:
    """Project-submission confirmation email — fired the moment a team
    lead completes the /techfest/submit form."""
    meta_rows = []
    meta_rows.append(("Competition", competition_label or "—"))
    if zone_label:
        meta_rows.append(("Zone", zone_label))
    if age_category_label:
        meta_rows.append(("Age Category", age_category_label))
    if school_name:
        meta_rows.append(("School", school_name))
    if reference_id:
        meta_rows.append(("Reference ID", reference_id))
    meta_html = "".join([
        f'<tr><td style="padding:4px 0;color:#64748b;width:140px;">{k}</td>'
        f'<td style="padding:4px 0;"><strong>{v}</strong></td></tr>'
        for k, v in meta_rows
    ])

    team_list_html = ""
    if team_members:
        rows = "".join([
            f'<li style="margin:2px 0;">{ (m.get("name") or "").strip() or "—" }'
            + (f' &nbsp;·&nbsp; <span style="color:#64748b;">{m.get("email","")}</span>' if m.get("email") else "")
            + "</li>"
            for m in team_members
        ])
        team_list_html = f"""
      <div style="font-size:11px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:#64748b;margin-top:22px;">Your Team</div>
      <ul style="margin:8px 0 20px 0;padding:0 0 0 18px;color:#0A1F44;font-size:14px;line-height:1.7;">{rows}</ul>
    """

    drive_html = (
        f'<div style="margin:16px 0 8px 0;font-size:13px;color:#0A1F44;">'
        f'<strong>Your submitted link:</strong> '
        f'<a href="{drive_link}" style="color:#DC2626;text-decoration:underline;word-break:break-all;">{drive_link}</a>'
        "</div>"
        if drive_link else ""
    )

    body = f"""
      <div style="font-size:11px;font-weight:800;letter-spacing:0.28em;text-transform:uppercase;color:#16a34a;">Project Submitted</div>
      <h1 style="font-size:26px;line-height:1.2;margin:6px 0 8px 0;color:#0A1F44;">Your bot is officially in, {lead_name}.</h1>
      <p style="font-size:15px;color:#334155;margin:0 0 16px 0;">
        We&rsquo;ve received your project submission for the <strong>OLL Robotics Championship</strong> at
        <strong>Techfest, IIT Bombay 2026</strong>. Our team will review the submission and reach out with
        the next steps within 48 hours. Keep an eye on your inbox and WhatsApp.
      </p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin:8px 0 20px 0;">
        <div style="font-size:11px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:#0A1F44;">Submission Details</div>
        <table role="presentation" width="100%" style="font-size:13px;color:#0A1F44;margin-top:8px;">
          {meta_html}
        </table>
        {drive_html}
      </div>

      {team_list_html}

      <div style="font-size:11px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:#64748b;margin-top:6px;">What happens next</div>
      <ol style="margin:8px 0 20px 0;padding:0 0 0 18px;color:#0A1F44;font-size:14px;line-height:1.7;">
        <li>Our review team screens every submission for eligibility &amp; category fit.</li>
        <li>Shortlisted teams get an email invite to the on-ground rounds.</li>
        <li>If you qualify, an OLL coordinator will call you to help you prep the bot &amp; travel.</li>
      </ol>

      <div style="text-align:center;margin:22px 0 6px 0;">
        <a href="{WHATSAPP_URL}" style="display:inline-block;background:#25D366;color:#ffffff;padding:12px 22px;border-radius:999px;font-weight:800;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;text-decoration:none;">Join the WhatsApp community →</a>
      </div>

      <p style="font-size:14px;color:#334155;margin:28px 0 0 0;">
        Rooting for you,<br/>
        <strong style="color:#0A1F44;">Team OLL</strong>
      </p>
    """
    return _shell(
        title="Project submitted — OLL Robotics Championship @ Techfest IIT Bombay",
        preheader="Your bot is officially in. Here's what happens next.",
        body_html=body,
    )
