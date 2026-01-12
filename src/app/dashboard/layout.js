'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Premium SVG Icons
const icons = {
    research: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
            <path d="M11 8v6M8 11h6" />
        </svg>
    ),
    network: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="5" cy="6" r="3" />
            <circle cx="19" cy="6" r="3" />
            <circle cx="12" cy="18" r="3" />
            <path d="M5 9v3a4 4 0 0 0 4 4h2" />
            <path d="M19 9v3a4 4 0 0 1-4 4h-2" />
        </svg>
    ),
    outreach: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <path d="M8 9h8M8 13h4" />
        </svg>
    ),
    pipeline: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    ),
    proposal: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10,9 9,9 8,9" />
        </svg>
    ),
    settings: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
    ),
    logout: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16,17 21,12 16,7" />
            <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
    ),
    bug: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2l1.88 1.88M14.12 3.88L16 2M9 7.13v-1a3.003 3.003 0 116 0v1" />
            <path d="M12 20c-3.3 0-6-2.7-6-6v-3a6 6 0 0112 0v3c0 3.3-2.7 6-6 6z" />
            <path d="M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H3M6 17l-3 1M17.47 9c1.93-.2 3.53-1.9 3.53-4M18 13h3M18 17l3 1" />
        </svg>
    ),
    sparkle: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
        </svg>
    ),
};

function SidebarLink({ href, icon, label, isActive }) {
    return (
        <Link href={href} className={`premium-nav-link ${isActive ? 'active' : ''}`}>
            <span className="nav-icon-wrapper">
                {icon}
            </span>
            <span className="nav-label">{label}</span>
            {isActive && <span className="active-indicator" />}
        </Link>
    );
}

export default function DashboardLayout({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const [userInitials, setUserInitials] = useState('SJ');
    const [aiUsage, setAiUsage] = useState({ calls: 0, tokens: 0 });
    const [searchesRemaining, setSearchesRemaining] = useState(5);

    useEffect(() => {
        const isLoggedIn = sessionStorage.getItem('isLoggedIn');
        if (!isLoggedIn) {
            router.push('/');
            return;
        }
        
        // Check if user has completed onboarding
        const hasOnboarded = localStorage.getItem('hasOnboarded');
        if (!hasOnboarded || hasOnboarded !== 'true') {
            router.push('/onboarding');
            return;
        }
        
        const email = sessionStorage.getItem('userEmail');
        if (email) {
            const initials = email.split('@')[0].slice(0, 2).toUpperCase();
            setUserInitials(initials);
        }
        
        // Load AI usage from localStorage
        const storedUsage = localStorage.getItem('aiUsage');
        if (storedUsage) {
            setAiUsage(JSON.parse(storedUsage));
        }
        
        // Listen for AI usage updates
        const handleUsageUpdate = (e) => {
            const newUsage = e.detail;
            setAiUsage(newUsage);
            localStorage.setItem('aiUsage', JSON.stringify(newUsage));
        };
        window.addEventListener('ai-usage-update', handleUsageUpdate);
        
        // Load daily search usage
        const loadSearchUsage = () => {
            const stored = localStorage.getItem('dailySearchUsage');
            if (stored) {
                const usage = JSON.parse(stored);
                const today = new Date().toISOString().split('T')[0];
                if (usage.date === today) {
                    setSearchesRemaining(Math.max(0, 5 - usage.count));
                } else {
                    setSearchesRemaining(5); // Reset for new day
                }
            }
        };
        loadSearchUsage();
        
        // Listen for search usage updates
        const handleSearchUpdate = (e) => {
            setSearchesRemaining(e.detail.remaining);
        };
        window.addEventListener('search-usage-update', handleSearchUpdate);
        
        return () => {
            window.removeEventListener('ai-usage-update', handleUsageUpdate);
            window.removeEventListener('search-usage-update', handleSearchUpdate);
        };
    }, [router]);
    
    // Format usage numbers
    const formatUsage = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const handleLogout = () => {
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('userEmail');
        router.push('/');
    };

    const navItems = [
        { href: '/dashboard/research', icon: icons.research, label: 'Donor Research' },
        { href: '/dashboard/network', icon: icons.network, label: 'Network' },
        { href: '/dashboard/outreach', icon: icons.outreach, label: 'Outreach' },
        { href: '/dashboard/pipeline', icon: icons.pipeline, label: 'Pipeline' },
        { href: '/dashboard/proposal', icon: icons.proposal, label: 'Proposal Writer' },
    ];

    return (
        <div className="app-layout">
            {/* Premium Sidebar */}
            <aside className="premium-sidebar">
                {/* Background Gradient Overlay */}
                <div className="sidebar-gradient-overlay" />

                {/* Logo Section */}
                <div className="premium-sidebar-header" style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div className="logo-container" style={{ position: 'relative', width: '44px', height: '44px', flexShrink: 0 }}>
                        <img 
                            src="/logo.png" 
                            alt="Power Fundraiser" 
                            className="premium-logo"
                            width={44}
                            height={44}
                            style={{ width: '44px', height: '44px', borderRadius: '12px', display: 'block' }}
                        />
                        <div className="logo-glow" />
                    </div>
                    <div className="brand-info">
                        <span className="premium-brand-name">Power Fundraiser</span>
                        <span className="premium-tagline">AI Donor Intelligence</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="premium-nav">
                    <div className="nav-section-label">WORKSPACE</div>
                    {navItems.map(item => (
                        <SidebarLink
                            key={item.href}
                            href={item.href}
                            icon={item.icon}
                            label={item.label}
                            isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                        />
                    ))}
                </nav>

                {/* Footer */}
                <div className="premium-sidebar-footer">
                    {/* AI Usage Tracker */}
                    <div className="premium-credits-card">
                        <div className="credits-header">
                            <div className="credits-icon">
                                {icons.sparkle}
                            </div>
                            <div className="credits-info">
                                <span className="credits-label">AI Usage</span>
                                <span className="credits-value">{formatUsage(aiUsage.tokens)} tokens used</span>
                            </div>
                        </div>
                        <div className="credits-bar-wrapper">
                            <div className="usage-stats">
                                <span className="usage-stat" style={{ 
                                    color: searchesRemaining <= 1 ? '#ef4444' : searchesRemaining <= 2 ? '#f59e0b' : '#10b981',
                                    fontWeight: 600 
                                }}>
                                    <strong>{searchesRemaining}</strong>/5 searches today
                                </span>
                                <span className="usage-stat">
                                    <strong>{formatUsage(aiUsage.tokens)}</strong> tokens
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Report Glitch Button */}
                    <button 
                        onClick={() => window.open('mailto:support@powerfundraiser.com?subject=Bug Report&body=Please describe the issue you encountered:', '_blank')}
                        className="report-glitch-btn"
                    >
                        {icons.bug}
                        <span>Report Glitch</span>
                    </button>

                    {/* User Section */}
                    <div className="user-section">
                        <Link href="/dashboard/settings" className="user-profile-btn">
                            <div className="user-avatar">
                                <span>{userInitials}</span>
                                <div className="avatar-status" />
                            </div>
                            <div className="user-info">
                                <span className="user-name">Sarah Johnson</span>
                                <span className="user-role">Administrator</span>
                            </div>
                            {icons.settings}
                        </Link>

                        <button className="logout-btn" onClick={handleLogout}>
                            {icons.logout}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {children}
            </main>

            {/* Premium Sidebar Styles */}
            <style jsx global>{`
                .premium-sidebar {
                    width: var(--sidebar-width);
                    background: linear-gradient(180deg, #0F1729 0%, #1B2942 50%, #0F1729 100%);
                    display: flex;
                    flex-direction: column;
                    position: fixed;
                    height: 100vh;
                    left: 0;
                    top: 0;
                    z-index: 100;
                    overflow: hidden;
                }

                .sidebar-gradient-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: 
                        radial-gradient(ellipse at top left, rgba(201, 162, 39, 0.08) 0%, transparent 50%),
                        radial-gradient(ellipse at bottom right, rgba(59, 130, 246, 0.05) 0%, transparent 50%);
                    pointer-events: none;
                }

                /* Header */
                .premium-sidebar-header {
                    position: relative;
                    padding: 24px 20px;
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                }

                .logo-container {
                    position: relative;
                    width: 44px;
                    height: 44px;
                    flex-shrink: 0;
                }

                .premium-logo {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(201, 162, 39, 0.3);
                }

                .logo-glow {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 60px;
                    height: 60px;
                    background: radial-gradient(circle, rgba(201, 162, 39, 0.3) 0%, transparent 70%);
                    pointer-events: none;
                }

                .brand-info {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .premium-brand-name {
                    font-size: 1.0625rem;
                    font-weight: 700;
                    color: white;
                    letter-spacing: -0.01em;
                }

                .premium-tagline {
                    font-size: 0.6875rem;
                    color: rgba(255, 255, 255, 0.5);
                    font-weight: 500;
                    letter-spacing: 0.02em;
                }

                /* Navigation */
                .premium-nav {
                    flex: 1;
                    padding: 20px 12px;
                    overflow-y: auto;
                }

                .nav-section-label {
                    font-size: 0.625rem;
                    font-weight: 700;
                    color: rgba(255, 255, 255, 0.35);
                    letter-spacing: 0.1em;
                    padding: 0 12px;
                    margin-bottom: 12px;
                }

                .premium-nav-link {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 14px;
                    color: rgba(255, 255, 255, 0.6);
                    text-decoration: none;
                    border-radius: 10px;
                    margin-bottom: 4px;
                    transition: all 0.2s ease;
                    position: relative;
                    font-weight: 500;
                }

                .premium-nav-link:hover {
                    background: rgba(255, 255, 255, 0.06);
                    color: rgba(255, 255, 255, 0.9);
                }

                .premium-nav-link.active {
                    background: linear-gradient(135deg, rgba(201, 162, 39, 0.15) 0%, rgba(201, 162, 39, 0.05) 100%);
                    color: #C9A227;
                    box-shadow: inset 0 0 0 1px rgba(201, 162, 39, 0.2);
                }

                .premium-nav-link.active .nav-icon-wrapper {
                    color: #C9A227;
                }

                .nav-icon-wrapper {
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    transition: all 0.2s;
                }

                .premium-nav-link:hover .nav-icon-wrapper {
                    background: rgba(255, 255, 255, 0.1);
                }

                .premium-nav-link.active .nav-icon-wrapper {
                    background: rgba(201, 162, 39, 0.2);
                }

                .nav-label {
                    font-size: 0.875rem;
                    flex: 1;
                }

                .active-indicator {
                    width: 4px;
                    height: 20px;
                    background: linear-gradient(180deg, #C9A227 0%, #A78B1F 100%);
                    border-radius: 2px;
                    position: absolute;
                    right: 0;
                    box-shadow: 0 0 12px rgba(201, 162, 39, 0.5);
                }

                /* Footer */
                .premium-sidebar-footer {
                    padding: 16px;
                    border-top: 1px solid rgba(255, 255, 255, 0.06);
                    position: relative;
                }

                /* AI Credits Card */
                .premium-credits-card {
                    background: linear-gradient(135deg, rgba(201, 162, 39, 0.1) 0%, rgba(201, 162, 39, 0.03) 100%);
                    border: 1px solid rgba(201, 162, 39, 0.15);
                    border-radius: 12px;
                    padding: 14px;
                    margin-bottom: 16px;
                }

                .credits-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 12px;
                }

                .credits-icon {
                    width: 28px;
                    height: 28px;
                    background: linear-gradient(135deg, #C9A227 0%, #A78B1F 100%);
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                }

                .credits-info {
                    display: flex;
                    flex-direction: column;
                }

                .credits-label {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: rgba(255, 255, 255, 0.7);
                }

                .credits-value {
                    font-size: 0.6875rem;
                    color: #C9A227;
                }

                .credits-bar-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .credits-bar {
                    flex: 1;
                    height: 6px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 3px;
                    overflow: hidden;
                }

                .credits-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #C9A227 0%, #E8D48A 100%);
                    border-radius: 3px;
                    box-shadow: 0 0 10px rgba(201, 162, 39, 0.4);
                }

                .credits-percent {
                    font-size: 0.6875rem;
                    color: rgba(255, 255, 255, 0.5);
                    font-weight: 600;
                    min-width: 28px;
                }

                .usage-stats {
                    display: flex;
                    justify-content: space-between;
                    width: 100%;
                }

                .usage-stat {
                    font-size: 0.6875rem;
                    color: rgba(255, 255, 255, 0.5);
                }

                .usage-stat strong {
                    color: #C9A227;
                    font-weight: 600;
                }

                /* User Section */
                .user-section {
                    display: flex;
                    gap: 8px;
                }

                .user-profile-btn {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 12px;
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 10px;
                    text-decoration: none;
                    transition: all 0.2s;
                    cursor: pointer;
                }

                .user-profile-btn:hover {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: rgba(255, 255, 255, 0.12);
                }

                .user-profile-btn svg {
                    color: rgba(255, 255, 255, 0.4);
                    flex-shrink: 0;
                }

                .user-avatar {
                    position: relative;
                    width: 34px;
                    height: 34px;
                    background: linear-gradient(135deg, #C9A227 0%, #A78B1F 100%);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .user-avatar span {
                    font-size: 0.8125rem;
                    font-weight: 700;
                    color: white;
                }

                .avatar-status {
                    position: absolute;
                    bottom: -2px;
                    right: -2px;
                    width: 10px;
                    height: 10px;
                    background: #22C55E;
                    border: 2px solid #0F1729;
                    border-radius: 50%;
                }

                .user-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                }

                .user-name {
                    font-size: 0.8125rem;
                    font-weight: 600;
                    color: rgba(255, 255, 255, 0.9);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .user-role {
                    font-size: 0.6875rem;
                    color: rgba(255, 255, 255, 0.45);
                }

                .logout-btn {
                    width: 44px;
                    height: 44px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    border-radius: 10px;
                    color: #EF4444;
                    cursor: pointer;
                    transition: all 0.2s;
                    flex-shrink: 0;
                }

                .logout-btn:hover {
                    background: rgba(239, 68, 68, 0.2);
                    border-color: rgba(239, 68, 68, 0.3);
                }

                /* Report Glitch Button */
                .report-glitch-btn {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 14px;
                    background: rgba(251, 191, 36, 0.1);
                    border: 1px solid rgba(251, 191, 36, 0.2);
                    border-radius: 10px;
                    color: #FBBF24;
                    font-size: 0.8125rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    margin-bottom: 12px;
                }

                .report-glitch-btn:hover {
                    background: rgba(251, 191, 36, 0.15);
                    border-color: rgba(251, 191, 36, 0.3);
                }

                .report-glitch-btn svg {
                    flex-shrink: 0;
                }
            `}</style>
        </div>
    );
}
