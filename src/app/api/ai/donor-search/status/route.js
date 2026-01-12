/**
 * Check Donor Search Job Status
 * GET /api/ai/donor-search/status?jobId=xxx
 * 
 * Returns current job status and results when complete
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
        return NextResponse.json(
            { success: false, error: 'jobId is required' },
            { status: 400 }
        );
    }

    try {
        const { data: job, error } = await supabase
            .from('donor_search_jobs')
            .select('*')
            .eq('id', jobId)
            .single();

        if (error || !job) {
            console.error('❌ [API/donor-search/status] Job not found:', jobId);
            return NextResponse.json(
                { success: false, error: 'Job not found' },
                { status: 404 }
            );
        }

        // Return different response based on status
        if (job.status === 'complete') {
            return NextResponse.json({
                success: true,
                status: 'complete',
                progress: 100,
                stage: 'Search complete!',
                donors: job.results || [],
                count: job.results?.length || 0,
                elapsed_seconds: job.completed_at && job.started_at 
                    ? (new Date(job.completed_at) - new Date(job.started_at)) / 1000 
                    : null,
            });
        }

        if (job.status === 'error') {
            return NextResponse.json({
                success: false,
                status: 'error',
                error: job.error_message || 'Search failed',
                progress: job.progress,
                stage: job.stage,
            });
        }

        // Still processing
        return NextResponse.json({
            success: true,
            status: job.status, // 'pending' or 'processing'
            progress: job.progress,
            stage: job.stage,
        });

    } catch (error) {
        console.error('❌ [API/donor-search/status] Error:', error.message);
        return NextResponse.json({
            success: false,
            error: error.message,
        }, { status: 500 });
    }
}
