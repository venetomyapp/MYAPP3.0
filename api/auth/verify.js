// api/auth/verify.js - Verify Token (Updated for multiple auth types)

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

    // Method 1: Demo tokens
    if (token.startsWith('demo.')) {
      console.log('🚀 Demo token detected');
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

    // Method 2: Simple tokens (from email/password login)
    if (token.startsWith('simple.')) {
      try {
        const tokenData = token.substring(7); // Remove "simple."
        const decoded = JSON.parse(Buffer.from(tokenData, 'base64').toString());
        
        // Check expiration
        if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
          return res.status(401).json({ error: 'Token scaduto' });
        }

        return res.status(200).json({
          success: true,
          user: { 
            email: decoded.email,
            role: 'user'
          },
          token_type: 'simple',
          message: 'Token semplice valido'
        });
      } catch (simpleError) {
        console.warn('Simple token decode error:', simpleError.message);
      }
    }

    // Method 3: Supabase JWT tokens
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      try {
        const verifyResponse = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': process.env.SUPABASE_ANON_KEY
          }
        });

        if (verifyResponse.ok) {
          const userData = await verifyResponse.json();
          return res.status(200).json({
            success: true,
            user: userData,
            token_type: 'supabase',
            message: 'Token Supabase valido'
          });
        }
      } catch (supabaseError) {
        console.warn('Supabase token verification failed:', supabaseError.message);
      }
    }

    // Method 4: Check if it's the ANON key (common case)
    if (token === process.env.SUPABASE_ANON_KEY) {
      return res.status(200).json({
        success: true,
        user: { 
          email: 'anon@supabase.system',
          role: 'anon'
        },
        token_type: 'anon_key',
        message: 'Token ANON key valido'
      });
    }

    // Method 5: Check if it's the SERVICE ROLE key
    if (token === process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(200).json({
        success: true,
        user: { 
          email: 'service@supabase.system',
          role: 'service'
        },
        token_type: 'service_role',
        message: 'Token SERVICE ROLE valido',
        warning: 'Token con privilegi elevati - usa con cautela'
      });
    }

    // Method 6: Test tokens for development
    const testTokens = [
      'test-token-123',
      'admin-token-456',
      'dev-token-789'
    ];

    if (testTokens.includes(token)) {
      return res.status(200).json({
        success: true,
        user: { 
          email: 'test@virgilio.ai',
          role: 'test'
        },
        token_type: 'test',
        message: 'Token di test valido'
      });
    }

    // If we get here, token is not valid
    return res.status(401).json({
      error: 'Token non valido',
      token_preview: token.substring(0, 20) + '...',
      supported_types: [
        'demo.xxx - Token modalità demo',
        'simple.xxx - Token da login email/password', 
        'eyJxxx - Token JWT Supabase',
        'sb-xxx - Token Supabase ANON/SERVICE'
      ]
    });

  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(500).json({
      error: 'Errore verifica token',
      message: error.message
    });
  }
}
