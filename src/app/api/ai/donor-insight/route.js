/**
 * AI Donor Strategy Insight Generator
 * POST /api/ai/donor-insight
 * 
 * Generates personalized strategy insights for approaching a specific donor
 */

import { NextResponse } from 'next/server';
import { generateJSON } from '@/lib/openrouter';

const INSIGHT_PROMPT = `You are an expert nonprofit fundraising strategist. Generate a personalized strategy insight for approaching a potential donor/foundation.

Based on the donor's 990-PF data and the nonprofit's mission, provide:
1. A strategic summary (2-3 sentences) explaining why this donor is a good fit
2. A suggested approach strategy (3-4 sentences) with specific action steps
3. Key talking points (3-5 bullet points) to use when reaching out

Consider:
- The donor's giving history and focus areas
- Geographic alignment
- The nonprofit's mission and programs
- Best practices for foundation outreach
- Timing and deadlines

Return a JSON object with this schema:
{
  "summary": "Strategic insight summary...",
  "approachStrategy": "Step-by-step approach recommendation...",
  "talkingPoints": ["Point 1", "Point 2", "Point 3"],
  "estimatedTimeline": "2-4 weeks",
  "confidenceScore": 85
}`;

export async function POST(request) {
    console.log('🧠 [API/donor-insight] Generating strategy insight...');
    
    try {
        const body = await request.json();
        const { donor, organization } = body;

        if (!donor || !donor.name) {
            return NextResponse.json(
                { success: false, error: 'Donor information is required' },
                { status: 400 }
            );
        }

        // Build context for the AI
        const donorContext = `
DONOR/FOUNDATION: ${donor.name}
CATEGORY: ${donor.category || 'Foundation'}
LOCATION: ${donor.location || 'Unknown'}
TOTAL ASSETS: ${donor.total_assets ? `$${(donor.total_assets / 1000000).toFixed(1)}M` : 'Unknown'}
ANNUAL GIVING: ${donor.annual_giving ? `$${(donor.annual_giving / 1000000).toFixed(1)}M` : 'Unknown'}
FOCUS AREAS: ${donor.focus_areas || 'General philanthropy'}
DEADLINE: ${donor.deadline || 'Rolling'}
FUNDING RANGE: ${donor.funding_range || 'Varies'}
PRINCIPAL OFFICER: ${donor.principal_officer || 'Unknown'}
EIN: ${donor.ein || 'Unknown'}

${donor.recent_grants?.length > 0 ? `
RECENT GRANTS (sample):
${donor.recent_grants.slice(0, 5).map(g => `- ${g.recipient_name}: $${g.amount?.toLocaleString() || 'Unknown'}`).join('\n')}
` : ''}

${donor.officers?.length > 0 ? `
KEY OFFICERS:
${donor.officers.slice(0, 3).map(o => `- ${o.name}, ${o.title}`).join('\n')}
` : ''}
`;

        const orgContext = `
NONPROFIT: ${organization?.name || 'Our Organization'}
MISSION: ${organization?.mission || 'Community impact and social good'}
LOCATION: ${organization?.zipCode || 'National'}
FOCUS AREAS: ${organization?.focusAreas || 'General programs'}
`;

        const userPrompt = `Generate a strategic insight for this nonprofit approaching this donor:

${orgContext}

${donorContext}

Provide actionable, specific recommendations based on the donor's giving patterns and the nonprofit's mission alignment.`;

        const messages = [
            { role: 'system', content: INSIGHT_PROMPT },
            { role: 'user', content: userPrompt }
        ];

        console.log('🤖 [API/donor-insight] Calling Gemini...');
        const startTime = Date.now();
        
        const insight = await generateJSON(messages, {
            maxTokens: 1000,
            temperature: 0.7,
        });

        const elapsed = Date.now() - startTime;
        console.log('✅ [API/donor-insight] Generated insight in', elapsed, 'ms');

        return NextResponse.json({
            success: true,
            insight: insight,
            donorId: donor.id,
            elapsed_ms: elapsed,
        });

    } catch (error) {
        console.error('❌ [API/donor-insight] Error:', error.message);
        
        // Return a fallback insight
        return NextResponse.json({
            success: true,
            insight: {
                summary: "This foundation's focus areas and giving history suggest strong alignment with your mission. Consider reaching out to their program officer with a personalized introduction.",
                approachStrategy: "Begin with a brief introductory email highlighting shared values. Follow up with a formal letter of inquiry within 2 weeks. Request an informational call to discuss potential alignment.",
                talkingPoints: [
                    "Highlight your organization's track record in their focus areas",
                    "Mention geographic alignment if applicable",
                    "Reference similar grants they've made to comparable organizations"
                ],
                estimatedTimeline: "4-6 weeks",
                confidenceScore: 70,
            },
            fallback: true,
            error: error.message,
        });
    }
}
