import { GoogleGenAI, Type } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

export interface AiQualificationResult {
  intent: string;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  budgetSignal: string;
  keyRequirements: string[];
  missingInformation: string[];
  suggestedNextAction: string;
  confidenceScore: number;
  requiresHandoff: boolean;
  handoffReason: string | null;
  draftReply: string;
  modelUsed: string;
}

export async function analyzeAndQualifyLead(params: {
  leadName: string;
  company?: string;
  enquiryText: string;
  source?: string;
  industry?: string;
  businessName?: string;
}): Promise<AiQualificationResult> {
  const { leadName, company, enquiryText, source = 'Website', industry = 'Local Business', businessName = 'Our Company' } = params;

  const client = getAiClient();

  if (!client) {
    // Intelligent deterministic heuristic fallback when Gemini API key is not configured
    return fallbackHeuristicQualification(params, 'AI Key not configured in environment. Using deterministic qualification.');
  }

  try {
    const prompt = `
You are the AI qualification engine for "${businessName}" (Industry: ${industry}).
Analyze this customer lead inquiry strictly using verified facts. Never hallucinate pricing guarantees, fake appointments, or commitments.

Lead Contact: ${leadName}
Company/Organization: ${company || 'Individual / Residential'}
Lead Source: ${source}
Inquiry Text:
"${enquiryText}"

Guidelines for escalation (Human Handoff):
- Set 'requiresHandoff' to true if:
  1. The user explicitly requests to talk to a human or manager.
  2. The message contains a dispute, complaint, legal threat, or refund demand.
  3. The request requires special discounts, pricing negotiations, or customized commitments.
  4. The information is contradictory or ambiguous.
  5. Confidence is below 0.75.
`;

    const response = await client.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: { type: Type.STRING, description: 'Short 3-8 word summary of what the customer wants' },
            urgency: { type: Type.STRING, enum: ['low', 'medium', 'high', 'urgent'] },
            budgetSignal: { type: Type.STRING, description: 'Budget indication or not specified' },
            keyRequirements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Key deliverables or service items mentioned'
            },
            missingInformation: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Missing details needed for complete quote'
            },
            suggestedNextAction: { type: Type.STRING, description: 'Concrete next step for sales agent' },
            confidenceScore: { type: Type.NUMBER, description: 'Confidence between 0.0 and 1.0' },
            requiresHandoff: { type: Type.BOOLEAN, description: 'True if human intervention is necessary' },
            handoffReason: { type: Type.STRING, description: 'Reason for human handoff or empty if false' },
            draftReply: { type: Type.STRING, description: 'Polite, professional email/SMS draft from the business' }
          },
          required: [
            'intent',
            'urgency',
            'budgetSignal',
            'keyRequirements',
            'missingInformation',
            'suggestedNextAction',
            'confidenceScore',
            'requiresHandoff',
            'draftReply'
          ]
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');

    return {
      intent: parsed.intent || 'Service inquiry',
      urgency: (['low', 'medium', 'high', 'urgent'].includes(parsed.urgency) ? parsed.urgency : 'medium') as any,
      budgetSignal: parsed.budgetSignal || 'Unspecified',
      keyRequirements: Array.isArray(parsed.keyRequirements) ? parsed.keyRequirements : [],
      missingInformation: Array.isArray(parsed.missingInformation) ? parsed.missingInformation : [],
      suggestedNextAction: parsed.suggestedNextAction || 'Schedule discovery consultation',
      confidenceScore: typeof parsed.confidenceScore === 'number' ? Math.min(1, Math.max(0, parsed.confidenceScore)) : 0.85,
      requiresHandoff: Boolean(parsed.requiresHandoff),
      handoffReason: parsed.requiresHandoff ? (parsed.handoffReason || 'Flagged for human review') : null,
      draftReply: parsed.draftReply || `Hello ${leadName}, thank you for contacting ${businessName}. A team member will review your request and get in touch with you promptly.`,
      modelUsed: 'gemini-3.8-flash'
    };
  } catch (error: any) {
    console.error('[AI Qualification Error]', error?.message || error);
    return fallbackHeuristicQualification(params, `Gemini API fallback: ${error?.message || 'Execution error'}`);
  }
}

function fallbackHeuristicQualification(
  params: { leadName: string; enquiryText: string; businessName?: string },
  reason: string
): AiQualificationResult {
  const text = (params.enquiryText || '').toLowerCase();
  const isUrgent = text.includes('urgent') || text.includes('emergency') || text.includes('asap') || text.includes('broken') || text.includes('leak') || text.includes('flood') || text.includes('immediate') || text.includes('demand') || text.includes('complaint') || text.includes('dispute');
  const hasHumanRequest = text.includes('human') || text.includes('speak to') || text.includes('manager') || text.includes('complaint') || text.includes('refund') || text.includes('dispute');
  const hasBudget = text.includes('$') || text.includes('budget') || text.includes('quote') || text.includes('price');

  return {
    intent: text.slice(0, 40) || 'General service inquiry',
    urgency: isUrgent ? 'urgent' : 'medium',
    budgetSignal: hasBudget ? 'Budget mentioned in message' : 'Standard rate inquiry',
    keyRequirements: [params.enquiryText.slice(0, 60)],
    missingInformation: ['Site address', 'Preferred completion date', 'Service tier preference'],
    suggestedNextAction: hasHumanRequest ? 'Call customer directly to address specific escalation' : 'Send discovery questionnaire & schedule phone consultation',
    confidenceScore: 0.78,
    requiresHandoff: hasHumanRequest || isUrgent,
    handoffReason: hasHumanRequest ? 'Customer requested human manager review or raised inquiry priority.' : (isUrgent ? 'High urgency inquiry requires immediate human dispatch.' : null),
    draftReply: `Hi ${params.leadName}, thank you for reaching out to ${params.businessName || 'our team'}. We have received your inquiry regarding "${params.enquiryText.slice(0, 50)}..." and an experienced specialist is reviewing it right now.`,
    modelUsed: `rule_engine (${reason})`
  };
}
