/**
 * AI Stats Generation API
 * POST /api/ai/generate/stats
 * 
 * Generates impact statistics sections.
 * Uses OpenRouter AI for compelling stats presentation.
 */

import { NextResponse } from 'next/server';
import { generateCompletion } from '@/lib/openrouter';

export async function POST(request) {
    try {
        const body = await request.json();
        const { organizationName, focusArea, programDescription, customStats } = body;

        if (customStats) {
            return NextResponse.json({
                success: true,
                stats: customStats,
            });
        }

        const userPrompt = `Generate a compelling impact statistics section for a nonprofit grant proposal.

ORGANIZATION: ${organizationName || 'A nonprofit organization'}
FOCUS AREA: ${focusArea || 'community development'}
PROGRAM: ${programDescription || 'community programs'}

Create a brief (3-5 bullet points) impact statistics section that:
- Uses specific, credible numbers
- Highlights meaningful outcomes
- Shows scale and reach
- Demonstrates effectiveness

Format with bullet points. Use realistic but impressive numbers.
Return ONLY the stats section, no headers or explanations.`;

        const stats = await generateCompletion(
            [
                { role: 'system', content: 'You are an expert grant writer. Generate compelling, credible impact statistics that demonstrate program effectiveness.' },
                { role: 'user', content: userPrompt },
            ],
            { temperature: 0.6, maxTokens: 400 }
        );

        return NextResponse.json({
            success: true,
            stats,
        });

    } catch (error) {
        console.error('Stats generation error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
