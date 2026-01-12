import { NextResponse } from 'next/server';
import { generateCompletion } from '@/lib/openrouter';

export async function POST(request) {
    try {
        console.log('🚀 [API/proposal/generate] Received request');
        const body = await request.json();
        const {
            type = 'proposal',
            donorName,
            donorFocusAreas,
            projectName,
            amount,
            summary,
            goals,
            timeline,
            organizationName,
            organizationMission,
        } = body;

        console.log('📝 [API/proposal/generate] Params:', { type, donorName, projectName, amount });

        const typePrompts = {
            loi: 'Letter of Inquiry (LOI)',
            proposal: 'Full Grant Proposal',
            budget: 'Budget Narrative',
            cover: 'Cover Letter',
            progress: 'Progress Report',
            thankyou: 'Thank You Letter',
        };

        const docType = typePrompts[type] || 'Full Grant Proposal';

        const prompt = `You are an expert nonprofit grant writer. Generate a ${docType} for:

ORGANIZATION: ${organizationName || '[Organization Name]'}
MISSION: ${organizationMission || '[Organization Mission]'}
TARGET FOUNDATION: ${donorName}
FOCUS AREAS: ${donorFocusAreas || 'General philanthropy'}

PROJECT:
- Name: ${projectName}
- Amount: ${amount ? '$' + Number(amount).toLocaleString() : 'TBD'}
- Summary: ${summary || 'A community-focused initiative'}
- Goals: ${goals || 'To create positive community impact'}
- Timeline: ${timeline || '12 months'}

Write a professional ${docType} with section headers in ALL CAPS.
Do not use markdown. Write 500-1500 words.`;

        // Convert prompt to messages array format
        const messages = [
            { role: 'user', content: prompt }
        ];

        console.log('🤖 [API/proposal/generate] Calling OpenRouter...');
        const content = await generateCompletion(messages, {
            maxTokens: 2000,
            temperature: 0.7,
        });

        console.log('✅ [API/proposal/generate] Generated content length:', content?.length);

        if (!content) {
            throw new Error('No content generated from AI');
        }

        return NextResponse.json({
            success: true,
            content,
            title: projectName || 'Grant Proposal',
            subtitle: docType + ' for ' + donorName,
            outcomes: [
                'Secure funding from ' + donorName,
                'Complete ' + projectName + ' within ' + (timeline || '12 months'),
                'Achieve measurable community impact',
            ],
        });

    } catch (error) {
        console.error('❌ [API/proposal/generate] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
