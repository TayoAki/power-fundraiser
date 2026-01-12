/**
 * OpenRouter API Client
 * 
 * Shared utility for calling OpenRouter LLMs from Supabase Edge Functions.
 * 
 * Usage:
 * import { generateCompletion, generateJSON } from '../_shared/openrouter.ts';
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface CompletionOptions {
    model?: string;
    maxTokens?: number;
    temperature?: number;
}

interface OpenRouterResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

/**
 * Generate a text completion from OpenRouter
 */
export async function generateCompletion(
    messages: Message[],
    options: CompletionOptions = {}
): Promise<string> {
    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY not configured');
    }

    const {
        model = 'anthropic/claude-3.5-sonnet',
        maxTokens = 2048,
        temperature = 0.7,
    } = options;

    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': Deno.env.get('SUPABASE_URL') || 'https://power-fundraiser.app',
            'X-Title': 'Power Fundraiser',
        },
        body: JSON.stringify({
            model,
            messages,
            max_tokens: maxTokens,
            temperature,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data: OpenRouterResponse = await response.json();
    return data.choices[0]?.message?.content || '';
}

/**
 * Generate a JSON response from OpenRouter
 */
export async function generateJSON<T>(
    messages: Message[],
    options: CompletionOptions = {}
): Promise<T> {
    // Add JSON instruction to system message
    const jsonMessages: Message[] = [
        ...messages.slice(0, -1),
        {
            ...messages[messages.length - 1],
            content: messages[messages.length - 1].content + '\n\nRespond with valid JSON only.',
        },
    ];

    const content = await generateCompletion(jsonMessages, options);
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('No JSON found in response');
    }

    return JSON.parse(jsonMatch[0]) as T;
}

/**
 * Generate donor insights
 */
export async function generateDonorInsights(
    donor: {
        name: string;
        focus_areas: string;
        description: string;
        total_assets?: number;
        total_giving?: number;
    },
    organizationMission: string
): Promise<{
    summary: string;
    keyOpportunities: string[];
    approachStrategy: string;
    recommendedAsk: string;
    successProbability: number;
}> {
    const messages: Message[] = [
        {
            role: 'system',
            content: `You are an expert nonprofit fundraising consultant. Analyze donors and provide strategic insights for grant seeking organizations. Be specific, actionable, and data-driven.`,
        },
        {
            role: 'user',
            content: `Analyze this donor for a potential partnership:

DONOR:
Name: ${donor.name}
Focus Areas: ${donor.focus_areas}
Description: ${donor.description}
Total Assets: ${donor.total_assets ? '$' + donor.total_assets.toLocaleString() : 'Unknown'}
Annual Giving: ${donor.total_giving ? '$' + donor.total_giving.toLocaleString() : 'Unknown'}

ORGANIZATION MISSION:
${organizationMission}

Provide analysis in this JSON format:
{
  "summary": "2-3 sentence analysis of alignment and opportunity",
  "keyOpportunities": ["opportunity 1", "opportunity 2", "opportunity 3", "opportunity 4"],
  "approachStrategy": "Specific recommendation for how to approach this donor",
  "recommendedAsk": "Recommended grant request range",
  "successProbability": 0-100
}`,
        },
    ];

    return generateJSON(messages, { temperature: 0.5 });
}

/**
 * Generate email content
 */
export async function generateEmailContent(
    recipientName: string,
    donorName: string,
    organizationName: string,
    purpose: string,
    context: Record<string, unknown> = {}
): Promise<{
    subject: string;
    body: string;
}> {
    const messages: Message[] = [
        {
            role: 'system',
            content: `You are an expert nonprofit communications specialist. Write professional, warm, and effective emails for donor outreach. Be concise but compelling.`,
        },
        {
            role: 'user',
            content: `Write an email for the following scenario:

RECIPIENT: ${recipientName} at ${donorName}
SENDER ORGANIZATION: ${organizationName}
PURPOSE: ${purpose}
ADDITIONAL CONTEXT: ${JSON.stringify(context)}

Provide the email in this JSON format:
{
  "subject": "Email subject line",
  "body": "Full email body with appropriate greeting and signature placeholder"
}`,
        },
    ];

    return generateJSON(messages, { temperature: 0.7 });
}

/**
 * Generate proposal content
 */
export async function generateProposalSection(
    sectionType: 'executive_summary' | 'statement_of_need' | 'project_description' | 'budget_narrative' | 'evaluation_plan',
    projectName: string,
    organizationName: string,
    donorName: string,
    context: Record<string, unknown> = {}
): Promise<string> {
    const sectionPrompts: Record<string, string> = {
        executive_summary: 'Write a compelling executive summary (2-3 paragraphs)',
        statement_of_need: 'Write a statement of need with data and community voice',
        project_description: 'Write a detailed project description with activities and timeline',
        budget_narrative: 'Write a budget narrative explaining line items and costs',
        evaluation_plan: 'Write an evaluation plan with metrics and methods',
    };

    const messages: Message[] = [
        {
            role: 'system',
            content: `You are an expert grant writer with 20 years of experience. Write compelling, professional proposal sections that resonate with foundation program officers.`,
        },
        {
            role: 'user',
            content: `${sectionPrompts[sectionType]}

PROJECT: ${projectName}
ORGANIZATION: ${organizationName}
TARGET FUNDER: ${donorName}
CONTEXT: ${JSON.stringify(context)}

Write only the section content, no headers or labels.`,
        },
    ];

    return generateCompletion(messages, { maxTokens: 1024 });
}
