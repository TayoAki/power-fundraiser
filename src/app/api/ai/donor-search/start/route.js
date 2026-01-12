/**
 * Start Donor Search Job
 * POST /api/ai/donor-search/start
 * 
 * Creates a job in Supabase and triggers Modal API in background
 * Returns job ID immediately for polling
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const MODAL_API_URL = 'https://tayo--unified-donor-discovery-api-discover.modal.run';

export async function POST(request) {
    console.log('🚀 [API/donor-search/start] Starting new search job...');
    
    try {
        const body = await request.json();
        const {
            organizationName,
            mission,
            zipCode,
            focusAreas,
            donorCount = 50,
        } = body;

        console.log('📋 [API/donor-search/start] Params:', { organizationName, zipCode, donorCount });

        if (!mission && !organizationName) {
            return NextResponse.json(
                { success: false, error: 'Organization name or mission is required' },
                { status: 400 }
            );
        }

        // Create job record in Supabase
        const { data: job, error: jobError } = await supabase
            .from('donor_search_jobs')
            .insert({
                status: 'pending',
                progress: 0,
                stage: 'Initializing search...',
                organization_name: organizationName,
                mission: mission,
                zip_code: zipCode,
                focus_areas: focusAreas,
                donor_count: donorCount,
            })
            .select()
            .single();

        if (jobError) {
            console.error('❌ [API/donor-search/start] Failed to create job:', jobError);
            return NextResponse.json(
                { success: false, error: 'Failed to create search job' },
                { status: 500 }
            );
        }

        console.log('✅ [API/donor-search/start] Created job:', job.id);

        // Trigger the background processing (fire and forget)
        // This runs async - we don't await it
        processSearchJob(job.id, {
            organizationName,
            mission,
            zipCode,
            focusAreas,
            donorCount,
        });

        return NextResponse.json({
            success: true,
            jobId: job.id,
            message: 'Search started. Poll /api/ai/donor-search/status for results.',
        });

    } catch (error) {
        console.error('❌ [API/donor-search/start] Error:', error.message);
        return NextResponse.json({
            success: false,
            error: error.message,
        }, { status: 500 });
    }
}

/**
 * Background job processor
 * Updates job status in Supabase as it progresses
 */
async function processSearchJob(jobId, params) {
    console.log('🔄 [Background] Processing job:', jobId);
    
    try {
        // Update status to processing
        await supabase
            .from('donor_search_jobs')
            .update({
                status: 'processing',
                progress: 10,
                stage: 'Connecting to donor databases...',
                started_at: new Date().toISOString(),
            })
            .eq('id', jobId);

        // Simulate progress updates
        const progressUpdates = [
            { progress: 20, stage: 'Scanning foundation databases...' },
            { progress: 35, stage: 'Matching mission with donor priorities...' },
            { progress: 50, stage: 'Researching local foundations...' },
            { progress: 65, stage: 'Analyzing 990-PF financial filings...' },
            { progress: 80, stage: 'Evaluating government grants...' },
            { progress: 90, stage: 'Ranking and scoring results...' },
        ];

        // Start progress updates in background
        let progressIndex = 0;
        const progressInterval = setInterval(async () => {
            if (progressIndex < progressUpdates.length) {
                await supabase
                    .from('donor_search_jobs')
                    .update(progressUpdates[progressIndex])
                    .eq('id', jobId);
                progressIndex++;
            }
        }, 15000); // Update every 15 seconds

        // Call Modal API
        console.log('🤖 [Background] Calling Modal API...');
        const startTime = Date.now();
        
        const modalResponse = await fetch(MODAL_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                organizationName: params.organizationName || 'Nonprofit Organization',
                mission: params.mission || 'Community impact and social good',
                zipCode: params.zipCode || '',
                focusAreas: params.focusAreas || 'General philanthropy',
                donorCount: params.donorCount,
            }),
        });

        clearInterval(progressInterval);

        if (!modalResponse.ok) {
            const errorText = await modalResponse.text();
            console.error('❌ [Background] Modal API error:', modalResponse.status, errorText);
            throw new Error(`Modal API error: ${modalResponse.status}`);
        }

        const result = await modalResponse.json();
        const elapsed = Date.now() - startTime;
        
        console.log('✅ [Background] Modal API responded in', elapsed, 'ms');
        console.log('✅ [Background] Donors returned:', result.donors?.length || 0);

        if (!result.success || !result.donors || result.donors.length === 0) {
            throw new Error('No donors returned from Modal API');
        }

        // Add status field to donors
        const donors = result.donors.map(donor => ({
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

        console.log('✅ [Background] Job complete:', jobId);

    } catch (error) {
        console.error('❌ [Background] Job failed:', jobId, error.message);
        
        // Update job with error
        await supabase
            .from('donor_search_jobs')
            .update({
                status: 'error',
                error_message: error.message,
                completed_at: new Date().toISOString(),
            })
            .eq('id', jobId);
    }
}
