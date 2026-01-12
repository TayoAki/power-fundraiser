/**
 * AI Content Expansion API
 * POST /api/ai/expand
 * 
 * Expands content based on user instructions.
 * Uses OpenRouter AI for context-aware generation.
 */

import { NextResponse } from 'next/server';
import { generateCompletion, PROMPTS } from '@/lib/openrouter';

export async function POST(request) {
    try {
        const body = await request.json();
        const { currentContent, instruction, context = {} } = body;

        if (!instruction) {
            return NextResponse.json(
                { success: false, error: 'Instruction is required' },
                { status: 400 }
            );
        }

        const userPrompt = `You are helping expand a grant proposal or fundraising document.

USER INSTRUCTION: "${instruction}"

CURRENT DOCUMENT CONTENT:
${currentContent || '[Starting fresh]'}

CONTEXT:
- Project: ${context.projectName || 'Not specified'}
- Organization: ${context.organizationName || 'Not specified'}
- Target Donor: ${context.donorName || 'Not specified'}
- Amount: ${context.amount ? '$' + Number(context.amount).toLocaleString() : 'Not specified'}
- Focus Area: ${context.focusArea || 'Not specified'}

Based on the instruction, generate NEW CONTENT to add to the document. This should be:
- Professional and compelling
- Specific and data-driven where possible
- Ready to insert directly into the document
- Formatted with appropriate headers/sections if needed

Return ONLY the new content to add, nothing else.`;

        const addition = await generateCompletion(
            [
                { role: 'system', content: PROMPTS.CONTENT_EXPAND },
                { role: 'user', content: userPrompt },
            ],
            { temperature: 0.6 }
        );

        // Generate a helpful suggestion
        const suggestionPrompt = `Based on this content addition, suggest ONE brief tip (under 20 words) to improve it further:

${addition.slice(0, 500)}

Return only the suggestion, nothing else.`;

        let suggestion = '';
        try {
            suggestion = await generateCompletion(
                [
                    { role: 'system', content: 'You are a grant writing expert. Give brief, actionable suggestions.' },
                    { role: 'user', content: suggestionPrompt },
                ],
                { temperature: 0.5, maxTokens: 100 }
            );
        } catch {
            suggestion = 'Consider adding specific metrics or data points to strengthen this section.';
        }

        return NextResponse.json({
            success: true,
            addition,
            suggestion,
            instruction,
        });

    } catch (error) {
        console.error('Expand content error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
