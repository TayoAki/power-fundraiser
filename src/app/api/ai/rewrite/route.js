/**
 * AI Content Rewrite API
 * POST /api/ai/rewrite
 * 
 * Rewrites content in different styles.
 * Uses OpenRouter AI for intelligent rewriting.
 */

import { NextResponse } from 'next/server';
import { generateCompletion, PROMPTS } from '@/lib/openrouter';

const STYLE_GUIDELINES = {
    formal: 'Professional, third-person, academic tone. Avoid contractions. Use precise language. Maintain gravitas.',
    persuasive: 'Compelling, action-oriented, emotionally engaging. Use strong verbs, clear benefits, and urgency.',
    concise: 'Brief, direct, no fluff. Keep only essential information. Cut word count by 40%. Every word must earn its place.',
    expand: 'Add detail, examples, data points, and context. Elaborate on key points. Increase depth and richness.',
    friendly: 'Warm, conversational, approachable. Use first-person, shorter sentences. Feel like a colleague, not a stranger.',
};

export async function POST(request) {
    try {
        const body = await request.json();
        const { content, style } = body;

        if (!content) {
            return NextResponse.json(
                { success: false, error: 'Content is required' },
                { status: 400 }
            );
        }

        const styleGuideline = STYLE_GUIDELINES[style?.toLowerCase()] || STYLE_GUIDELINES.formal;

        const userPrompt = `Rewrite the following content in a ${style || 'formal'} style.

STYLE GUIDELINES:
${styleGuideline}

ORIGINAL CONTENT:
${content}

Rewrite the content now. Return ONLY the rewritten content, nothing else. Maintain the core message and key points while transforming the tone and style.`;

        const rewrittenContent = await generateCompletion(
            [
                { role: 'system', content: PROMPTS.CONTENT_REWRITE },
                { role: 'user', content: userPrompt },
            ],
            { temperature: 0.7 }
        );

        return NextResponse.json({
            success: true,
            content: rewrittenContent,
            style,
            originalLength: content.length,
            newLength: rewrittenContent.length,
        });

    } catch (error) {
        console.error('Rewrite error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
