/**
 * Google OAuth Callback
 * GET /api/auth/google/callback
 * 
 * Handles the OAuth callback from Google, exchanges code for tokens
 */

import { NextResponse } from 'next/server';
import { exchangeCodeForTokens, getGoogleUserInfo, GOOGLE_CONFIG } from '@/lib/google';

export async function GET(request) {
    console.log('📥 [API/auth/google/callback] Received callback');
    
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
        console.error('❌ [API/auth/google/callback] OAuth error:', error);
        return NextResponse.redirect(new URL('/dashboard/settings?error=google_denied', request.url));
    }

    if (!code) {
        console.error('❌ [API/auth/google/callback] No code received');
        return NextResponse.redirect(new URL('/dashboard/settings?error=no_code', request.url));
    }

    try {
        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(code);
        console.log('✅ [API/auth/google/callback] Tokens received');

        // Get user info
        const userInfo = await getGoogleUserInfo(tokens.access_token);
        console.log('✅ [API/auth/google/callback] User:', userInfo.email);

        // Encode tokens and user info to pass to client
        const authData = {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresIn: tokens.expires_in,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
        };

        const encodedData = encodeURIComponent(JSON.stringify(authData));

        // Redirect to settings with success and data
        return NextResponse.redirect(
            new URL(`/dashboard/settings?google=success&data=${encodedData}`, request.url)
        );

    } catch (err) {
        console.error('❌ [API/auth/google/callback] Error:', err.message);
        return NextResponse.redirect(
            new URL('/dashboard/settings?error=token_exchange_failed', request.url)
        );
    }
}
