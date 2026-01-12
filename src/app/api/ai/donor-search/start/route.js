/**
 * Start Donor Search Job
 * POST /api/ai/donor-search/start
 * 
 * Creates a job in Supabase and triggers Edge Function for Modal API call
 * Returns job ID immediately for polling
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Supabase Edge Function URL
const EDGE_FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/donor-discovery`;

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

        // Trigger Edge Function (fire and forget)
        // Edge Function handles the long-running Modal API call
        console.log('🔄 [API/donor-search/start] Invoking Edge Function...');
        
        fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
                jobId: job.id,
                organizationName,
                mission,
                zipCode,
                focusAreas,
                donorCount,
            }),
        }).catch(err => {
            console.error('❌ [API/donor-search/start] Edge Function invoke error:', err.message);
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
