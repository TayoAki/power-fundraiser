"use client";

import * as React from "react";
import { loadOrganizationFromDB } from "@/lib/supabase";

const REGIONS = [
    "All Regions",
    "Pacific Northwest (USA)",
    "Northeast (USA)",
    "Southeast (USA)",
    "Midwest (USA)",
    "Southwest (USA)",
    "West Coast (USA)",
    "National (USA)",
    "International",
];

const GRANT_SIZES = [
    "Any Amount",
    "Under $25k",
    "$25k - $100k",
    "$100k - $500k",
    "$500k - $1M",
    "Over $1M",
];

// Loading animations with messages - 6 stages x 10 seconds = 60 seconds total
const LOADING_STAGES = [
    {
        message: "Scanning foundation databases...",
        subtext: "Analyzing 2M+ foundation profiles and mission statements",
        icon: (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
                <path d="M11 8v6M8 11h6" />
            </svg>
        ),
    },
    {
        message: "Matching your mission with donor priorities...",
        subtext: "Using AI to calculate alignment scores",
        icon: (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
        ),
    },
    {
        message: "Researching local foundations near you...",
        subtext: "Finding community funders in your ZIP code area",
        icon: (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
            </svg>
        ),
    },
    {
        message: "Analyzing 990-PF financial filings...",
        subtext: "Reviewing assets, giving trends, and grant sizes",
        icon: (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M16 13H8M16 17H8M10 9H8" />
            </svg>
        ),
    },
    {
        message: "Evaluating corporate giving programs...",
        subtext: "Identifying CSR initiatives aligned with your mission",
        icon: (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
        ),
    },
    {
        message: "Finalizing your donor intelligence report...",
        subtext: "Preparing 50 personalized funding matches",
        icon: (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
            </svg>
        ),
    },
];

export function SearchConfigModal({ open, onOpenChange, onSubmit }) {
    const [formData, setFormData] = React.useState({
        campaignName: "",
        organizationName: "",
        organizationMission: "",
        strategicGoals: "",
        targetRegion: "Pacific Northwest (USA)",
        grantSize: "$100k - $500k",
        causeAreas: [],
        zipCode: "",
    });
    const [isLoading, setIsLoading] = React.useState(false);
    const [loadingStage, setLoadingStage] = React.useState(0);
    const [animatingStep, setAnimatingStep] = React.useState(0);

    // Load organization settings from database (primary) or localStorage (fallback) when modal opens
    React.useEffect(() => {
        if (!open) return;
        
        const loadOrgSettings = async () => {
            // Try database first
            const orgId = localStorage.getItem('organizationId');
            if (orgId) {
                console.log('📋 [Modal] Loading org from database...');
                const dbOrg = await loadOrganizationFromDB(orgId);
                if (dbOrg) {
                    console.log('✅ [Modal] Loaded org from database:', dbOrg.name);
                    setFormData(prev => ({
                        ...prev,
                        organizationName: dbOrg.name || prev.organizationName,
                        organizationMission: dbOrg.mission || prev.organizationMission,
                        zipCode: dbOrg.zipCode || prev.zipCode,
                    }));
                    return;
                }
            }
            
            // Fallback to localStorage
            const storedOrgSettings = localStorage.getItem('orgSettings');
            if (storedOrgSettings) {
                try {
                    const orgSettings = JSON.parse(storedOrgSettings);
                    console.log('📋 [Modal] Loaded org from localStorage:', orgSettings.name);
                    setFormData(prev => ({
                        ...prev,
                        organizationName: orgSettings.name || prev.organizationName,
                        organizationMission: orgSettings.mission || prev.organizationMission,
                        zipCode: orgSettings.zipCode || prev.zipCode,
                    }));
                } catch (e) {
                    console.warn('Failed to parse org settings:', e);
                }
            }
        };
        
        loadOrgSettings();
    }, [open]);

    // Looping animation for the progress steps while user fills form
    React.useEffect(() => {
        if (!open || isLoading) return;
        const interval = setInterval(() => {
            setAnimatingStep(prev => (prev + 1) % 3);
        }, 2000);
        return () => clearInterval(interval);
    }, [open, isLoading]);

    const allStepsConfigured =
        formData.campaignName &&
        formData.organizationMission &&
        formData.strategicGoals;

    const handleCauseRemove = (cause) => {
        setFormData(prev => ({
            ...prev,
            causeAreas: prev.causeAreas.filter(c => c !== cause)
        }));
    };

    const handleSubmit = async () => {
        console.log('========================================');
        console.log('🔘 [Modal] SEARCH BUTTON CLICKED');
        console.log('========================================');
        console.log('📝 [Modal] Form data:', JSON.stringify(formData, null, 2));
        console.log('⏳ [Modal] Starting loading animation AND API call...');
        
        setIsLoading(true);
        setLoadingStage(0);

        // Start loading animation (runs in parallel with API call)
        const interval = setInterval(() => {
            setLoadingStage(prev => {
                if (prev >= LOADING_STAGES.length - 1) {
                    return prev; // Stay on last stage
                }
                console.log(`🔄 [Modal] Loading stage ${prev + 2}/${LOADING_STAGES.length}`);
                return prev + 1;
            });
        }, 10000); // 10 seconds per stage

        // Call onSubmit IMMEDIATELY (this triggers the API call)
        console.log('📤 [Modal] Calling onSubmit to trigger API...');
        try {
            await onSubmit?.(formData);
            console.log('✅ [Modal] onSubmit completed');
        } catch (error) {
            console.error('❌ [Modal] onSubmit error:', error);
        }
        
        // Clean up and close modal
        clearInterval(interval);
        setIsLoading(false);
        onOpenChange?.(false);
    };

    if (!open) return null;

    // Loading Screen
    if (isLoading) {
        const stage = LOADING_STAGES[loadingStage];
        return (
            <>
                {/* Overlay */}
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1000,
                        background: 'linear-gradient(135deg, #0F1729 0%, #1B2942 50%, #0F1729 100%)',
                    }}
                />

                {/* Loading Content */}
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1001,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {/* Decorative Gradients */}
                    <div style={{
                        position: 'absolute',
                        top: '10%',
                        left: '20%',
                        width: '400px',
                        height: '400px',
                        background: 'radial-gradient(circle, rgba(201, 162, 39, 0.15) 0%, transparent 70%)',
                        animation: 'pulse 4s ease-in-out infinite',
                    }} />
                    <div style={{
                        position: 'absolute',
                        bottom: '10%',
                        right: '20%',
                        width: '300px',
                        height: '300px',
                        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
                        animation: 'pulse 4s ease-in-out infinite 1s',
                    }} />

                    {/* Main Content */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        maxWidth: '500px',
                        padding: '0 24px',
                        position: 'relative',
                    }}>
                        {/* Animated Icon Container */}
                        <div style={{
                            width: '120px',
                            height: '120px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '40px',
                            position: 'relative',
                        }}>
                            {/* Outer Ring */}
                            <div style={{
                                position: 'absolute',
                                width: '120px',
                                height: '120px',
                                borderRadius: '50%',
                                border: '2px solid rgba(201, 162, 39, 0.2)',
                                animation: 'spin 8s linear infinite',
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: '-4px',
                                    left: '50%',
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: '#C9A227',
                                    boxShadow: '0 0 20px rgba(201, 162, 39, 0.6)',
                                }} />
                            </div>

                            {/* Middle Ring */}
                            <div style={{
                                position: 'absolute',
                                width: '90px',
                                height: '90px',
                                borderRadius: '50%',
                                border: '2px solid rgba(201, 162, 39, 0.15)',
                                animation: 'spin 6s linear infinite reverse',
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    bottom: '-4px',
                                    left: '50%',
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: '#E8D48A',
                                }} />
                            </div>

                            {/* Icon */}
                            <div style={{
                                color: '#C9A227',
                                animation: 'fadeInOut 3s ease-in-out infinite',
                            }}>
                                {stage.icon}
                            </div>
                        </div>

                        {/* Progress Indicator */}
                        <div style={{
                            display: 'flex',
                            gap: '8px',
                            marginBottom: '32px',
                        }}>
                            {LOADING_STAGES.map((_, i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: i === loadingStage ? '24px' : '8px',
                                        height: '8px',
                                        borderRadius: '4px',
                                        background: i <= loadingStage ? '#C9A227' : 'rgba(255, 255, 255, 0.2)',
                                        transition: 'all 0.3s ease',
                                    }}
                                />
                            ))}
                        </div>

                        {/* Message */}
                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: 700,
                            color: 'white',
                            margin: '0 0 12px',
                            animation: 'fadeIn 0.5s ease',
                        }}>
                            {stage.message}
                        </h2>
                        <p style={{
                            fontSize: '1rem',
                            color: 'rgba(255, 255, 255, 0.6)',
                            margin: 0,
                        }}>
                            {stage.subtext}
                        </p>

                        {/* Stats */}
                        <div style={{
                            display: 'flex',
                            gap: '40px',
                            marginTop: '60px',
                        }}>
                            {[
                                { value: '2M+', label: 'Foundations' },
                                { value: '$847B', label: 'Total Assets' },
                                { value: '98%', label: 'Match Rate' },
                            ].map((stat, i) => (
                                <div key={i} style={{ textAlign: 'center' }}>
                                    <div style={{
                                        fontSize: '1.5rem',
                                        fontWeight: 700,
                                        color: '#C9A227',
                                    }}>
                                        {stat.value}
                                    </div>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: 'rgba(255, 255, 255, 0.5)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}>
                                        {stat.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Animations */}
                    <style jsx global>{`
                        @keyframes spin {
                            from { transform: rotate(0deg); }
                            to { transform: rotate(360deg); }
                        }
                        @keyframes pulse {
                            0%, 100% { opacity: 0.5; transform: scale(1); }
                            50% { opacity: 1; transform: scale(1.1); }
                        }
                        @keyframes fadeInOut {
                            0%, 100% { opacity: 0.7; transform: scale(0.95); }
                            50% { opacity: 1; transform: scale(1); }
                        }
                        @keyframes fadeIn {
                            from { opacity: 0; transform: translateY(10px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>
                </div>
            </>
        );
    }

    return (
        <>
            {/* Overlay */}
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 1000,
                    background: 'linear-gradient(135deg, rgba(15, 23, 41, 0.9) 0%, rgba(27, 41, 66, 0.9) 100%)',
                    backdropFilter: 'blur(8px)',
                }}
                onClick={() => onOpenChange?.(false)}
            />

            {/* Modal */}
            <div
                style={{
                    position: 'fixed',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1001,
                    width: '100%',
                    maxWidth: '640px',
                    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                    borderRadius: '20px',
                    boxShadow: '0 25px 80px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '28px 28px 24px',
                    background: 'linear-gradient(135deg, #1B365D 0%, #2a4a7a 100%)',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {/* Decorative Elements */}
                    <div style={{
                        position: 'absolute',
                        top: '-50%',
                        right: '-20%',
                        width: '300px',
                        height: '300px',
                        background: 'radial-gradient(circle, rgba(201, 162, 39, 0.2) 0%, transparent 70%)',
                    }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
                        <div>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 12px',
                                background: 'rgba(201, 162, 39, 0.2)',
                                borderRadius: '100px',
                                marginBottom: '12px',
                            }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="#C9A227">
                                    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                                </svg>
                                <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#C9A227', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    AI-Powered
                                </span>
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', margin: 0 }}>
                                Strategy Configuration
                            </h2>
                            <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', marginTop: '6px' }}>
                                Define parameters for AI to generate targeted donor pathways
                            </p>
                        </div>
                        <button
                            onClick={() => onOpenChange?.(false)}
                            style={{
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: 'none',
                                background: 'rgba(255, 255, 255, 0.1)',
                                cursor: 'pointer',
                                color: 'white',
                                borderRadius: '10px',
                                transition: 'all 0.2s',
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Progress Steps */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '28px',
                        gap: '0',
                    }}>
                        {[
                            { num: 1, label: 'Campaign', complete: !!formData.campaignName },
                            { num: 2, label: 'Mission', complete: !!formData.organizationMission && !!formData.strategicGoals },
                            { num: 3, label: 'Criteria', complete: formData.causeAreas.length > 0 },
                        ].map((step, i) => {
                            const isAnimating = animatingStep === i;
                            const isComplete = step.complete;
                            return (
                                <React.Fragment key={step.num}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                                        {/* Animated ring for current step */}
                                        {isAnimating && !isComplete && (
                                            <div style={{
                                                position: 'absolute',
                                                width: '44px',
                                                height: '44px',
                                                borderRadius: '50%',
                                                border: '2px solid rgba(201, 162, 39, 0.5)',
                                                top: '-6px',
                                                animation: 'pulseRing 2s ease-in-out infinite',
                                            }} />
                                        )}
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.8125rem',
                                            fontWeight: 600,
                                            background: isComplete
                                                ? 'linear-gradient(135deg, #C9A227 0%, #A78B1F 100%)'
                                                : isAnimating
                                                    ? 'linear-gradient(135deg, rgba(201, 162, 39, 0.3) 0%, rgba(201, 162, 39, 0.1) 100%)'
                                                    : 'rgba(255, 255, 255, 0.1)',
                                            color: 'white',
                                            boxShadow: isComplete
                                                ? '0 4px 12px rgba(201, 162, 39, 0.4)'
                                                : isAnimating
                                                    ? '0 0 20px rgba(201, 162, 39, 0.3)'
                                                    : 'none',
                                            transition: 'all 0.3s ease',
                                        }}>
                                            {isComplete ? (
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                    <path d="M20 6L9 17l-5-5" />
                                                </svg>
                                            ) : step.num}
                                        </div>
                                        <span style={{
                                            fontSize: '0.6875rem',
                                            fontWeight: isAnimating || isComplete ? 600 : 500,
                                            color: isAnimating || isComplete ? '#C9A227' : 'rgba(255, 255, 255, 0.5)',
                                            marginTop: '6px',
                                            transition: 'all 0.3s ease',
                                        }}>
                                            {step.label}
                                        </span>
                                    </div>
                                    {i < 2 && (
                                        <div style={{
                                            flex: 1,
                                            height: '2px',
                                            maxWidth: '80px',
                                            background: isComplete
                                                ? 'linear-gradient(90deg, #C9A227 0%, rgba(201, 162, 39, 0.3) 100%)'
                                                : 'rgba(255, 255, 255, 0.1)',
                                            marginBottom: '20px',
                                        }} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {/* Animation keyframes */}
                    <style jsx global>{`
                        @keyframes pulseRing {
                            0%, 100% { transform: scale(1); opacity: 0.5; }
                            50% { transform: scale(1.15); opacity: 1; }
                        }
                    `}</style>
                </div>

                {/* Form Content */}
                <div style={{ padding: '28px', maxHeight: '50vh', overflowY: 'auto' }}>
                    {/* Section 1: Campaign Details */}
                    <div style={{ marginBottom: '28px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #C9A227 0%, #A78B1F 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                            </div>
                            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                                Campaign Details
                            </h3>
                        </div>
                        <input
                            type="text"
                            value={formData.campaignName}
                            onChange={(e) => setFormData(prev => ({ ...prev, campaignName: e.target.value }))}
                            placeholder="Enter campaign name..."
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                fontSize: '0.9375rem',
                                color: '#1e293b',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'all 0.2s',
                            }}
                        />
                    </div>

                    {/* Section 2: Mission & Strategy */}
                    <div style={{ marginBottom: '28px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #1B365D 0%, #2a4a7a 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M8 12l2 2 4-4" />
                                </svg>
                            </div>
                            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                                Mission & Strategy
                            </h3>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
                                Organization Mission
                            </label>
                            <textarea
                                value={formData.organizationMission}
                                onChange={(e) => setFormData(prev => ({ ...prev, organizationMission: e.target.value }))}
                                rows={2}
                                placeholder="To empower underprivileged youth through accessible technology education..."
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '10px',
                                    fontSize: '0.9375rem',
                                    color: '#1e293b',
                                    outline: 'none',
                                    resize: 'none',
                                    boxSizing: 'border-box',
                                    fontFamily: 'inherit',
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
                                Strategic Goals
                            </label>
                            <textarea
                                value={formData.strategicGoals}
                                onChange={(e) => setFormData(prev => ({ ...prev, strategicGoals: e.target.value }))}
                                rows={2}
                                placeholder="Secure $2M in funding to expand coding bootcamps to 5 new regions..."
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '10px',
                                    fontSize: '0.9375rem',
                                    color: '#1e293b',
                                    outline: 'none',
                                    resize: 'none',
                                    boxSizing: 'border-box',
                                    fontFamily: 'inherit',
                                }}
                            />
                        </div>
                    </div>

                    {/* Section 3: Donor Criteria */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                                </svg>
                            </div>
                            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                                Donor Criteria
                            </h3>
                        </div>

                        {/* ZIP Code for location-based search */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
                                ZIP Code <span style={{ fontWeight: 400, color: '#94a3b8' }}>(for local donor matching)</span>
                            </label>
                            <input
                                type="text"
                                value={formData.zipCode}
                                onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
                                placeholder="e.g., 98101"
                                style={{
                                    width: '140px',
                                    padding: '14px 16px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '10px',
                                    fontSize: '0.9375rem',
                                    color: '#1e293b',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
                                    Target Region
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <select
                                        value={formData.targetRegion}
                                        onChange={(e) => setFormData(prev => ({ ...prev, targetRegion: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: '14px 40px 14px 16px',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '10px',
                                            fontSize: '0.9375rem',
                                            color: '#1e293b',
                                            outline: 'none',
                                            appearance: 'none',
                                            backgroundColor: 'white',
                                            cursor: 'pointer',
                                            boxSizing: 'border-box',
                                        }}
                                    >
                                        {REGIONS.map(region => (
                                            <option key={region} value={region}>{region}</option>
                                        ))}
                                    </select>
                                    <svg
                                        style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"
                                    >
                                        <path d="M6 9l6 6 6-6" />
                                    </svg>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
                                    Grant Size
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <select
                                        value={formData.grantSize}
                                        onChange={(e) => setFormData(prev => ({ ...prev, grantSize: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: '14px 40px 14px 16px',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '10px',
                                            fontSize: '0.9375rem',
                                            color: '#1e293b',
                                            outline: 'none',
                                            appearance: 'none',
                                            backgroundColor: 'white',
                                            cursor: 'pointer',
                                            boxSizing: 'border-box',
                                        }}
                                    >
                                        {GRANT_SIZES.map(size => (
                                            <option key={size} value={size}>{size}</option>
                                        ))}
                                    </select>
                                    <svg
                                        style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"
                                    >
                                        <path d="M6 9l6 6 6-6" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#64748b', marginBottom: '10px' }}>
                                Cause Areas
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                                {formData.causeAreas.map(cause => (
                                    <span
                                        key={cause}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 14px',
                                            background: 'linear-gradient(135deg, #1B365D 0%, #2a4a7a 100%)',
                                            color: 'white',
                                            fontSize: '0.8125rem',
                                            fontWeight: 500,
                                            borderRadius: '100px',
                                        }}
                                    >
                                        {cause}
                                        <button
                                            onClick={() => handleCauseRemove(cause)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: 'none',
                                                background: 'rgba(255, 255, 255, 0.2)',
                                                cursor: 'pointer',
                                                color: 'white',
                                                padding: '2px',
                                                borderRadius: '50%',
                                            }}
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M18 6L6 18M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    placeholder="+ Add area"
                                    style={{
                                        padding: '8px 14px',
                                        border: '1px dashed #cbd5e1',
                                        borderRadius: '100px',
                                        fontSize: '0.8125rem',
                                        color: '#64748b',
                                        outline: 'none',
                                        width: '100px',
                                        background: 'transparent',
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.target.value) {
                                            setFormData(prev => ({
                                                ...prev,
                                                causeAreas: [...prev.causeAreas, e.target.value]
                                            }));
                                            e.target.value = '';
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '20px 28px',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: allStepsConfigured ? '#22C55E' : '#94a3b8',
                        }} />
                        <span style={{ fontSize: '0.8125rem', color: allStepsConfigured ? '#166534' : '#64748b', fontWeight: 500 }}>
                            {allStepsConfigured ? 'Ready to generate' : 'Complete all fields'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            onClick={() => onOpenChange?.(false)}
                            style={{
                                padding: '12px 20px',
                                border: '1px solid #e2e8f0',
                                background: 'white',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: '#64748b',
                                borderRadius: '10px',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '12px 24px',
                                background: 'linear-gradient(135deg, #C9A227 0%, #A78B1F 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '0.9375rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                boxShadow: '0 4px 16px rgba(201, 162, 39, 0.4)',
                                transition: 'all 0.2s',
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                            </svg>
                            Generate AI Strategy
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
