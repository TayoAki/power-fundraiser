/**
 * Email Sending API
 * POST /api/email/send
 * 
 * Sends emails via Gmail API or SMTP fallback
 */

import { NextResponse } from 'next/server';
import { sendGmailEmail, refreshAccessToken, GOOGLE_CONFIG } from '@/lib/google';
import nodemailer from 'nodemailer';

export async function POST(request) {
    console.log('📧 [API/email/send] Received send request');
    
    try {
        const body = await request.json();
        const {
            to,
            subject,
            body: emailBody,
            provider = 'gmail',
            // Gmail auth
            accessToken,
            refreshToken,
            fromEmail,
            // SMTP settings
            smtpHost,
            smtpPort,
            smtpUsername,
            smtpPassword,
        } = body;

        console.log('📋 [API/email/send] Provider:', provider);
        console.log('📋 [API/email/send] To:', to);
        console.log('📋 [API/email/send] Subject:', subject);

        if (!to || !subject || !emailBody) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: to, subject, body' },
                { status: 400 }
            );
        }

        // Send via Gmail API
        if (provider === 'gmail') {
            if (!accessToken) {
                return NextResponse.json(
                    { success: false, error: 'Gmail not connected. Please connect your Google account.' },
                    { status: 401 }
                );
            }

            console.log('📤 [API/email/send] Sending via Gmail API...');
            
            try {
                const result = await sendGmailEmail(accessToken, {
                    to,
                    subject,
                    body: emailBody,
                    from: fromEmail || to,
                });

                console.log('✅ [API/email/send] Gmail sent successfully, ID:', result.id);
                
                return NextResponse.json({
                    success: true,
                    messageId: result.id,
                    provider: 'gmail',
                });

            } catch (gmailError) {
                console.error('❌ [API/email/send] Gmail error:', gmailError.message);
                
                // Try to refresh token if expired
                if (gmailError.message.includes('401') && refreshToken) {
                    console.log('🔄 [API/email/send] Attempting token refresh...');
                    try {
                        const newTokens = await refreshAccessToken(refreshToken);
                        const result = await sendGmailEmail(newTokens.access_token, {
                            to,
                            subject,
                            body: emailBody,
                            from: fromEmail || to,
                        });
                        
                        return NextResponse.json({
                            success: true,
                            messageId: result.id,
                            provider: 'gmail',
                            newAccessToken: newTokens.access_token,
                        });
                    } catch (refreshError) {
                        console.error('❌ [API/email/send] Token refresh failed:', refreshError.message);
                    }
                }
                
                throw gmailError;
            }
        }

        // Send via SMTP
        if (provider === 'smtp') {
            if (!smtpHost || !smtpUsername || !smtpPassword) {
                return NextResponse.json(
                    { success: false, error: 'SMTP settings incomplete' },
                    { status: 400 }
                );
            }

            console.log('📤 [API/email/send] Sending via SMTP...');
            console.log('📋 [API/email/send] SMTP Host:', smtpHost);
            console.log('📋 [API/email/send] SMTP Port:', smtpPort);

            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: parseInt(smtpPort) || 587,
                secure: parseInt(smtpPort) === 465,
                auth: {
                    user: smtpUsername,
                    pass: smtpPassword,
                },
            });

            const info = await transporter.sendMail({
                from: smtpUsername,
                to,
                subject,
                html: emailBody,
            });

            console.log('✅ [API/email/send] SMTP sent successfully, ID:', info.messageId);

            return NextResponse.json({
                success: true,
                messageId: info.messageId,
                provider: 'smtp',
            });
        }

        return NextResponse.json(
            { success: false, error: 'Invalid provider. Use "gmail" or "smtp".' },
            { status: 400 }
        );

    } catch (error) {
        console.error('❌ [API/email/send] Error:', error.message);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
