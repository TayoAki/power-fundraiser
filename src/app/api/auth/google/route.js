/**
 * Google OAuth Initiation
 * GET /api/auth/google
 * 
 * Redirects user to Google OAuth consent screen
 */

import { NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/lib/google';

export async function GET() {
    console.log('🚀 [API/auth/google] Starting OAuth flow...');
    
    const authUrl = getGoogleAuthUrl();
    console.log('🔗 [API/auth/google] Redirecting to Google...');
    
    return NextResponse.redirect(authUrl);
}
