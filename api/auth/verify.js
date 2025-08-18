// api/auth/verify.js - Verifica Token (Sistema Reale)

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token di autorizzazione mancante',
        format: 'Authorization: Bearer <token>'
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    console.log('🔍 Verifying token:', token.substring(0, 20) + '...');

    // Method 1: Supabase ANON KEY (più comune)
    if (token === process.env.SUPABASE_ANON_KEY) {
      console.log('✅ SUPABASE_ANON_KEY verified');
      return res.status(200).json({
        success: true,
        user: { 
          email: 'anon@supabase.system',
          role: 'anon'
        },
        token_type: 'supabase_anon',
        message: 'Token ANON key valido'
      });
    }

    // Method 2: Supabase SERVICE ROLE KEY
    if (token === process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('✅ SUPABASE_SERVICE_ROLE_KEY verified');
      return res.status(200).json({
        success: true,
        user: { 
          email: 'service@supabase.system',
          role: 'service'
        },
        token_type: 'supabase_service',
        message: 'Token SERVICE ROLE valido'
      });
    }

    // Method 3: Supabase JWT User Token
    if (process.env.SUPABASE_URL && token.startsWith('eyJ')) {
      try {
        console.log('🔍 Trying Supabase JWT verification...');
        
        const verifyResponse = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': process.env.SUPABASE_ANON_KEY
          }
        });

        if (verifyResponse.ok) {
          const userData = await verifyResponse.json();
          console.log('✅ Supabase JWT verified for user:', userData.email);
          
          return res.status(200).json({
            success: true,
            user: userData,
            token_type: 'supabase_jwt',
            message: 'Token JWT Supabase valido'
          });
        } else {
          console.warn('⚠️ Supabase JWT verification failed:', verifyResponse.status);
        }
      } catch (supabaseError) {
        console.warn('⚠️ Supabase JWT error:', supabaseError.message);
      }
    }

    // Method 4: Demo tokens (for testing)
    if (token.startsWith('demo-') || token.includes('demo')) {
      console.log('✅ Demo token accepted');
      return res.status(200).json({
        success: true,
        user: { 
          email: 'demo@virgilio.ai',
          role: 'demo'
        },
        token_type: 'demo',
        message: 'Token demo valido'
      });
    }

    // Method 5: Simple custom tokens
    if (token.startsWith('simple.') || token.startsWith('client-auth-')) {
      console.log('✅ Simple token accepted');
      return res.status(200).json({
        success: true,
        user: { 
          email: 'user@virgilio.ai',
          role: 'user'
        },
        token_type: 'simple',
        message: 'Token semplice valido'
      });
    }

    console.log('❌ Token not recognized:', token.substring(0, 20) + '...');
    
    return res.status(401).json({
      error: 'Token non valido',
      token_preview: token.substring(0, 20) + '...',
      expected_types: [
        'Supabase ANON key',
        'Supabase SERVICE ROLE key', 
        'Supabase JWT (eyJ...)',
        'Demo token (demo-...)'
      ],
      env_check: {
        has_supabase_url: !!process.env.SUPABASE_URL,
        has_anon_key: !!process.env.SUPABASE_ANON_KEY,
        has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });

  } catch (error) {
    console.error('❌ Token verification error:', error);
    return res.status(500).json({
      error: 'Errore verifica token',
      message: error.message
    });
  }
}
