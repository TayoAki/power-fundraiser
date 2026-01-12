/**
 * AI Donor Strategy Insight Generator
 * POST /api/ai/donor-insight
 * 
 * Generates personalized strategy insights for approaching a specific donor
 */

import { NextResponse } from 'next/server';
import { generateJSON } from '@/lib/openrouter';

const INSIGHT_PROMPT = `You are an expert fundraising strategist and grant writer with deep knowledge of foundation research, donor cultivation, and nonprofit fundraising. Your role is to provide actionable insights and strategic guidance for approaching potential donors.

Analyze the donor/foundation and provide comprehensive, specific insights in JSON format with these fields:
- summary: A compelling 2-3 sentence explanation of why this donor is an excellent match
- keyOpportunities: Array of 3-5 specific funding opportunities or programs
- approachStrategy: Detailed 3-4 sentence strategy for how to approach this donor
- grantHistory: 2-3 sentences about their typical grant patterns
- decisionMakers: Who typically makes funding decisions
- bestTimeToApply: When to submit proposals based on their cycle
- competitiveAdvantage: Your unique strengths for this donor

Return a JSON object with this schema:
{
  "summary": "Compelling explanation of donor match...",
  "keyOpportunities": ["Opportunity 1", "Opportunity 2", "Opportunity 3"],
  "approachStrategy": "Detailed approach strategy...",
  "grantHistory": "Typical grant patterns...",
  "decisionMakers": "Key decision makers...",
  "bestTimeToApply": "Optimal timing...",
  "competitiveAdvantage": "Your unique strengths..."
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
                summary: "This foundation's focus areas and giving history suggest strong alignment with your mission. Their track record of supporting similar organizations makes them an excellent prospect.",
                keyOpportunities: [
                    "General operating support",
                    "Program-specific funding",
                    "Capacity building grants"
                ],
                approachStrategy: "Begin with a brief introductory email highlighting shared values. Follow up with a formal letter of inquiry within 2 weeks. Request an informational call to discuss potential alignment. Prepare a concise one-pager about your organization.",
                grantHistory: "This foundation typically makes grants in the range shown above. They tend to support organizations with established track records in their focus areas.",
                decisionMakers: "Contact the program officer or executive director for initial outreach.",
                bestTimeToApply: "Review their website for application deadlines. Most foundations have quarterly or annual cycles.",
                competitiveAdvantage: "Your mission alignment and local presence make you a strong candidate."
            },
            fallback: true,
            error: error.message,
        });
    }
}
