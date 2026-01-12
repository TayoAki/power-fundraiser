/**
 * Campaign Detail API
 * GET /api/campaigns/[id] - Get campaign details
 * PUT /api/campaigns/[id] - Update campaign
 * DELETE /api/campaigns/[id] - Delete campaign
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request, { params }) {
    try {
        const { id } = await params;

        // Demo mode
        if (id.startsWith('demo-') || id.startsWith('local-')) {
            return NextResponse.json({
                success: true,
                campaign: null,
                source: 'demo',
            });
        }

        const { data, error } = await supabase
            .from('campaigns')
            .select(`
                *,
                campaign_donors (
                    *,
                    donor:donors (*)
                )
            `)
            .eq('id', id)
            .single();

        if (error) {
            return NextResponse.json({
                success: false,
                error: error.message,
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            campaign: data,
            source: 'supabase',
        });

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

        if (id.startsWith('demo-') || id.startsWith('local-')) {
            return NextResponse.json({
                success: true,
                campaign: { id, ...body },
                source: 'demo',
            });
        }

        const { data, error } = await supabase
            .from('campaigns')
            .update(body)
            .eq('id', id)
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
            campaign: data,
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

        if (id.startsWith('demo-') || id.startsWith('local-')) {
            return NextResponse.json({ success: true, source: 'demo' });
        }

        const { error } = await supabase
            .from('campaigns')
            .delete()
            .eq('id', id);

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
