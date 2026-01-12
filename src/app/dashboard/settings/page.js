'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getStoredGoogleTokens, disconnectGoogle, storeGoogleTokens } from '@/lib/google';

function SettingsPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isHydrated, setIsHydrated] = useState(false);
    const [activeTab, setActiveTab] = useState('organization');
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [onboardingStep, setOnboardingStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);
    const [googleUser, setGoogleUser] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    // Organization Settings
    const [orgSettings, setOrgSettings] = useState({
        name: '',
        mission: '',
        vision: '',
        website: '',
        zipCode: '',
    });

    // Social Settings
    const [socialSettings, setSocialSettings] = useState({
        linkedin: '',
        twitter: '',
    });

    // Email Settings
    const [emailSettings, setEmailSettings] = useState({
        provider: 'gmail', // 'gmail' or 'smtp'
        gmailConnected: false,
        smtpHost: '',
        smtpPort: '587',
        smtpUsername: '',
        smtpPassword: '',
    });

    // Account Info
    const [accountInfo, setAccountInfo] = useState({
        email: '',
        orgName: '',
        createdAt: '',
    });

    const showToastMessage = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    useEffect(() => {
        // Load settings from localStorage
        const storedOrg = localStorage.getItem('orgSettings');
        const storedSocial = localStorage.getItem('socialSettings');
        const storedEmail = localStorage.getItem('emailSettings');
        const userEmail = sessionStorage.getItem('userEmail');
        const hasOnboarded = localStorage.getItem('hasOnboarded');

        if (storedOrg) setOrgSettings(JSON.parse(storedOrg));
        if (storedSocial) setSocialSettings(JSON.parse(storedSocial));
        if (storedEmail) setEmailSettings(JSON.parse(storedEmail));

        // Load Google auth state
        const googleAuth = getStoredGoogleTokens();
        if (googleAuth) {
            setGoogleUser(googleAuth);
            setEmailSettings(prev => ({ ...prev, gmailConnected: true }));
        }

        setAccountInfo({
            email: userEmail || 'user@example.com',
            orgName: storedOrg ? JSON.parse(storedOrg).name : 'Your Organization',
            createdAt: localStorage.getItem('accountCreatedAt') || new Date().toISOString().split('T')[0],
        });

        // Show onboarding if first time
        if (!hasOnboarded && !storedOrg) {
            setShowOnboarding(true);
        }

        setIsHydrated(true);
    }, []);

    // Handle Google OAuth callback
    useEffect(() => {
        const googleStatus = searchParams.get('google');
        const googleData = searchParams.get('data');
        const error = searchParams.get('error');

        if (googleStatus === 'success' && googleData) {
            try {
                const authData = JSON.parse(decodeURIComponent(googleData));
                console.log('✅ [Settings] Google connected:', authData.email);
                
                // Store tokens
                const stored = storeGoogleTokens(
                    { access_token: authData.accessToken, refresh_token: authData.refreshToken, expires_in: authData.expiresIn },
                    { email: authData.email, name: authData.name, picture: authData.picture }
                );
                
                setGoogleUser(stored);
                setEmailSettings(prev => ({ ...prev, gmailConnected: true }));
                showToastMessage(`Google account connected: ${authData.email}`);
                
                // Clean URL
                router.replace('/dashboard/settings');
            } catch (e) {
                console.error('❌ [Settings] Failed to parse Google data:', e);
            }
        }

        if (error) {
            console.error('❌ [Settings] Google OAuth error:', error);
            showToastMessage('Failed to connect Google account', 'error');
            router.replace('/dashboard/settings');
        }
    }, [searchParams, router]);

    const handleSave = () => {
        setIsSaving(true);
        localStorage.setItem('orgSettings', JSON.stringify(orgSettings));
        localStorage.setItem('socialSettings', JSON.stringify(socialSettings));
        localStorage.setItem('emailSettings', JSON.stringify(emailSettings));
        localStorage.setItem('accountCreatedAt', accountInfo.createdAt);
        setTimeout(() => setIsSaving(false), 1000);
    };

    const handleLogout = () => {
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('userEmail');
        router.push('/');
    };

    const handleClearAllData = () => {
        if (confirm('This will clear all local data including campaigns, settings, and onboarding. Continue?')) {
            console.log('🗑️ [Settings] Clearing all local data...');
            
            // Clear localStorage
            localStorage.removeItem('hasOnboarded');
            localStorage.removeItem('orgSettings');
            localStorage.removeItem('organizationSettings');
            localStorage.removeItem('socialSettings');
            localStorage.removeItem('emailSettings');
            localStorage.removeItem('campaigns');
            localStorage.removeItem('activeCampaignId');
            localStorage.removeItem('aiUsage');
            localStorage.removeItem('accountCreatedAt');
            
            // Clear sessionStorage
            sessionStorage.removeItem('isLoggedIn');
            sessionStorage.removeItem('userEmail');
            sessionStorage.removeItem('userId');
            
            console.log('✅ [Settings] All data cleared, redirecting to login...');
            router.push('/');
        }
    };

    const handleTestConnection = async () => {
        if (!emailSettings.smtpHost || !emailSettings.smtpUsername || !emailSettings.smtpPassword) {
            showToastMessage('Please fill in all SMTP fields', 'error');
            return;
        }
        
        setTestingConnection(true);
        console.log('🔌 [Settings] Testing SMTP connection...');
        
        try {
            const response = await fetch('/api/email/test-smtp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    smtpHost: emailSettings.smtpHost,
                    smtpPort: emailSettings.smtpPort,
                    smtpUsername: emailSettings.smtpUsername,
                    smtpPassword: emailSettings.smtpPassword,
                }),
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ [Settings] SMTP connection successful');
                showToastMessage('SMTP connection successful!');
            } else {
                console.error('❌ [Settings] SMTP test failed:', result.error);
                showToastMessage(result.error || 'Connection failed', 'error');
            }
        } catch (error) {
            console.error('❌ [Settings] SMTP test error:', error);
            showToastMessage('Connection test failed', 'error');
        }
        
        setTestingConnection(false);
    };

    const handleConnectGmail = () => {
        console.log('🔗 [Settings] Starting Google OAuth...');
        // Redirect to Google OAuth
        window.location.href = '/api/auth/google';
    };

    const handleDisconnectGmail = () => {
        if (confirm('Disconnect your Google account?')) {
            disconnectGoogle();
            setGoogleUser(null);
            setEmailSettings(prev => ({ ...prev, gmailConnected: false }));
            showToastMessage('Google account disconnected');
        }
    };

    const completeOnboarding = () => {
        localStorage.setItem('hasOnboarded', 'true');
        localStorage.setItem('orgSettings', JSON.stringify(orgSettings));
        localStorage.setItem('socialSettings', JSON.stringify(socialSettings));
        setShowOnboarding(false);
    };

    const tabs = [
        { id: 'organization', label: 'Organization', icon: '🏢' },
        { id: 'social', label: 'Social', icon: '🔗' },
        { id: 'email', label: 'Email', icon: '📧' },
        { id: 'account', label: 'Account', icon: '👤' },
    ];

    if (!isHydrated) {
        return <div style={{ padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: '#64748b' }}>Loading...</div>;
    }

    // Onboarding Flow
    if (showOnboarding) {
        return (
            <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1B365D 0%, #2a4a7a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
                <div style={{ background: 'white', borderRadius: '16px', padding: '48px', maxWidth: '600px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                    {/* Progress */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
                        {[1, 2, 3].map(step => (
                            <div key={step} style={{
                                width: step === onboardingStep ? '32px' : '8px',
                                height: '8px',
                                borderRadius: '4px',
                                background: step <= onboardingStep ? '#C9A227' : '#e2e8f0',
                                transition: 'all 0.3s',
                            }} />
                        ))}
                    </div>

                    {onboardingStep === 1 && (
                        <>
                            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏢</div>
                                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1B365D', margin: '0 0 8px' }}>Welcome to Power Fundraiser</h1>
                                <p style={{ color: '#64748b', margin: 0 }}>Let's set up your organization for AI-powered donor matching</p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>Organization Name *</label>
                                    <input
                                        type="text"
                                        value={orgSettings.name}
                                        onChange={(e) => setOrgSettings({ ...orgSettings, name: e.target.value })}
                                        placeholder="Your Nonprofit Name"
                                        style={{ width: '100%', padding: '14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '1rem', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>Mission Statement *</label>
                                    <textarea
                                        value={orgSettings.mission}
                                        onChange={(e) => setOrgSettings({ ...orgSettings, mission: e.target.value })}
                                        placeholder="Describe your organization's mission..."
                                        style={{ width: '100%', padding: '14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '1rem', minHeight: '100px', resize: 'vertical', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>ZIP Code</label>
                                    <input
                                        type="text"
                                        value={orgSettings.zipCode}
                                        onChange={(e) => setOrgSettings({ ...orgSettings, zipCode: e.target.value })}
                                        placeholder="12345"
                                        style={{ width: '200px', padding: '14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '1rem' }}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {onboardingStep === 2 && (
                        <>
                            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔗</div>
                                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1B365D', margin: '0 0 8px' }}>Connect Your Profiles</h1>
                                <p style={{ color: '#64748b', margin: 0 }}>Help us find warm connections in your network</p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>LinkedIn Profile URL</label>
                                    <input
                                        type="url"
                                        value={socialSettings.linkedin}
                                        onChange={(e) => setSocialSettings({ ...socialSettings, linkedin: e.target.value })}
                                        placeholder="https://linkedin.com/in/yourprofile"
                                        style={{ width: '100%', padding: '14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '1rem', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>Twitter/X Profile URL</label>
                                    <input
                                        type="url"
                                        value={socialSettings.twitter}
                                        onChange={(e) => setSocialSettings({ ...socialSettings, twitter: e.target.value })}
                                        placeholder="https://twitter.com/yourhandle"
                                        style={{ width: '100%', padding: '14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '1rem', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                            <p style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '16px', textAlign: 'center' }}>
                                These are optional but help improve warm connection matching
                            </p>
                        </>
                    )}

                    {onboardingStep === 3 && (
                        <>
                            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
                                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1B365D', margin: '0 0 8px' }}>You're All Set!</h1>
                                <p style={{ color: '#64748b', margin: 0 }}>Your organization is ready for AI-powered fundraising</p>
                            </div>
                            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: '0 0 16px' }}>Quick Start Guide</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {[
                                        { icon: '🔍', text: 'Search for donors matching your mission' },
                                        { icon: '📊', text: 'Qualify leads and track them in your pipeline' },
                                        { icon: '🌐', text: 'Map connections from your network' },
                                        { icon: '✍️', text: 'Generate AI-powered proposals' },
                                    ].map((item, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                                            <span style={{ color: '#475569' }}>{item.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Navigation */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
                        {onboardingStep > 1 ? (
                            <button
                                onClick={() => setOnboardingStep(onboardingStep - 1)}
                                style={{ padding: '12px 24px', border: '1px solid #e2e8f0', borderRadius: '10px', background: 'white', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
                            >
                                ← Back
                            </button>
                        ) : <div />}
                        {onboardingStep < 3 ? (
                            <button
                                onClick={() => setOnboardingStep(onboardingStep + 1)}
                                disabled={onboardingStep === 1 && !orgSettings.name}
                                style={{
                                    padding: '12px 32px',
                                    border: 'none',
                                    borderRadius: '10px',
                                    background: orgSettings.name ? '#C9A227' : '#e2e8f0',
                                    color: orgSettings.name ? 'white' : '#94a3b8',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    cursor: orgSettings.name ? 'pointer' : 'not-allowed',
                                }}
                            >
                                Continue →
                            </button>
                        ) : (
                            <button
                                onClick={completeOnboarding}
                                style={{ padding: '12px 32px', border: 'none', borderRadius: '10px', background: '#C9A227', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Start Fundraising →
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1B365D', margin: '0 0 8px' }}>Settings</h1>
                <p style={{ color: '#64748b', margin: 0 }}>Manage your organization and account settings</p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', borderBottom: '1px solid #e2e8f0', paddingBottom: '0' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 20px',
                            border: 'none',
                            background: 'none',
                            fontSize: '0.875rem',
                            fontWeight: activeTab === tab.id ? 600 : 500,
                            color: activeTab === tab.id ? '#1B365D' : '#64748b',
                            cursor: 'pointer',
                            borderBottom: activeTab === tab.id ? '2px solid #C9A227' : '2px solid transparent',
                            marginBottom: '-1px',
                        }}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '32px' }}>
                {/* Organization Tab */}
                {activeTab === 'organization' && (
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>Organization Details</h2>
                        <p style={{ color: '#64748b', margin: '0 0 32px' }}>This information is used by AI for donor matching and proposals</p>

                        <div style={{ display: 'grid', gap: '28px', maxWidth: '700px' }}>
                            {/* Organization Name */}
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '10px' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                    Organization Name *
                                </label>
                                <input
                                    type="text"
                                    value={orgSettings.name}
                                    onChange={(e) => setOrgSettings({ ...orgSettings, name: e.target.value })}
                                    placeholder="Youth Empowerment Alliance"
                                    style={{ width: '100%', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9375rem', boxSizing: 'border-box' }}
                                />
                            </div>

                            {/* Mission Statement */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '10px' }}>
                                    Mission Statement *
                                </label>
                                <textarea
                                    value={orgSettings.mission}
                                    onChange={(e) => setOrgSettings({ ...orgSettings, mission: e.target.value })}
                                    placeholder="To empower underserved youth through education, mentorship, and access to technology, fostering the next generation of leaders and innovators."
                                    style={{ width: '100%', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9375rem', minHeight: '100px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5 }}
                                />
                                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>AI uses this for donor matching and proposal generation</p>
                            </div>

                            {/* Vision Statement */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '10px' }}>
                                    Vision Statement *
                                </label>
                                <textarea
                                    value={orgSettings.vision}
                                    onChange={(e) => setOrgSettings({ ...orgSettings, vision: e.target.value })}
                                    placeholder="A world where every young person has equal access to opportunities for success, regardless of their background or socioeconomic status."
                                    style={{ width: '100%', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9375rem', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5 }}
                                />
                                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>AI uses this for donor matching and outreach personalization</p>
                            </div>

                            {/* Website & ZIP Code Row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '10px' }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                                        Website
                                    </label>
                                    <input
                                        type="url"
                                        value={orgSettings.website}
                                        onChange={(e) => setOrgSettings({ ...orgSettings, website: e.target.value })}
                                        placeholder="https://youthempowermentalliance.org"
                                        style={{ width: '100%', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9375rem', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '10px' }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                        ZIP Code
                                    </label>
                                    <input
                                        type="text"
                                        value={orgSettings.zipCode}
                                        onChange={(e) => setOrgSettings({ ...orgSettings, zipCode: e.target.value })}
                                        placeholder="30303"
                                        style={{ width: '100%', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9375rem', boxSizing: 'border-box' }}
                                    />
                                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>Used for geographic donor matching</p>
                                </div>
                            </div>

                            {/* Save Button */}
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                style={{
                                    width: 'fit-content',
                                    padding: '14px 28px',
                                    border: 'none',
                                    borderRadius: '10px',
                                    background: '#1B365D',
                                    color: 'white',
                                    fontSize: '0.9375rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginTop: '8px',
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                                {isSaving ? 'Saving...' : 'Save Organization Details'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Social Tab */}
                {activeTab === 'social' && (
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', margin: '0 0 8px' }}>Social Profiles</h2>
                        <p style={{ color: '#64748b', margin: '0 0 24px' }}>Connect your social profiles for warm connection tracking</p>

                        <div style={{ display: 'grid', gap: '24px', maxWidth: '600px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z" /></svg>
                                        LinkedIn Profile URL
                                    </span>
                                </label>
                                <input
                                    type="url"
                                    value={socialSettings.linkedin}
                                    onChange={(e) => setSocialSettings({ ...socialSettings, linkedin: e.target.value })}
                                    placeholder="https://linkedin.com/in/yourprofile"
                                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#1DA1F2"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" /></svg>
                                        Twitter/X Profile URL
                                    </span>
                                </label>
                                <input
                                    type="url"
                                    value={socialSettings.twitter}
                                    onChange={(e) => setSocialSettings({ ...socialSettings, twitter: e.target.value })}
                                    placeholder="https://twitter.com/yourhandle"
                                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Email Tab */}
                {activeTab === 'email' && (
                    <div>
                        {/* Gmail / Google Workspace Section */}
                        <div style={{ marginBottom: '48px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="1.5"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 6l-10 7L2 6" /></svg>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Gmail / Google Workspace Integration</h2>
                            </div>
                            <p style={{ color: '#64748b', margin: '0 0 24px' }}>Connect your Gmail or Google Workspace account to send proposals and sync contacts</p>

                            {/* Google Workspace Setup Card */}
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: '0 0 12px' }}>Google Workspace Setup (Required for Workspace accounts)</h3>
                                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 20px' }}>
                                    If you're using Google Workspace, your admin must first approve Power Fundraiser:
                                </p>
                                <ol style={{ margin: '0 0 20px', paddingLeft: '20px', color: '#475569', fontSize: '0.875rem', lineHeight: 1.8 }}>
                                    <li>Go to your <a href="https://admin.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6', textDecoration: 'none' }}>Google Workspace Admin Panel ↗</a></li>
                                    <li>Click <strong>"Configure new app"</strong> → <strong>"OAuth App Name Or Client ID"</strong></li>
                                    <li>Use the following Client ID to search for Power Fundraiser:</li>
                                </ol>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                                    <code style={{ fontSize: '0.8125rem', color: '#1e293b', fontFamily: 'monospace' }}>474059963221-iciotn2bf1de813m7dn4skt58upf3rds.apps.googleusercontent.com</code>
                                    <button 
                                        onClick={() => { navigator.clipboard.writeText('474059963221-iciotn2bf1de813m7dn4skt58upf3rds.apps.googleusercontent.com'); alert('Copied!'); }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#64748b' }}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                    </button>
                                </div>
                                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>4. Select and approve Power Fundraiser to access your Google Workspace</p>
                            </div>

                            {/* Info Banner */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', background: '#EFF6FF', borderRadius: '10px', border: '1px solid #BFDBFE', marginBottom: '20px' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                                <p style={{ fontSize: '0.875rem', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
                                    Click below to connect directly. <strong>Google Workspace:</strong> Complete the admin setup above first.
                                </p>
                            </div>

                            {/* Connect/Disconnect Button */}
                            {emailSettings.gmailConnected && googleUser ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#DCFCE7', borderRadius: '10px', marginBottom: '12px' }}>
                                    {googleUser.picture && (
                                        <img src={googleUser.picture} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, color: '#166534' }}>✓ Connected</div>
                                        <div style={{ fontSize: '0.875rem', color: '#166534' }}>{googleUser.email}</div>
                                    </div>
                                    <button
                                        onClick={handleDisconnectGmail}
                                        style={{ padding: '8px 16px', border: '1px solid #DC2626', borderRadius: '8px', background: 'white', color: '#DC2626', fontSize: '0.875rem', cursor: 'pointer' }}
                                    >
                                        Disconnect
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleConnectGmail}
                                    style={{ 
                                        width: '100%',
                                        padding: '16px', 
                                        border: 'none', 
                                        borderRadius: '10px', 
                                        background: '#1B365D', 
                                        color: 'white', 
                                        fontWeight: 600, 
                                        fontSize: '1rem', 
                                        cursor: 'pointer',
                                    }}
                                >
                                    Connect Gmail Account
                                </button>
                            )}
                        </div>

                        {/* SMTP Configuration Section */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="1.5"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 6l-10 7L2 6" /></svg>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>SMTP Configuration</h2>
                            </div>
                            <p style={{ color: '#64748b', margin: '0 0 24px' }}>Configure your work email server for sending proposals</p>

                            {/* Common SMTP Settings Info */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px 20px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                                <div style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.7 }}>
                                    <strong style={{ color: '#1e293b' }}>Common SMTP Settings:</strong><br />
                                    <strong>Gmail:</strong> smtp.gmail.com:587 (use App Password)<br />
                                    <strong>Outlook:</strong> smtp-mail.outlook.com:587<br />
                                    <strong>Office 365:</strong> smtp.office365.com:587
                                </div>
                            </div>

                            <div style={{ display: 'grid', gap: '20px', maxWidth: '700px' }}>
                                {/* Email Address */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Email Address *</label>
                                    <input
                                        type="email"
                                        value={emailSettings.smtpUsername}
                                        onChange={(e) => setEmailSettings({ ...emailSettings, smtpUsername: e.target.value })}
                                        placeholder="your@email.com"
                                        style={{ width: '100%', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9375rem', boxSizing: 'border-box' }}
                                    />
                                </div>

                                {/* SMTP Host & Port */}
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>SMTP Host *</label>
                                        <input
                                            type="text"
                                            value={emailSettings.smtpHost}
                                            onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
                                            placeholder="smtp.gmail.com"
                                            style={{ width: '100%', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9375rem', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Port *</label>
                                        <input
                                            type="text"
                                            value={emailSettings.smtpPort}
                                            onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: e.target.value })}
                                            placeholder="587"
                                            style={{ width: '100%', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9375rem', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>

                                {/* Username */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Username *</label>
                                    <input
                                        type="text"
                                        value={emailSettings.smtpUsername}
                                        onChange={(e) => setEmailSettings({ ...emailSettings, smtpUsername: e.target.value })}
                                        placeholder="Usually your email address"
                                        style={{ width: '100%', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9375rem', boxSizing: 'border-box' }}
                                    />
                                </div>

                                {/* Password */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Password *</label>
                                    <input
                                        type="password"
                                        value={emailSettings.smtpPassword}
                                        onChange={(e) => setEmailSettings({ ...emailSettings, smtpPassword: e.target.value })}
                                        placeholder="Your email password or app password"
                                        style={{ width: '100%', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9375rem', boxSizing: 'border-box' }}
                                    />
                                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>For Gmail, use an App Password instead of your regular password</p>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                                    <button
                                        onClick={handleTestConnection}
                                        disabled={testingConnection}
                                        style={{ 
                                            padding: '14px 24px', 
                                            border: '1px solid #e2e8f0', 
                                            borderRadius: '10px', 
                                            background: 'white', 
                                            fontSize: '0.9375rem', 
                                            fontWeight: 600, 
                                            cursor: 'pointer',
                                            color: '#1e293b',
                                        }}
                                    >
                                        {testingConnection ? 'Testing...' : 'Test Connection'}
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        style={{ 
                                            padding: '14px 24px', 
                                            border: 'none', 
                                            borderRadius: '10px', 
                                            background: '#1B365D', 
                                            color: 'white', 
                                            fontSize: '0.9375rem', 
                                            fontWeight: 600, 
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                                        {isSaving ? 'Saving...' : 'Save Configuration'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Account Tab */}
                {activeTab === 'account' && (
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', margin: '0 0 8px' }}>Account Information</h2>
                        <p style={{ color: '#64748b', margin: '0 0 24px' }}>View your account details</p>

                        <div style={{ display: 'grid', gap: '24px', maxWidth: '600px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                                <span style={{ color: '#64748b' }}>Email</span>
                                <span style={{ fontWeight: 500, color: '#1e293b' }}>{accountInfo.email}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                                <span style={{ color: '#64748b' }}>Organization</span>
                                <span style={{ fontWeight: 500, color: '#1e293b' }}>{accountInfo.orgName || 'Not set'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                                <span style={{ color: '#64748b' }}>Account Created</span>
                                <span style={{ fontWeight: 500, color: '#1e293b' }}>{accountInfo.createdAt}</span>
                            </div>

                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '24px', display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={handleLogout}
                                    style={{ padding: '12px 24px', border: '1px solid #EF4444', borderRadius: '8px', background: 'white', color: '#EF4444', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    🚪 Sign Out
                                </button>
                                <button
                                    onClick={handleClearAllData}
                                    style={{ padding: '12px 24px', border: '1px solid #64748b', borderRadius: '8px', background: '#f8fafc', color: '#64748b', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    🗑️ Clear All Data
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Save Button (not on Account tab) */}
                {activeTab !== 'account' && (
                    <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            style={{
                                padding: '12px 32px',
                                border: 'none',
                                borderRadius: '10px',
                                background: '#C9A227',
                                color: 'white',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}
            </div>

            {/* Toast Notification */}
            {toast.show && (
                <div style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    padding: '14px 20px',
                    background: toast.type === 'error' ? '#FEE2E2' : '#DCFCE7',
                    color: toast.type === 'error' ? '#DC2626' : '#166534',
                    borderRadius: '10px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                    zIndex: 1001,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}>
                    {toast.type === 'error' ? '⚠️' : '✓'} {toast.message}
                </div>
            )}
        </div>
    );
}

// Wrap in Suspense for useSearchParams
export default function SettingsPage() {
    return (
        <Suspense fallback={<div style={{ padding: '32px', minHeight: '100vh', background: '#f8fafc' }} />}>
            <SettingsPageContent />
        </Suspense>
    );
}
