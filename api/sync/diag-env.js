// pages/api/sync/diag-env.js
export const config = { runtime: "nodejs" };

function mask(s) {
  if (!s) return null;
  if (s.length <= 8) return s[0] + "…";
  return s.slice(0, 4) + "…" + s.slice(-4);
}

export default function handler(req, res) {
  res.status(200).json({
    runtime: "nodejs",
    env: {
      // kDrive (public link mode)
      KDRIVE_WEBDAV_URL: process.env.KDRIVE_WEBDAV_URL || null,
      KDRIVE_PUBLIC_TOKEN_present: !!process.env.KDRIVE_PUBLIC_TOKEN,
      KDRIVE_PUBLIC_TOKEN_masked: mask(process.env.KDRIVE_PUBLIC_TOKEN || ""),
      KDRIVE_PUBLIC_PASSWORD_present: !!process.env.KDRIVE_PUBLIC_PASSWORD,
      // kDrive (account mode)
      KDRIVE_EMAIL_present: !!process.env.KDRIVE_EMAIL,
      KDRIVE_PASSWORD_present: !!process.env.KDRIVE_PASSWORD,
      // Other
      KDRIVE_DEFAULT_PATH: process.env.KDRIVE_DEFAULT_PATH || null,
      SUPABASE_URL_present: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY_present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      OPENAI_API_KEY_present: !!process.env.OPENAI_API_KEY,
      VERCEL_ENV: process.env.VERCEL_ENV || null, // "production" / "preview"
    },
  });
}
