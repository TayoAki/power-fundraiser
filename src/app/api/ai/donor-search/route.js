/**
 * Donor Discovery API
 * POST /api/ai/donor-search
 * 
 * Uses Modal unified-donor-discovery-api for real 990-PF data + government grants
 */

import { NextResponse } from 'next/server';

const MODAL_API_URL = 'https://tayo--unified-donor-discovery-api-discover.modal.run';

export async function POST(request) {
    console.log('🔍 [API/donor-search] Received search request');
    
    try {
        const body = await request.json();
        const {
            organizationName,
            mission,
            zipCode,
            focusAreas,
            fundingRange,
            donorCount = 10,
        } = body;

        console.log('📋 [API/donor-search] Search params:', { organizationName, zipCode, donorCount });

        if (!mission && !organizationName) {
            return NextResponse.json(
                { success: false, error: 'Organization name or mission is required' },
                { status: 400 }
            );
        }

        console.log('🤖 [API/donor-search] Calling Modal API...');
        const startTime = Date.now();
        
        // Call Modal unified-donor-discovery-api
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

        if (!modalResponse.ok) {
            const errorText = await modalResponse.text();
            console.error('❌ [API/donor-search] Modal API error:', modalResponse.status, errorText);
            throw new Error(`Modal API error: ${modalResponse.status}`);
        }

        const result = await modalResponse.json();
        const elapsed = Date.now() - startTime;
        
        console.log('✅ [API/donor-search] Modal API responded in', elapsed, 'ms');
        console.log('✅ [API/donor-search] Donors returned:', result.donors?.length || 0);

        if (!result.success || !result.donors || result.donors.length === 0) {
            throw new Error('No donors returned from Modal API');
        }

        // Pass through the donors (Modal API already formats them correctly)
        const donors = result.donors.map(donor => ({
            ...donor,
            // Ensure consistent status field
            status: donor.status || 'Research',
        }));
        
        console.log('📊 [API/donor-search] First donor:', donors[0]?.name);
        console.log('📊 [API/donor-search] Source types:', [...new Set(donors.map(d => d.source))]);

        return NextResponse.json({
            success: true,
            donors: donors,
            count: donors.length,
            searchParams: { organizationName, mission, zipCode },
            elapsed_seconds: result.elapsed_seconds || (elapsed / 1000),
        });

    } catch (error) {
        console.error('❌ [API/donor-search] Error:', error.message);
        
        return NextResponse.json({
            success: false,
            error: error.message,
            donors: [],
            count: 0,
        }, { status: 500 });
    }
}
