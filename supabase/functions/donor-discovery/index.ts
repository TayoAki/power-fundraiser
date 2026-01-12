/**
 * Supabase Edge Function: Donor Discovery
 * 
 * Long-running edge function that calls Modal API for donor search.
 * Updates job status in donor_search_jobs table as it progresses.
 * 
 * To deploy:
 * supabase functions deploy donor-discovery
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODAL_API_URL = 'https://tayo--unified-donor-discovery-api-discover.modal.run';

interface DiscoveryRequest {
    jobId: string;
    organizationName: string;
    mission: string;
    zipCode?: string;
    focusAreas?: string;
    donorCount?: number;
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const params: DiscoveryRequest = await req.json();
        const {
            jobId,
            organizationName,
            mission,
            zipCode = '',
            focusAreas = '',
            donorCount = 50,
        } = params;

        if (!jobId) {
            return new Response(
                JSON.stringify({ error: 'jobId is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`🚀 [Edge] Starting donor discovery for job: ${jobId}`);

        // Update job status to processing
        await supabase
            .from('donor_search_jobs')
            .update({
                status: 'processing',
                progress: 10,
                stage: 'Connecting to donor databases...',
                started_at: new Date().toISOString(),
            })
            .eq('id', jobId);

        // Progress update helper
        const updateProgress = async (progress: number, stage: string) => {
            await supabase
                .from('donor_search_jobs')
                .update({ progress, stage })
                .eq('id', jobId);
            console.log(`📊 [Edge] Job ${jobId}: ${progress}% - ${stage}`);
        };

        // Update progress stages
        await updateProgress(20, 'Scanning foundation databases...');

        // Call Modal API
        console.log(`🤖 [Edge] Calling Modal API...`);
        const startTime = Date.now();

        await updateProgress(30, 'Searching 990-PF filings...');

        const modalResponse = await fetch(MODAL_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                organizationName: organizationName || 'Nonprofit Organization',
                mission: mission || 'Community impact and social good',
                zipCode: zipCode || '',
                focusAreas: focusAreas || 'General philanthropy',
                donorCount: donorCount,
            }),
        });

        await updateProgress(70, 'Processing foundation and grant data...');

        if (!modalResponse.ok) {
            const errorText = await modalResponse.text();
            console.error(`❌ [Edge] Modal API error: ${modalResponse.status}`, errorText);
            throw new Error(`Modal API error: ${modalResponse.status}`);
        }

        const result = await modalResponse.json();
        const elapsed = Date.now() - startTime;

        console.log(`✅ [Edge] Modal API responded in ${elapsed}ms`);
        console.log(`✅ [Edge] Donors returned: ${result.donors?.length || 0}`);

        await updateProgress(90, 'Ranking and scoring results...');

        if (!result.success || !result.donors || result.donors.length === 0) {
            throw new Error('No donors returned from Modal API');
        }

        // Add status field to donors
        const donors = result.donors.map((donor: any) => ({
            ...donor,
            status: donor.status || 'Research',
        }));

        // Update job with results
        await supabase
            .from('donor_search_jobs')
            .update({
                status: 'complete',
                progress: 100,
                stage: 'Search complete!',
                results: donors,
                completed_at: new Date().toISOString(),
            })
            .eq('id', jobId);

        console.log(`✅ [Edge] Job complete: ${jobId}, ${donors.length} donors found`);

        return new Response(
            JSON.stringify({
                success: true,
                jobId,
                donorCount: donors.length,
                elapsed_seconds: elapsed / 1000,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error(`❌ [Edge] Error:`, error.message);

        // Try to get jobId from request for error update
        try {
            const body = await req.clone().json();
            if (body.jobId) {
                await supabase
                    .from('donor_search_jobs')
                    .update({
                        status: 'error',
                        error_message: error.message,
                        completed_at: new Date().toISOString(),
                    })
                    .eq('id', body.jobId);
            }
        } catch (e) {
            // Ignore parse errors
        }

        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
