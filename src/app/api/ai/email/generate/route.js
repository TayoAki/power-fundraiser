/**
 * AI Email Generation API
 * POST /api/ai/email/generate
 * 
 * Generates personalized email drafts for donor outreach.
 * Uses OpenRouter AI for personalized generation.
 */

import { NextResponse } from 'next/server';
import { generateJSON, PROMPTS } from '@/lib/openrouter';

const PURPOSE_PROMPTS = {
    intro: PROMPTS.EMAIL_COLD,
    follow_up: PROMPTS.EMAIL_FOLLOWUP,
    thank_you: PROMPTS.EMAIL_THANK_YOU,
    proposal_submit: PROMPTS.EMAIL_COLD,
    meeting_request: PROMPTS.EMAIL_COLD,
    introduction_request: PROMPTS.EMAIL_INTRODUCTION_REQUEST,
};

export async function POST(request) {
    try {
        const body = await request.json();
        const {
            recipientName,
            recipientTitle,
            organizationName,
            donorName,
            purpose = 'intro',
            context = {},
            senderName = '[Your Name]',
            senderOrg = '[Your Organization]',
            senderMission = '',
            tone = 'professional',
        } = body;

        const systemPrompt = PURPOSE_PROMPTS[purpose] || PROMPTS.EMAIL_COLD;
        const firstName = recipientName?.split(' ')[0] || 'there';

        const userPrompt = `Write an email for the following scenario:

RECIPIENT:
- Name: ${recipientName || 'Program Officer'}
- Title: ${recipientTitle || 'Program Officer'}
- Organization: ${donorName || organizationName || 'Foundation'}

SENDER:
- Name: ${senderName}
- Organization: ${senderOrg}
- Mission: ${senderMission || 'A nonprofit dedicated to community impact'}

PURPOSE: ${purpose.replace('_', ' ')}
TONE: ${tone}

ADDITIONAL CONTEXT:
${context.projectName ? `- Project: ${context.projectName}` : ''}
${context.amount ? `- Grant Amount: $${Number(context.amount).toLocaleString()}` : ''}
${context.focusArea ? `- Focus Area: ${context.focusArea}` : ''}
${context.previousInteraction ? `- Previous Interaction: ${context.previousInteraction}` : ''}
${context.warmConnection ? `- Warm Connection: ${context.warmConnection}` : ''}
${context.meetingPurpose ? `- Meeting Purpose: ${context.meetingPurpose}` : ''}

Return your response as JSON with these exact fields:
{
  "subject": "Email subject line (under 50 characters)",
  "body": "Full email body with greeting and signature"
}`;

        const result = await generateJSON(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            { temperature: 0.7 }
        );

        const suggestions = [];
        if (purpose === 'intro') {
            suggestions.push('Consider mentioning a specific program that aligns with their focus');
            if (!context.warmConnection) {
                suggestions.push('Add a mutual connection reference if available');
            }
            suggestions.push('Include a specific date/time proposal for a call');
        } else if (purpose === 'follow_up') {
            suggestions.push('Reference specific outcomes or impact metrics');
            suggestions.push('Mention any news or updates since last contact');
        } else if (purpose === 'thank_you') {
            suggestions.push('Add specific impact numbers if available');
            suggestions.push('Invite them to an upcoming event');
        }

        return NextResponse.json({
            success: true,
            subject: result.subject || `Regarding ${context.projectName || 'Partnership Opportunity'}`,
            body: result.body || '',
            suggestions,
            purpose,
            generatedAt: new Date().toISOString(),
        });

    } catch (error) {
        console.error('Email generation error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
