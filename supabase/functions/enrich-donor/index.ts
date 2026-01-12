/**
 * Supabase Edge Function: Donor Enrichment
 * 
 * Background processing for donor data enrichment.
 * Triggered by database webhook when donor.enrichment_status = 'pending'
 * 
 * MOCK: Returns simulated enriched data
 * REAL: Will call Modal for 990-PF data pull + OpenRouter for AI insights
 * 
 * To deploy:
 * supabase functions deploy enrich-donor
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichmentRequest {
    donorId: string;
    organizationMission?: string;
}

interface AIInsights {
    summary: string;
    keyOpportunities: string[];
    approachStrategy: string;
    grantHistory?: Array<{ year: number; recipient: string; amount: number }>;
    recommendedAsk?: string;
    successProbability?: number;
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { donorId, organizationMission }: EnrichmentRequest = await req.json();

        if (!donorId) {
            return new Response(
                JSON.stringify({ error: 'donorId is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Update status to in_progress
        await supabase
            .from('donors')
            .update({ enrichment_status: 'in_progress' })
            .eq('id', donorId);

        // Get donor data
        const { data: donor, error: donorError } = await supabase
            .from('donors')
            .select('*')
            .eq('id', donorId)
            .single();

        if (donorError || !donor) {
            throw new Error(`Donor not found: ${donorId}`);
        }

        // ================================================================
        // MOCK: Generate enrichment data
        // REAL: Replace with Modal API call for 990-PF data
        // ================================================================
        
        // TODO: Replace with Modal call
        // const modalResponse = await fetch('https://your-modal-endpoint.modal.run/enrich', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ ein: donor.ein, name: donor.name }),
        // });
        // const modalData = await modalResponse.json();

        const mockEnrichmentData = {
            total_assets: donor.total_assets || Math.floor(Math.random() * 1000000000) + 100000000,
            total_giving: donor.total_giving || Math.floor(Math.random() * 50000000) + 1000000,
            officers: donor.officers || [
                { name: 'Program Director', title: 'Director of Grantmaking' },
                { name: 'Executive Director', title: 'CEO' },
            ],
            grants: [
                { year: 2024, recipient: 'Community Education Initiative', amount: 150000 },
                { year: 2024, recipient: 'Youth Development Program', amount: 75000 },
                { year: 2023, recipient: 'Healthcare Access Fund', amount: 200000 },
            ],
        };

        // ================================================================
        // MOCK: Generate AI insights
        // REAL: Replace with OpenRouter API call
        // ================================================================

        // TODO: Replace with OpenRouter call
        // const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        //     method: 'POST',
        //     headers: {
        //         'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        //         'Content-Type': 'application/json',
        //     },
        //     body: JSON.stringify({
        //         model: 'anthropic/claude-3.5-sonnet',
        //         messages: [
        //             { role: 'system', content: 'You are a nonprofit fundraising expert...' },
        //             { role: 'user', content: `Analyze this donor for alignment with mission: ${organizationMission}...` },
        //         ],
        //     }),
        // });

        const focusArea = donor.focus_areas?.split(',')[0]?.trim() || 'community development';
        
        const aiInsights: AIInsights = {
            summary: `${donor.name} shows strong potential for partnership based on their focus on ${focusArea}. Their giving history and foundation priorities align well with organizations working in this space.`,
            keyOpportunities: [
                `Annual grant cycle - submit LOI by Q1`,
                `Previous grants to similar organizations indicate receptivity`,
                `Focus on ${focusArea} matches your mission`,
                `Geographic presence in target service area`,
            ],
            approachStrategy: `We recommend starting with a Letter of Inquiry highlighting your ${focusArea} work. Emphasize measurable outcomes and community impact. Their program officers prefer data-driven proposals with clear success metrics.`,
            grantHistory: mockEnrichmentData.grants,
            recommendedAsk: '$75,000 - $150,000',
            successProbability: Math.floor(Math.random() * 30) + 60, // 60-90%
        };

        // Update donor with enriched data
        const { error: updateError } = await supabase
            .from('donors')
            .update({
                total_assets: mockEnrichmentData.total_assets,
                total_giving: mockEnrichmentData.total_giving,
                officers: mockEnrichmentData.officers,
                grants: mockEnrichmentData.grants,
                ai_insights: aiInsights,
                enrichment_status: 'completed',
                enriched_at: new Date().toISOString(),
            })
            .eq('id', donorId);

        if (updateError) {
            throw updateError;
        }

        return new Response(
            JSON.stringify({
                success: true,
                donorId,
                enrichment_status: 'completed',
                ai_insights: aiInsights,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Enrichment error:', error);

        // Try to update status to failed
        try {
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
            const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
            const supabase = createClient(supabaseUrl, supabaseKey);
            
            const body = await req.json().catch(() => ({}));
            if (body.donorId) {
                await supabase
                    .from('donors')
                    .update({ enrichment_status: 'failed' })
                    .eq('id', body.donorId);
            }
        } catch {}

        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
