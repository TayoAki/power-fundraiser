/**
 * Google OAuth & Gmail API Integration
 * 
 * Handles Google OAuth flow and Gmail API for sending emails.
 */

// Google OAuth Configuration
export const GOOGLE_CONFIG = {
    clientId: '474059963221-iciotn2bflde813m7dn4skt58upf3rds.apps.googleusercontent.com',
    clientSecret: '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',
    redirectUri: typeof window !== 'undefined' 
        ? `${window.location.origin}/api/auth/google/callback`
        : 'http://localhost:3000/api/auth/google/callback',
    scopes: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
    ].join(' '),
};

/**
 * Generate Google OAuth URL for connecting account
 */
export function getGoogleAuthUrl() {
    const params = new URLSearchParams({
        client_id: GOOGLE_CONFIG.clientId,
        redirect_uri: GOOGLE_CONFIG.redirectUri,
        response_type: 'code',
        scope: GOOGLE_CONFIG.scopes,
        access_type: 'offline',
        prompt: 'consent',
    });
    
    console.log('🔗 [Google] Generating auth URL with redirect:', GOOGLE_CONFIG.redirectUri);
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code) {
    console.log('🔑 [Google] Exchanging code for tokens...');
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: GOOGLE_CONFIG.clientId,
            client_secret: GOOGLE_CONFIG.clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: GOOGLE_CONFIG.redirectUri,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('❌ [Google] Token exchange failed:', error);
        throw new Error('Failed to exchange code for tokens');
    }

    const tokens = await response.json();
    console.log('✅ [Google] Tokens received, expires in:', tokens.expires_in);
    return tokens;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken) {
    console.log('🔄 [Google] Refreshing access token...');
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: GOOGLE_CONFIG.clientId,
            client_secret: GOOGLE_CONFIG.clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('❌ [Google] Token refresh failed:', error);
        throw new Error('Failed to refresh access token');
    }

    const tokens = await response.json();
    console.log('✅ [Google] Access token refreshed');
    return tokens;
}

/**
 * Get user info from Google
 */
export async function getGoogleUserInfo(accessToken) {
    console.log('👤 [Google] Fetching user info...');
    
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        throw new Error('Failed to get user info');
    }

    const userInfo = await response.json();
    console.log('✅ [Google] User info received:', userInfo.email);
    return userInfo;
}

/**
 * Send email via Gmail API
 */
export async function sendGmailEmail(accessToken, { to, subject, body, from }) {
    console.log('📧 [Gmail] Sending email to:', to);
    
    // Create email in RFC 2822 format
    const emailLines = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        '',
        body,
    ];
    
    const email = emailLines.join('\r\n');
    const encodedEmail = Buffer.from(email).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encodedEmail }),
    });

    if (!response.ok) {
        const error = await response.json();
        console.error('❌ [Gmail] Send failed:', error);
        throw new Error(error.error?.message || 'Failed to send email');
    }

    const result = await response.json();
    console.log('✅ [Gmail] Email sent, ID:', result.id);
    return result;
}

/**
 * Store Google tokens in localStorage (client-side)
 */
export function storeGoogleTokens(tokens, userInfo) {
    if (typeof window === 'undefined') return;
    
    const data = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + (tokens.expires_in * 1000),
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
    };
    
    localStorage.setItem('googleAuth', JSON.stringify(data));
    console.log('💾 [Google] Tokens stored for:', userInfo.email);
    return data;
}

/**
 * Get stored Google tokens
 */
export function getStoredGoogleTokens() {
    if (typeof window === 'undefined') return null;
    
    const stored = localStorage.getItem('googleAuth');
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    console.log('📂 [Google] Retrieved stored tokens for:', data.email);
    return data;
}

/**
 * Check if Google tokens are valid/expired
 */
export function isGoogleTokenValid() {
    const tokens = getStoredGoogleTokens();
    if (!tokens) return false;
    
    const isValid = tokens.expiresAt > Date.now();
    console.log('🔍 [Google] Token valid:', isValid);
    return isValid;
}

/**
 * Disconnect Google account
 */
export function disconnectGoogle() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('googleAuth');
    console.log('🔌 [Google] Account disconnected');
}
