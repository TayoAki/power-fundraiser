'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardHome() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to Donor Research as the main landing page
        router.replace('/dashboard/research');
    }, [router]);

    return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p>Redirecting to Donor Research...</p>
        </div>
    );
}
