'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveOrganizationToDB } from '@/lib/supabase';

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    
    const [orgSettings, setOrgSettings] = useState({
        name: '',
        mission: '',
        vision: '',
        website: '',
        zipCode: '',
    });
    
    const [socialSettings, setSocialSettings] = useState({
        linkedin: '',
        twitter: '',
    });

    useEffect(() => {
        // If already onboarded, redirect to dashboard
        const hasOnboarded = localStorage.getItem('hasOnboarded');
        if (hasOnboarded === 'true') {
            router.push('/dashboard');
        }
    }, [router]);

    const handleNext = () => {
        if (step < 3) {
            setStep(step + 1);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    const handleComplete = async () => {
        setIsLoading(true);
        
        // Save to localStorage (fallback)
        localStorage.setItem('hasOnboarded', 'true');
        localStorage.setItem('orgSettings', JSON.stringify(orgSettings));
        localStorage.setItem('socialSettings', JSON.stringify(socialSettings));
        localStorage.setItem('organizationSettings', JSON.stringify({
            name: orgSettings.name,
            mission: orgSettings.mission,
        }));
        
        // Save to database (primary)
        const userId = sessionStorage.getItem('userId');
        const savedOrg = await saveOrganizationToDB({
            ...orgSettings,
            linkedin: socialSettings.linkedin,
            twitter: socialSettings.twitter,
        }, userId);
        
        if (savedOrg?.id) {
            localStorage.setItem('organizationId', savedOrg.id);
            console.log('✅ [Onboarding] Organization saved to database:', savedOrg.id);
        }
        
        // Redirect to dashboard
        setTimeout(() => {
            router.push('/dashboard/research');
        }, 500);
    };

    const canProceed = () => {
        if (step === 1) {
            return orgSettings.name.trim() && orgSettings.mission.trim();
        }
        return true;
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1B365D 0%, #2a4a7a 50%, #1B365D 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
        }}>
            <div style={{
                background: 'white',
                borderRadius: '20px',
                padding: '48px',
                maxWidth: '580px',
                width: '100%',
                boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '2.5rem' }}>⚡</span>
                </div>

                {/* Progress Steps */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '40px' }}>
                    {[1, 2, 3].map(s => (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: s <= step ? '#C9A227' : '#e2e8f0',
                                color: s <= step ? 'white' : '#94a3b8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                transition: 'all 0.3s',
                            }}>
                                {s < step ? '✓' : s}
                            </div>
                            {s < 3 && (
                                <div style={{
                                    width: '40px',
                                    height: '2px',
                                    background: s < step ? '#C9A227' : '#e2e8f0',
                                    transition: 'all 0.3s',
                                }} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step 1: Organization */}
                {step === 1 && (
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🏢</div>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1B365D', margin: '0 0 8px' }}>
                                Welcome to Power Fundraiser
                            </h1>
                            <p style={{ color: '#64748b', margin: 0 }}>
                                Let's set up your organization for AI-powered donor matching
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                                    Organization Name <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={orgSettings.name}
                                    onChange={(e) => setOrgSettings({ ...orgSettings, name: e.target.value })}
                                    placeholder="Your Nonprofit Name"
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        border: '2px solid #e2e8f0',
                                        borderRadius: '10px',
                                        fontSize: '1rem',
                                        boxSizing: 'border-box',
                                        transition: 'border-color 0.2s',
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                                    Mission Statement <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <textarea
                                    value={orgSettings.mission}
                                    onChange={(e) => setOrgSettings({ ...orgSettings, mission: e.target.value })}
                                    placeholder="Describe your organization's mission in 1-2 sentences. This helps our AI find the best donor matches."
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        border: '2px solid #e2e8f0',
                                        borderRadius: '10px',
                                        fontSize: '1rem',
                                        minHeight: '120px',
                                        resize: 'vertical',
                                        boxSizing: 'border-box',
                                        fontFamily: 'inherit',
                                    }}
                                />
                                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
                                    Used by AI for donor matching and proposal generation
                                </p>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                                    ZIP Code <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={orgSettings.zipCode}
                                    onChange={(e) => setOrgSettings({ ...orgSettings, zipCode: e.target.value })}
                                    placeholder="12345"
                                    maxLength={10}
                                    style={{
                                        width: '150px',
                                        padding: '14px 16px',
                                        border: '2px solid #e2e8f0',
                                        borderRadius: '10px',
                                        fontSize: '1rem',
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Social Profiles */}
                {step === 2 && (
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔗</div>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1B365D', margin: '0 0 8px' }}>
                                Connect Your Network
                            </h1>
                            <p style={{ color: '#64748b', margin: 0 }}>
                                Help us find warm introductions to foundations
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                                    LinkedIn Profile URL
                                </label>
                                <input
                                    type="url"
                                    value={socialSettings.linkedin}
                                    onChange={(e) => setSocialSettings({ ...socialSettings, linkedin: e.target.value })}
                                    placeholder="https://linkedin.com/in/yourprofile"
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        border: '2px solid #e2e8f0',
                                        borderRadius: '10px',
                                        fontSize: '1rem',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                                    Twitter/X Profile URL
                                </label>
                                <input
                                    type="url"
                                    value={socialSettings.twitter}
                                    onChange={(e) => setSocialSettings({ ...socialSettings, twitter: e.target.value })}
                                    placeholder="https://twitter.com/yourhandle"
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        border: '2px solid #e2e8f0',
                                        borderRadius: '10px',
                                        fontSize: '1rem',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{
                            background: '#f0f9ff',
                            border: '1px solid #bae6fd',
                            borderRadius: '10px',
                            padding: '16px',
                            marginTop: '24px',
                        }}>
                            <p style={{ fontSize: '0.875rem', color: '#0369a1', margin: 0 }}>
                                💡 <strong>Optional but recommended:</strong> Social profiles help our AI find mutual connections with foundation board members and program officers.
                            </p>
                        </div>
                    </div>
                )}

                {/* Step 3: Ready */}
                {step === 3 && (
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎉</div>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1B365D', margin: '0 0 8px' }}>
                                You're All Set!
                            </h1>
                            <p style={{ color: '#64748b', margin: 0 }}>
                                {orgSettings.name || 'Your organization'} is ready for AI-powered fundraising
                            </p>
                        </div>

                        <div style={{
                            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                            borderRadius: '12px',
                            padding: '24px',
                            marginBottom: '24px',
                        }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: '0 0 20px' }}>
                                What you can do now:
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {[
                                    { icon: '🔍', title: 'Donor Research', desc: 'AI finds foundations matching your mission' },
                                    { icon: '📊', title: 'Pipeline Management', desc: 'Track and qualify donor relationships' },
                                    { icon: '✍️', title: 'Proposal Writer', desc: 'Generate LOIs and proposals with AI' },
                                    { icon: '💬', title: 'Outreach Tools', desc: 'Personalized email generation' },
                                ].map((item, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                                        <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{item.icon}</span>
                                        <div>
                                            <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '2px' }}>{item.title}</div>
                                            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{item.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', gap: '16px' }}>
                    {step > 1 ? (
                        <button
                            onClick={handleBack}
                            style={{
                                padding: '14px 24px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '10px',
                                background: 'white',
                                fontSize: '0.9375rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                color: '#64748b',
                            }}
                        >
                            ← Back
                        </button>
                    ) : (
                        <div />
                    )}

                    {step < 3 ? (
                        <button
                            onClick={handleNext}
                            disabled={!canProceed()}
                            style={{
                                padding: '14px 32px',
                                border: 'none',
                                borderRadius: '10px',
                                background: canProceed() ? 'linear-gradient(135deg, #C9A227 0%, #A78B1F 100%)' : '#e2e8f0',
                                color: canProceed() ? 'white' : '#94a3b8',
                                fontSize: '0.9375rem',
                                fontWeight: 600,
                                cursor: canProceed() ? 'pointer' : 'not-allowed',
                                boxShadow: canProceed() ? '0 4px 12px rgba(201, 162, 39, 0.3)' : 'none',
                            }}
                        >
                            Continue →
                        </button>
                    ) : (
                        <button
                            onClick={handleComplete}
                            disabled={isLoading}
                            style={{
                                padding: '14px 32px',
                                border: 'none',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #1B365D 0%, #2a4a7a 100%)',
                                color: 'white',
                                fontSize: '0.9375rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(27, 54, 93, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}
                        >
                            {isLoading ? 'Setting up...' : '🚀 Start Finding Donors'}
                        </button>
                    )}
                </div>

                {/* Skip option */}
                {step < 3 && (
                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                        <button
                            onClick={() => setStep(3)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#94a3b8',
                                fontSize: '0.8125rem',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                            }}
                        >
                            Skip for now
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
