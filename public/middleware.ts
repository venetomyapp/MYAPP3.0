// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rotte pubbliche (NON richiedono token)
  const publicRoutes = [
    '/api/sync/diag-webdav',
    '/api/sync/discover-kdrive',
    '/api/sync/process-kdrive',
    '/api/sync/auto-sync',
    '/api/chat',
    '/api/health',
  ];
  if (publicRoutes.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Tutto il resto delle /api richiede Bearer token (se ti serve mantenerlo)
  if (pathname.startsWith('/api/')) {
    const auth = req.headers.get('authorization');
    if (!auth || !auth.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Token mancante' }, { status: 401 });
    }
    const token = auth.slice(7);
    if (process.env.INTERNAL_API_TOKEN && token !== process.env.INTERNAL_API_TOKEN) {
      return NextResponse.json({ success: false, error: 'Token non valido' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

// Applica il middleware solo alle API
export const config = {
  matcher: ['/api/:path*'],
};
