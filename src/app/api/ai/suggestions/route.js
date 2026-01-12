/**
 * AI Suggestions API
 * POST /api/ai/suggestions
 * 
 * Analyzes content and provides improvement suggestions.
 * Uses OpenRouter AI for content analysis.
 */

import { NextResponse } from 'next/server';
import { generateJSON, PROMPTS } from '@/lib/openrouter';

export async function POST(request) {
    try {
        const body = await request.json();
        const { content, donorContext = {} } = body;

        if (!content) {
            return NextResponse.json(
                { success: false, error: 'Content is required' },
                { status: 400 }
            );
        }

        const userPrompt = `Analyze this grant proposal/fundraising document and provide specific improvement suggestions.

DOCUMENT CONTENT:
${content.slice(0, 3000)}

TARGET DONOR CONTEXT:
- Name: ${donorContext.name || 'Not specified'}
- Focus Areas: ${donorContext.focusAreas || 'Not specified'}
- Typical Grant Size: ${donorContext.fundingRange || 'Not specified'}

Analyze and return JSON with these fields:
{
  "suggestions": [
    {
      "id": 1,
      "type": "missing_section" | "alignment" | "enhancement" | "clarity" | "impact",
      "priority": "high" | "medium" | "low",
      "text": "Specific, actionable suggestion",
      "action": "Brief action label (e.g., 'Add budget', 'Improve clarity')"
    }
  ],
  "overallStrength": 0-100,
  "topPriority": "The single most important improvement to make"
}

Return 3-5 suggestions, ordered by priority.`;

        const result = await generateJSON(
            [
                { role: 'system', content: PROMPTS.PROPOSAL_ANALYSIS },
                { role: 'user', content: userPrompt },
            ],
            { temperature: 0.5 }
        );

        return NextResponse.json({
            success: true,
            suggestions: result.suggestions || [],
            overallStrength: result.overallStrength || 50,
            topPriority: result.topPriority || 'Review and strengthen your proposal',
            totalFound: result.suggestions?.length || 0,
            analysisComplete: true,
        });

    } catch (error) {
        console.error('Suggestions error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
