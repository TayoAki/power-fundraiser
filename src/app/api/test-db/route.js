/**
 * Test Database Connection
 * GET /api/test-db
 * 
 * Simple endpoint to verify Supabase connection works.
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        // Test basic connection by querying the donors table
        const { data, error, count } = await supabase
            .from('donors')
            .select('*', { count: 'exact', head: true });

        if (error) {
            return NextResponse.json({
                success: false,
                error: error.message,
                hint: error.hint,
                details: error.details,
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Supabase connection successful!',
            donorCount: count || 0,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('Database test error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
        }, { status: 500 });
    }
}
