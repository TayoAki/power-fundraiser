/**
 * Report Glitch API
 * POST /api/report-glitch
 * 
 * Sends bug reports via email
 */

import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Report email recipient
const REPORT_EMAIL = 'support@power-fundraiser.app';

export async function POST(request) {
    console.log('🐛 [API/report-glitch] Received report');
    
    try {
        const body = await request.json();
        const {
            description,
            userEmail,
            page,
            timestamp,
            browserInfo,
            consoleErrors,
        } = body;

        console.log('📋 [API/report-glitch] Report from:', userEmail);
        console.log('📋 [API/report-glitch] Page:', page);

        if (!description) {
            return NextResponse.json(
                { success: false, error: 'Description is required' },
                { status: 400 }
            );
        }

        // Format the bug report
        const reportHtml = `
            <h2>🐛 Bug Report</h2>
            <p><strong>Reported by:</strong> ${userEmail || 'Anonymous'}</p>
            <p><strong>Page:</strong> ${page || 'Unknown'}</p>
            <p><strong>Time:</strong> ${timestamp || new Date().toISOString()}</p>
            
            <h3>Description</h3>
            <p>${description}</p>
            
            <h3>Browser Info</h3>
            <pre>${browserInfo || 'Not provided'}</pre>
            
            ${consoleErrors ? `
            <h3>Console Errors</h3>
            <pre>${consoleErrors}</pre>
            ` : ''}
        `;

        // Try to send via SMTP (using Gmail SMTP as example)
        // In production, you'd configure this with your actual SMTP settings
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER || 'noreply@power-fundraiser.app',
                pass: process.env.SMTP_PASS || '',
            },
        });

        // Log the report even if email fails
        console.log('📧 [API/report-glitch] Report content:');
        console.log('  Description:', description);
        console.log('  User:', userEmail);
        console.log('  Page:', page);

        // Try to send email
        try {
            if (process.env.SMTP_USER && process.env.SMTP_PASS) {
                await transporter.sendMail({
                    from: process.env.SMTP_USER,
                    to: REPORT_EMAIL,
                    subject: `[Bug Report] Power Fundraiser - ${page || 'Unknown Page'}`,
                    html: reportHtml,
                });
                console.log('✅ [API/report-glitch] Email sent successfully');
            } else {
                console.log('⚠️ [API/report-glitch] SMTP not configured, report logged only');
            }
        } catch (emailError) {
            console.error('⚠️ [API/report-glitch] Email failed:', emailError.message);
            // Continue - we still want to return success since we logged the report
        }

        return NextResponse.json({
            success: true,
            message: 'Bug report submitted successfully',
            reportId: `BUG-${Date.now()}`,
        });

    } catch (error) {
        console.error('❌ [API/report-glitch] Error:', error.message);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
