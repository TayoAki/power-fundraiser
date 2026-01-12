/**
 * Donor Search API
 * POST /api/donors/search
 * 
 * Searches for donors matching organization's mission and criteria.
 * Uses Supabase for data + OpenRouter AI for generating insights.
 */

import { NextResponse } from 'next/server';
import { generateJSON, PROMPTS } from '@/lib/openrouter';
import { supabase } from '@/lib/supabase';

// Fallback mock foundations data (used when Supabase is empty)
const MOCK_FOUNDATIONS = [
    {
        id: 'f1',
        name: 'The Bill & Melinda Gates Foundation',
        category: 'Foundation',
        tier: 'NATIONAL',
        ein: '56-2618866',
        city: 'Seattle',
        state: 'WA',
        website: 'https://www.gatesfoundation.org',
        total_assets: 50700000000,
        total_giving: 5800000000,
        funding_range: '$500K+',
        focus_areas: 'Global Health, Education, Poverty Alleviation, Technology',
        description: 'The largest private foundation in the world, focused on enhancing healthcare and reducing extreme poverty globally.',
        principal_officer: 'Mark Suzman',
        officers: [
            { name: 'Mark Suzman', title: 'CEO' },
            { name: 'Melinda French Gates', title: 'Co-Chair' },
        ],
    },
    {
        id: 'f2',
        name: 'Ford Foundation',
        category: 'Foundation',
        tier: 'NATIONAL',
        ein: '13-1684331',
        city: 'New York',
        state: 'NY',
        website: 'https://www.fordfoundation.org',
        total_assets: 16000000000,
        total_giving: 600000000,
        funding_range: '$100K - $500K',
        focus_areas: 'Social Justice, Democracy, Economic Fairness, Arts & Culture',
        description: 'One of the largest philanthropic institutions dedicated to reducing poverty and injustice.',
        principal_officer: 'Darren Walker',
        officers: [
            { name: 'Darren Walker', title: 'President' },
        ],
    },
    {
        id: 'f3',
        name: 'The Rockefeller Foundation',
        category: 'Foundation',
        tier: 'NATIONAL',
        ein: '13-1659629',
        city: 'New York',
        state: 'NY',
        website: 'https://www.rockefellerfoundation.org',
        total_assets: 6000000000,
        total_giving: 200000000,
        funding_range: '$100K - $500K',
        focus_areas: 'Climate, Food Security, Health Equity, Economic Opportunity',
        description: 'Promotes the well-being of humanity through science, data, and innovation.',
        principal_officer: 'Rajiv Shah',
        officers: [
            { name: 'Rajiv Shah', title: 'President' },
        ],
    },
    {
        id: 'f4',
        name: 'Robert Wood Johnson Foundation',
        category: 'Foundation',
        tier: 'NATIONAL',
        ein: '22-2540900',
        city: 'Princeton',
        state: 'NJ',
        website: 'https://www.rwjf.org',
        total_assets: 13500000000,
        total_giving: 500000000,
        funding_range: '$100K - $500K',
        focus_areas: 'Health Equity, Healthcare Systems, Community Health',
        description: 'The nation\'s largest philanthropy dedicated solely to health.',
        principal_officer: 'Richard Besser',
        officers: [
            { name: 'Richard Besser', title: 'President & CEO' },
        ],
    },
    {
        id: 'f5',
        name: 'The Kresge Foundation',
        category: 'Foundation',
        tier: 'NATIONAL',
        ein: '38-1359217',
        city: 'Troy',
        state: 'MI',
        website: 'https://kresge.org',
        total_assets: 4200000000,
        total_giving: 180000000,
        funding_range: '$100K - $250K',
        focus_areas: 'Arts & Culture, Education, Environment, Health, Human Services',
        description: 'Expands opportunity for low-income people in American cities.',
        principal_officer: 'Rip Rapson',
        officers: [
            { name: 'Rip Rapson', title: 'President & CEO' },
        ],
    },
    {
        id: 'f6',
        name: 'Walton Family Foundation',
        category: 'Foundation',
        tier: 'NATIONAL',
        ein: '13-6025857',
        city: 'Bentonville',
        state: 'AR',
        website: 'https://www.waltonfamilyfoundation.org',
        total_assets: 8500000000,
        total_giving: 750000000,
        funding_range: '$250K+',
        focus_areas: 'K-12 Education Reform, Environment, Regional Development',
        description: 'Family foundation focused on improving K-12 education and protecting the environment.',
        principal_officer: 'Kyle Peterson',
        officers: [
            { name: 'Kyle Peterson', title: 'Executive Director' },
        ],
    },
];

// Generate AI insights using OpenRouter
async function generateAIInsights(donor, orgMission, causeAreas) {
    try {
        const userPrompt = `Analyze this foundation for a nonprofit seeking funding:

FOUNDATION:
Name: ${donor.name}
Focus Areas: ${donor.focus_areas}
Description: ${donor.description}
Total Assets: $${(donor.total_assets || 0).toLocaleString()}
Annual Giving: $${(donor.total_giving || 0).toLocaleString()}
Typical Grant Range: ${donor.funding_range || 'Unknown'}
Location: ${donor.city}, ${donor.state}
Key Officers: ${donor.officers?.map(o => `${o.name} (${o.title})`).join(', ') || 'Unknown'}

NONPROFIT CONTEXT:
Mission: ${orgMission || 'Not provided'}
Cause Areas: ${causeAreas?.join(', ') || 'Not provided'}

Provide your analysis as JSON with these exact fields:
{
  "alignmentScore": (0-100 integer based on mission alignment),
  "summary": "2-3 sentence explanation of why this is a good match",
  "keyOpportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
  "approachStrategy": "3-4 sentence specific strategy for approaching this donor",
  "recommendedAsk": "suggested grant amount range",
  "bestTimeToApply": "when to submit based on typical foundation cycles"
}`;

        const insights = await generateJSON(
            [
                { role: 'system', content: PROMPTS.DONOR_INSIGHTS },
                { role: 'user', content: userPrompt },
            ],
            { temperature: 0.5 }
        );

        return {
            summary: insights.summary || `${donor.name} shows potential alignment with your mission.`,
            keyOpportunities: insights.keyOpportunities || ['Review their funding priorities', 'Submit a Letter of Inquiry'],
            approachStrategy: insights.approachStrategy || 'Begin with a Letter of Inquiry highlighting your mission alignment.',
            recommendedAsk: insights.recommendedAsk || donor.funding_range,
            bestTimeToApply: insights.bestTimeToApply || 'Review their grant calendar',
            alignmentScore: insights.alignmentScore || 50,
        };
    } catch (error) {
        console.error('AI insights generation error:', error);
        // Fallback to basic insights
        return {
            summary: `${donor.name} shows potential alignment with your mission. Their focus on ${donor.focus_areas?.split(',')[0] || 'philanthropy'} may create partnership opportunities.`,
            keyOpportunities: [
                `Explore their ${donor.focus_areas?.split(',')[0] || 'funding'} programs`,
                'Review their grant guidelines',
                'Identify mutual connections',
            ],
            approachStrategy: `Begin with a Letter of Inquiry highlighting your work. Emphasize measurable outcomes and community impact.`,
            alignmentScore: 50,
        };
    }
}

export async function POST(request) {
    try {
        console.log('🔍 [API/donors/search] Received search request');
        const body = await request.json();
        const {
            query,
            organizationMission,
            causeAreas = [],
            targetRegion,
            grantSizeMin,
            grantSizeMax,
            donorType,
        } = body;
        console.log('📋 [API/donors/search] Query:', query, '| Mission:', organizationMission?.slice(0, 50), '| Cause areas:', causeAreas);

        // Try to fetch donors from Supabase first
        let filteredDonors = [];
        let dataSource = 'mock';
        
        try {
            console.log('🗄️ [API/donors/search] Querying Supabase...');
            let supabaseQuery = supabase.from('donors').select('*');
            
            // Apply filters at database level
            if (query) {
                supabaseQuery = supabaseQuery.or(`name.ilike.%${query}%,focus_areas.ilike.%${query}%,description.ilike.%${query}%`);
            }
            if (donorType && donorType !== 'all') {
                supabaseQuery = supabaseQuery.eq('category', donorType);
            }
            if (targetRegion && targetRegion !== 'All Regions' && !targetRegion.includes('National')) {
                supabaseQuery = supabaseQuery.eq('state', targetRegion);
            }
            
            const { data, error } = await supabaseQuery.limit(50);
            
            if (!error && data && data.length > 0) {
                console.log('✅ [API/donors/search] Supabase returned', data.length, 'donors');
                filteredDonors = data;
                dataSource = 'supabase';
            } else {
                console.log('⚠️ [API/donors/search] Supabase empty/error, using mock data. Error:', error?.message);
                filteredDonors = [...MOCK_FOUNDATIONS];
            }
        } catch (dbError) {
            console.log('❌ [API/donors/search] Supabase query failed:', dbError.message);
            filteredDonors = [...MOCK_FOUNDATIONS];
        }
        
        // If using mock data, apply filters locally
        if (dataSource === 'mock') {
            if (query) {
                const queryLower = query.toLowerCase();
                filteredDonors = filteredDonors.filter(d => 
                    d.name.toLowerCase().includes(queryLower) ||
                    d.focus_areas?.toLowerCase().includes(queryLower) ||
                    d.description?.toLowerCase().includes(queryLower)
                );
            }

            if (donorType && donorType !== 'all') {
                filteredDonors = filteredDonors.filter(d => d.category === donorType);
            }

            if (targetRegion && targetRegion !== 'All Regions') {
                filteredDonors = filteredDonors.filter(d => 
                    d.state === targetRegion || 
                    (targetRegion.includes('National') && d.tier === 'NATIONAL')
                );
            }
        }

        // Generate AI insights for each donor (in parallel for speed)
        console.log('🤖 [API/donors/search] Generating AI insights for', filteredDonors.length, 'donors...');
        const startTime = Date.now();
        
        const results = await Promise.all(
            filteredDonors.map(async (donor, index) => {
                console.log(`🔄 [API/donors/search] Processing donor ${index + 1}/${filteredDonors.length}: ${donor.name}`);
                const aiInsights = await generateAIInsights(donor, organizationMission, causeAreas);
                
                return {
                    ...donor,
                    alignment_score: aiInsights.alignmentScore,
                    ai_insights: aiInsights,
                    enrichment_status: 'completed',
                    enriched_at: new Date().toISOString(),
                };
            })
        );

        const elapsed = Date.now() - startTime;
        console.log(`✅ [API/donors/search] AI insights generated in ${elapsed}ms`);

        // Sort by alignment score
        results.sort((a, b) => b.alignment_score - a.alignment_score);
        console.log('📊 [API/donors/search] Top 3 scores:', results.slice(0, 3).map(d => `${d.name}: ${d.alignment_score}`));

        return NextResponse.json({
            success: true,
            donors: results,
            total: results.length,
            dataSource,
            searchParams: { query, organizationMission, causeAreas, targetRegion },
        });

    } catch (error) {
        console.error('❌ [API/donors/search] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
