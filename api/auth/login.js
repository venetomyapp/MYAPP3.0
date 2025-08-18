// api/auth/login.js - Login Email/Password (Sistema Reale)

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email e password richiesti' 
      });
    }

    console.log('🔍 Login attempt for:', email);

    // Method 1: Supabase Auth (se configurato)
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      try {
        console.log('🔍 Trying Supabase auth...');
        
        const authResponse = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            email: email,
            password: password
          })
        });

        if (authResponse.ok) {
          const authData = await authResponse.json();
          console.log('✅ Supabase auth successful for:', email);
          
          return res.status(200).json({
            success: true,
            access_token: authData.access_token,
            user: authData.user,
            token_type: 'supabase_auth',
            message: 'Login riuscito con Supabase Auth'
          });
        } else {
          console.warn('⚠️ Supabase auth failed:', authResponse.status);
        }
      } catch (supabaseError) {
        console.warn('⚠️ Supabase auth error:', supabaseError.message);
      }
    }

    // Method 2: Credenziali amministratore predefinite
    const adminCredentials = [
      { email: 'admin@virgilio.ai', password: 'virgilio2024' },
      { email: 'admin@example.com', password: 'admin123' },
      { email: 'test@test.com', password: 'test123' }
    ];

    const adminMatch = adminCredentials.find(cred => 
      cred.email === email.toLowerCase() && cred.password === password
    );

    if (adminMatch) {
      console.log('✅ Admin credentials verified for:', email);
      
      // Return Supabase ANON key as token (most common usage)
      const token = process.env.SUPABASE_ANON_KEY || `admin-token-${Date.now()}`;
      
      return res.status(200).json({
        success: true,
        access_token: token,
        user: { 
          email: email,
          role: 'admin'
        },
        token_type: 'admin_credentials',
        message: 'Login amministratore riuscito'
      });
    }

    // Method 3: Password universale "demo123"
    if (password === 'demo123') {
      console.log('✅ Demo password accepted for:', email);
      
      const token = process.env.SUPABASE_ANON_KEY || `demo-token-${Date.now()}`;
      
      return res.status(200).json({
        success: true,
        access_token: token,
        user: { 
          email: email,
          role: 'demo'
        },
        token_type: 'demo_password',
        message: 'Login demo riuscito'
      });
    }

    console.log('❌ Login failed for:', email);
    
    return res.status(401).json({
      error: 'Credenziali non valide',
      valid_credentials: [
        'admin@virgilio.ai / virgilio2024',
        'admin@example.com / admin123',
        'test@test.com / test123',
        'qualsiasi-email / demo123'
      ],
      supabase_configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({
      error: 'Errore interno del server',
      message: error.message
    });
  }
}
