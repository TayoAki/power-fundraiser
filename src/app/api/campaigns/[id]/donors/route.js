/**
 * Campaign Donors API
 * GET /api/campaigns/[id]/donors - List donors in campaign
 * POST /api/campaigns/[id]/donors - Add donor to campaign
 * DELETE /api/campaigns/[id]/donors - Remove donor from campaign
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request, { params }) {
    try {
        const { id } = await params;

        if (id.startsWith('demo-') || id.startsWith('local-')) {
            return NextResponse.json({
                success: true,
                donors: [],
                source: 'demo',
            });
        }

        const { data, error } = await supabase
            .from('campaign_donors')
            .select(`
                *,
                donor:donors (*)
            `)
            .eq('campaign_id', id)
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({
                success: true,
                donors: [],
                source: 'fallback',
            });
        }

        return NextResponse.json({
            success: true,
            donors: data || [],
            source: 'supabase',
        });

    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error.message,
        }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { donorId, stage = 'research', isRejected = false } = body;

        if (!donorId) {
            return NextResponse.json({
                success: false,
                error: 'Donor ID is required',
            }, { status: 400 });
        }

        if (id.startsWith('demo-') || id.startsWith('local-')) {
            return NextResponse.json({
                success: true,
                campaignDonor: {
                    id: `cd-${Date.now()}`,
                    campaign_id: id,
                    donor_id: donorId,
                    pipeline_stage: stage,
                    is_rejected: isRejected,
                },
                source: 'demo',
            });
        }

        const { data, error } = await supabase
            .from('campaign_donors')
            .insert({
                campaign_id: id,
                donor_id: donorId,
                pipeline_stage: stage,
                is_rejected: isRejected,
            })
            .select(`
                *,
                donor:donors (*)
            `)
            .single();

        if (error) {
            // Check if it's a duplicate
            if (error.code === '23505') {
                return NextResponse.json({
                    success: false,
                    error: 'Donor already in campaign',
                }, { status: 409 });
            }
            
            return NextResponse.json({
                success: true,
                campaignDonor: {
                    id: `local-${Date.now()}`,
                    campaign_id: id,
                    donor_id: donorId,
                    pipeline_stage: stage,
                    is_rejected: isRejected,
                },
                source: 'fallback',
            });
        }

        return NextResponse.json({
            success: true,
            campaignDonor: data,
            source: 'supabase',
        });

    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error.message,
        }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const donorId = searchParams.get('donorId');

        if (!donorId) {
            return NextResponse.json({
                success: false,
                error: 'Donor ID is required',
            }, { status: 400 });
        }

        if (id.startsWith('demo-') || id.startsWith('local-')) {
            return NextResponse.json({ success: true, source: 'demo' });
        }

        const { error } = await supabase
            .from('campaign_donors')
            .delete()
            .eq('campaign_id', id)
            .eq('donor_id', donorId);

        if (error) {
            return NextResponse.json({
                success: false,
                error: error.message,
            }, { status: 500 });
        }

        return NextResponse.json({ success: true, source: 'supabase' });

    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error.message,
        }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { donorId, stage, isRejected } = body;

        if (!donorId) {
            return NextResponse.json({
                success: false,
                error: 'Donor ID is required',
            }, { status: 400 });
        }

        if (id.startsWith('demo-') || id.startsWith('local-')) {
            return NextResponse.json({
                success: true,
                campaignDonor: { campaign_id: id, donor_id: donorId, pipeline_stage: stage, is_rejected: isRejected },
                source: 'demo',
            });
        }

        const updates = {};
        if (stage !== undefined) updates.pipeline_stage = stage;
        if (isRejected !== undefined) updates.is_rejected = isRejected;

        const { data, error } = await supabase
            .from('campaign_donors')
            .update(updates)
            .eq('campaign_id', id)
            .eq('donor_id', donorId)
            .select()
            .single();

        if (error) {
            return NextResponse.json({
                success: false,
                error: error.message,
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            campaignDonor: data,
            source: 'supabase',
        });

    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error.message,
        }, { status: 500 });
    }
}
