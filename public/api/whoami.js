// api/whoami.js — per capire se arrivano token ed ENV e cosa risponde Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  const auth = req.headers.authorization || '';
  const hasAuth = auth.startsWith('Bearer ');
  const envOk = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

  let vrStatus = null, vrText = null;
  if (hasAuth && envOk) {
    try {
      const vr = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { Authorization: auth, apikey: SUPABASE_ANON_KEY }
      });
      vrStatus = vr.status;
      vrText = await vr.text();
    } catch (e) {
      vrStatus = 'fetch_error';
      vrText = String(e);
    }
  }

  return res.status(200).json({
    receivedAuthHeader: hasAuth,
    env: { SUPABASE_URL: !!SUPABASE_URL, SUPABASE_ANON_KEY: !!SUPABASE_ANON_KEY },
    supabaseUserEndpointStatus: vrStatus,
    supabaseUserEndpointBody: vrText?.slice(0, 200)
  });
}
