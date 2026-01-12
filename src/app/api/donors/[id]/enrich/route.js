/**
 * Donor Enrichment API
 * POST /api/donors/[id]/enrich
 * 
 * Triggers AI enrichment for a donor - generates insights and approach strategy.
 * Uses OpenRouter AI for analysis.
 */

import { NextResponse } from 'next/server';
import { generateJSON, PROMPTS } from '@/lib/openrouter';

export async function POST(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { organizationMission, donor } = body;

        const userPrompt = `Provide comprehensive strategic analysis for approaching this foundation:

FOUNDATION DETAILS:
Name: ${donor?.name || 'Unknown Foundation'}
EIN: ${donor?.ein || 'Unknown'}
Focus Areas: ${donor?.focus_areas || 'Philanthropy'}
Description: ${donor?.description || 'A philanthropic foundation'}
Total Assets: ${donor?.total_assets ? '$' + donor.total_assets.toLocaleString() : 'Unknown'}
Annual Giving: ${donor?.total_giving ? '$' + donor.total_giving.toLocaleString() : 'Unknown'}
Typical Grant Range: ${donor?.funding_range || 'Unknown'}
Location: ${donor?.city || 'Unknown'}, ${donor?.state || 'Unknown'}
Principal Officer: ${donor?.principal_officer || 'Unknown'}
Officers: ${donor?.officers?.map(o => `${o.name} (${o.title})`).join(', ') || 'Unknown'}

NONPROFIT SEEKING FUNDING:
Mission: ${organizationMission || 'Not provided'}

Provide detailed strategic analysis as JSON with these fields:
{
  "summary": "2-3 sentence compelling analysis of why this is a strong match",
  "keyOpportunities": ["4-5 specific funding opportunities or strategic advantages"],
  "approachStrategy": "Detailed 4-5 sentence strategy for cultivation and approach",
  "grantHistory": "2-3 sentences analyzing their typical grant patterns and preferences",
  "decisionMakers": "Who makes funding decisions and how to reach them",
  "bestTimeToApply": "When to submit based on their grant cycles",
  "competitiveAdvantage": "What unique strengths to highlight",
  "recommendedAsk": "Suggested grant amount range based on their typical giving",
  "successProbability": (0-100 integer estimate),
  "nextSteps": ["3-4 immediate action items to pursue this opportunity"]
}`;

        const aiInsights = await generateJSON(
            [
                { role: 'system', content: PROMPTS.DONOR_INSIGHTS },
                { role: 'user', content: userPrompt },
            ],
            { temperature: 0.5 }
        );

        return NextResponse.json({
            success: true,
            donorId: id,
            enrichment_status: 'completed',
            enriched_at: new Date().toISOString(),
            ai_insights: {
                summary: aiInsights.summary || 'Analysis pending.',
                keyOpportunities: aiInsights.keyOpportunities || [],
                approachStrategy: aiInsights.approachStrategy || '',
                grantHistory: aiInsights.grantHistory || '',
                decisionMakers: aiInsights.decisionMakers || '',
                bestTimeToApply: aiInsights.bestTimeToApply || '',
                competitiveAdvantage: aiInsights.competitiveAdvantage || '',
                recommendedAsk: aiInsights.recommendedAsk || donor?.funding_range || 'Unknown',
                successProbability: aiInsights.successProbability || 50,
                nextSteps: aiInsights.nextSteps || [],
            },
        });

    } catch (error) {
        console.error('Donor enrichment error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
