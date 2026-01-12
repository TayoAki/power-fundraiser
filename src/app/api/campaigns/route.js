/**
 * Campaigns API
 * GET /api/campaigns - List campaigns
 * POST /api/campaigns - Create campaign
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        
        // For demo mode, return from localStorage simulation
        if (userId === 'demo-user') {
            return NextResponse.json({
                success: true,
                campaigns: [],
                source: 'demo',
            });
        }

        const { data, error } = await supabase
            .from('campaigns')
            .select(`
                *,
                campaign_donors (
                    id,
                    donor_id,
                    pipeline_stage,
                    is_rejected
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            // Table might not exist - return empty
            console.error('Campaigns fetch error:', error);
            return NextResponse.json({
                success: true,
                campaigns: [],
                source: 'fallback',
            });
        }

        return NextResponse.json({
            success: true,
            campaigns: data || [],
            source: 'supabase',
        });

    } catch (error) {
        console.error('Campaigns API error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
        }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { name, description, userId, searchConfig } = body;

        if (!name) {
            return NextResponse.json({
                success: false,
                error: 'Campaign name is required',
            }, { status: 400 });
        }

        // For demo mode, return a mock campaign
        if (userId === 'demo-user') {
            return NextResponse.json({
                success: true,
                campaign: {
                    id: `demo-${Date.now()}`,
                    name,
                    description,
                    status: 'active',
                    created_at: new Date().toISOString(),
                    donors: [],
                },
                source: 'demo',
            });
        }

        const { data, error } = await supabase
            .from('campaigns')
            .insert({
                name,
                description,
                status: 'active',
                search_config: searchConfig,
                user_id: userId,
            })
            .select()
            .single();

        if (error) {
            console.error('Campaign create error:', error);
            // Return a local campaign if DB fails
            return NextResponse.json({
                success: true,
                campaign: {
                    id: `local-${Date.now()}`,
                    name,
                    description,
                    status: 'active',
                    created_at: new Date().toISOString(),
                    donors: [],
                },
                source: 'fallback',
            });
        }

        return NextResponse.json({
            success: true,
            campaign: { ...data, donors: [] },
            source: 'supabase',
        });

    } catch (error) {
        console.error('Campaign create API error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
        }, { status: 500 });
    }
}
