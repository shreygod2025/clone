const ASSET_BASE = process.env.REACT_APP_ASSET_CDN_URL || "";

export const ASSETS = {
  // Logos
  OLL_LOGO_COLOR: `${ASSET_BASE}/OLL-horizontal-logo-1.png`,
  OLL_LOGO_WHITE: `${ASSET_BASE}/OLL-horizontal-logo-white.png`,
  OLL_LOGO_VERTICAL: `${ASSET_BASE}/OLL-vertical-logo-skills.png`,

  // People
  SHREYAAN_PHOTO: `${ASSET_BASE}/Shreyaan-Daga.jpg`,
  SHREYAAN_SIGN: `${ASSET_BASE}/Shreyaan-Sign.png`,

  // Summer Camp GIFs
  ROBOTICS_GIF: `${ASSET_BASE}/Robotics.gif`,
  CODING_GIF: `${ASSET_BASE}/Python.gif`,
  DESIGN_3D_GIF: `${ASSET_BASE}/3D-Design.gif`,
  AI_TOOL_GIF: `${ASSET_BASE}/AI-Tool.gif`,

  // Summer Camp images
  SUMMER_CAMP_OG: `${ASSET_BASE}/summer-camp-og.png`,
  USFUCA_LOGO: `${ASSET_BASE}/USFUCA-logo.jpg`,
  KBC_WEBSITE: `${ASSET_BASE}/KBC-Website.png`,
  KBC_SHARK_TANK: `${ASSET_BASE}/KBC-Shark-Tank-Website.png`,

  // OG images
  LANDING_OG_IMAGE: `${ASSET_BASE}/landing-og-image.png`,

  // Documents
  GP_MOU_PDF: `${ASSET_BASE}/OLL-Growth-Partner-MOU.pdf`,
  TEAM_HANDBOOK: `${ASSET_BASE}/OLL-Team-Handbook-2025.pdf`,
  STUDENT_UPLOAD_TEMPLATE: `${ASSET_BASE}/student-upload-template.xlsx`,
};
