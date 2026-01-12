/**
 * SMTP Test Connection API
 * POST /api/email/test-smtp
 * 
 * Tests SMTP connection with provided credentials
 */

import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request) {
    console.log('🔌 [API/email/test-smtp] Testing SMTP connection...');
    
    try {
        const body = await request.json();
        const { smtpHost, smtpPort, smtpUsername, smtpPassword } = body;

        console.log('📋 [API/email/test-smtp] Host:', smtpHost);
        console.log('📋 [API/email/test-smtp] Port:', smtpPort);
        console.log('📋 [API/email/test-smtp] User:', smtpUsername);

        if (!smtpHost || !smtpUsername || !smtpPassword) {
            return NextResponse.json(
                { success: false, error: 'Missing required SMTP settings' },
                { status: 400 }
            );
        }

        // Create transporter
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: parseInt(smtpPort) || 587,
            secure: parseInt(smtpPort) === 465,
            auth: {
                user: smtpUsername,
                pass: smtpPassword,
            },
            connectionTimeout: 10000, // 10 seconds
        });

        // Verify connection
        console.log('🔄 [API/email/test-smtp] Verifying connection...');
        await transporter.verify();
        
        console.log('✅ [API/email/test-smtp] Connection successful!');
        
        return NextResponse.json({
            success: true,
            message: 'SMTP connection successful',
        });

    } catch (error) {
        console.error('❌ [API/email/test-smtp] Connection failed:', error.message);
        
        // Provide helpful error messages
        let errorMessage = error.message;
        if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Connection refused. Check host and port.';
        } else if (error.code === 'EAUTH') {
            errorMessage = 'Authentication failed. Check username and password.';
        } else if (error.code === 'ESOCKET') {
            errorMessage = 'Socket error. Check if port is correct (587 for TLS, 465 for SSL).';
        }
        
        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 400 }
        );
    }
}
