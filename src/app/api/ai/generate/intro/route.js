/**
 * AI Intro Generation API
 * POST /api/ai/generate/intro
 * 
 * Generates personalized intro paragraphs for emails/proposals.
 * Uses OpenRouter AI for personalized generation.
 */

import { NextResponse } from 'next/server';
import { generateCompletion } from '@/lib/openrouter';

export async function POST(request) {
    try {
        const body = await request.json();
        const {
            recipientName,
            organizationName,
            donorName,
            purpose = 'outreach',
            tone = 'professional',
            senderOrg = '',
            senderMission = '',
        } = body;

        const firstName = recipientName?.split(' ')[0] || 'there';

        const userPrompt = `Write an opening paragraph for a ${purpose} ${tone} email.

RECIPIENT: ${recipientName || 'Program Officer'} at ${donorName || organizationName || 'Foundation'}
SENDER ORG: ${senderOrg || 'a nonprofit organization'}
SENDER MISSION: ${senderMission || 'community impact'}
TONE: ${tone}

Requirements:
- 2-3 sentences
- Professional but warm
- Create connection and interest
- ${tone === 'formal' ? 'Use formal language, avoid contractions' : ''}
- ${tone === 'friendly' ? 'Use conversational, approachable language' : ''}

Return ONLY the intro paragraph, nothing else.`;

        const intro = await generateCompletion(
            [
                { role: 'system', content: 'You are an expert nonprofit communications writer. Write compelling, professional opening paragraphs that build connection and interest.' },
                { role: 'user', content: userPrompt },
            ],
            { temperature: 0.7, maxTokens: 300 }
        );

        return NextResponse.json({
            success: true,
            intro,
            tone,
        });

    } catch (error) {
        console.error('Intro generation error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
