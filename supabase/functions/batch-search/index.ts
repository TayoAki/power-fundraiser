/**
 * Supabase Edge Function: Batch Donor Search
 * 
 * Background processing for campaign donor discovery.
 * Searches 990-PF database for matching donors based on campaign criteria.
 * 
 * MOCK: Returns filtered mock data
 * REAL: Will call Modal for 990-PF search + OpenRouter for AI matching
 * 
 * To deploy:
 * supabase functions deploy batch-search
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
    campaignId: string;
    organizationMission: string;
    causeAreas: string[];
    targetRegion?: string;
    grantSizeMin?: number;
    grantSizeMax?: number;
    limit?: number;
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const searchParams: SearchRequest = await req.json();
        const {
            campaignId,
            organizationMission,
            causeAreas = [],
            targetRegion,
            grantSizeMin,
            grantSizeMax,
            limit = 50,
        } = searchParams;

        if (!campaignId) {
            return new Response(
                JSON.stringify({ error: 'campaignId is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // ================================================================
        // MOCK: Search existing donors table
        // REAL: Call Modal to search 990-PF database, then upsert results
        // ================================================================

        // TODO: Replace with Modal call for external 990-PF search
        // const modalResponse = await fetch('https://your-modal-endpoint.modal.run/search-990', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({
        //         keywords: causeAreas,
        //         region: targetRegion,
        //         grantSizeMin,
        //         grantSizeMax,
        //         limit,
        //     }),
        // });
        // const externalDonors = await modalResponse.json();

        // For now, search existing donors
        let query = supabase
            .from('donors')
            .select('*')
            .limit(limit);

        // Apply filters
        if (targetRegion && targetRegion !== 'All Regions') {
            if (targetRegion.includes('National')) {
                query = query.eq('tier', 'NATIONAL');
            } else {
                query = query.eq('state', targetRegion);
            }
        }

        if (grantSizeMin) {
            query = query.gte('giving_range_min', grantSizeMin);
        }

        const { data: donors, error } = await query;

        if (error) {
            throw error;
        }

        // ================================================================
        // Calculate alignment scores
        // REAL: Use OpenRouter for semantic matching
        // ================================================================

        const scoredDonors = (donors || []).map((donor: any) => {
            // Simple keyword matching (replace with AI scoring)
            let score = 50;
            const donorText = `${donor.name} ${donor.focus_areas} ${donor.description}`.toLowerCase();
            const missionLower = organizationMission.toLowerCase();

            // Check for keyword matches
            const keywords = missionLower.split(/\s+/).filter((w: string) => w.length > 4);
            keywords.forEach((keyword: string) => {
                if (donorText.includes(keyword)) score += 5;
            });

            causeAreas.forEach((cause: string) => {
                if (donorText.includes(cause.toLowerCase())) score += 10;
            });

            return {
                ...donor,
                alignment_score: Math.min(100, Math.max(0, score)),
            };
        });

        // Sort by alignment score
        scoredDonors.sort((a: any, b: any) => b.alignment_score - a.alignment_score);

        // Optionally add top matches to campaign
        // This could be automatic or require user confirmation
        const searchId = `search-${Date.now()}`;

        return new Response(
            JSON.stringify({
                success: true,
                searchId,
                campaignId,
                donors: scoredDonors,
                total: scoredDonors.length,
                searchParams: {
                    organizationMission: organizationMission.slice(0, 100) + '...',
                    causeAreas,
                    targetRegion,
                    grantSizeMin,
                    grantSizeMax,
                },
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Batch search error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
