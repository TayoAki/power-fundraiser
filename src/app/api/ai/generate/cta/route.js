/**
 * AI CTA (Call-to-Action) Generation API
 * POST /api/ai/generate/cta
 * 
 * Generates call-to-action sections for emails/proposals.
 * Uses OpenRouter AI for personalized generation.
 */

import { NextResponse } from 'next/server';
import { generateCompletion } from '@/lib/openrouter';

export async function POST(request) {
    try {
        const body = await request.json();
        const { 
            purpose = 'meeting', 
            senderName = '[Your Name]',
            senderOrg = '[Your Organization]',
            urgency = 'normal',
            recipientName = '',
        } = body;

        const userPrompt = `Write a call-to-action closing for a ${purpose} email.

PURPOSE: ${purpose.replace('_', ' ')}
SENDER: ${senderName} from ${senderOrg}
URGENCY: ${urgency}
${recipientName ? `RECIPIENT: ${recipientName}` : ''}

Requirements:
- 2-4 sentences
- Clear next step or ask
- Professional but warm
- Include signature placeholder
- ${urgency === 'high' ? 'Convey gentle urgency without being pushy' : ''}
- ${purpose === 'meeting' ? 'Suggest specific times or offer flexibility' : ''}
- ${purpose === 'proposal' ? 'Offer to discuss or answer questions' : ''}
- ${purpose === 'thank_you' ? 'Strengthen relationship, invite continued engagement' : ''}

Return ONLY the CTA and signature, nothing else.`;

        const cta = await generateCompletion(
            [
                { role: 'system', content: 'You are an expert in nonprofit communications. Write compelling, professional call-to-action closings that inspire action while maintaining warmth.' },
                { role: 'user', content: userPrompt },
            ],
            { temperature: 0.7, maxTokens: 300 }
        );

        return NextResponse.json({
            success: true,
            cta,
            purpose,
        });

    } catch (error) {
        console.error('CTA generation error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
