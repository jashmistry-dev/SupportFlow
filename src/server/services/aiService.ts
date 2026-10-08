import { GoogleGenAI, Type } from '@google/genai';
import { config } from '../config.ts';

export interface AISummaryResult {
  issueSummary: string;
  impact: string;
  whatHasBeenTried: string;
  currentSituation: string;
  missingInformation: string;
  suggestedTroubleshootingSteps: string[];
}

export interface TicketSummaryInput {
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  tryingToDo?: string | null;
  expectedResult?: string | null;
  actualResult?: string | null;
  errorMessage?: string | null;
  affectedModule?: string | null;
  attemptedSolution?: string | null;
  comments: Array<{
    userName: string;
    role: string;
    body: string;
    createdAt: Date;
  }>;
}

export async function generateTicketAISummary(
  input: TicketSummaryInput
): Promise<AISummaryResult> {
  const apiKey = process.env.GEMINI_API_KEY || config.geminiApiKey;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'invalid-test-key') {
    console.error('[aiService] GEMINI_API_KEY is not configured or is placeholder in environment');
    throw new Error('AI summary is temporarily unavailable. Please configure GEMINI_API_KEY.');
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const promptText = `
Support Ticket Details:
- Ticket Number: ${input.ticketNumber}
- Subject: ${input.subject}
- Category: ${input.category}
- Priority: ${input.priority}
- Current Status: ${input.status}
- Problem Description: ${input.description}
${input.tryingToDo ? `- What the user was trying to do: ${input.tryingToDo}` : ''}
${input.expectedResult ? `- Expected Result: ${input.expectedResult}` : ''}
${input.actualResult ? `- Actual Result: ${input.actualResult}` : ''}
${input.errorMessage ? `- Error Message Reported: ${input.errorMessage}` : ''}
${input.affectedModule ? `- Affected Module: ${input.affectedModule}` : ''}
${input.attemptedSolution ? `- What has already been tried: ${input.attemptedSolution}` : ''}

Ticket Discussion & Comments (${input.comments.length} entries):
${
  input.comments.length > 0
    ? input.comments
        .map(
          (c) =>
            `[${new Date(c.createdAt).toISOString()}] ${c.userName} (${c.role}): ${c.body}`
        )
        .join('\n')
    : 'No additional comments recorded.'
}

Analyze the above technical issue and generate a concise advisory technical summary according to the required schema.
`;

  const systemInstruction = `You are an internal technical support assistant for SupportFlow.
Analyze the provided support ticket and conversation using only the information provided.
Do not invent facts.
Do not claim a confirmed root cause unless the information directly supports it.
Clearly distinguish known information from possible troubleshooting suggestions.
If information is insufficient, write: 'Root cause is not confirmed from the available information.'
The response must be concise, technical and useful to a support engineer.`;

  // We use gemini-3.8-flash as primary recommended model, with a 25-second server timeout
  const primaryModel = 'gemini-3.8-flash';
  const fallbackModel = 'gemini-3.1-flash-lite';

  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('AI request timed out after 25 seconds'));
    }, 25000);
    // Unref timer so it doesn't hold open Node process if done
    if (typeof timer.unref === 'function') timer.unref();
  });

  const callGemini = async (modelName: string): Promise<AISummaryResult> => {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: promptText,
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            issueSummary: {
              type: Type.STRING,
              description: 'Concise summary of the problem.',
            },
            impact: {
              type: Type.STRING,
              description: 'Operational impact of the issue.',
            },
            whatHasBeenTried: {
              type: Type.STRING,
              description: 'Troubleshooting steps attempted so far.',
            },
            currentSituation: {
              type: Type.STRING,
              description: 'Current status and known diagnostic facts.',
            },
            missingInformation: {
              type: Type.STRING,
              description: 'Missing logs or details needed to confirm root cause.',
            },
            suggestedTroubleshootingSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Suggested troubleshooting steps for the engineer.',
            },
          },
          required: [
            'issueSummary',
            'impact',
            'whatHasBeenTried',
            'currentSituation',
            'missingInformation',
            'suggestedTroubleshootingSteps',
          ],
        },
      },
    });

    let rawText = response.text;
    if (!rawText) {
      throw new Error('Empty response received from AI model');
    }

    // Clean any markdown wrapper if present
    rawText = rawText.trim();
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(rawText) as AISummaryResult;

    if (
      !parsed.issueSummary ||
      !parsed.impact ||
      !Array.isArray(parsed.suggestedTroubleshootingSteps)
    ) {
      throw new Error('AI summary response missing expected fields');
    }

    return parsed;
  };

  try {
    const result = await Promise.race([callGemini(primaryModel), timeoutPromise]);
    return result;
  } catch (err: any) {
    console.warn(`[aiService] Primary model (${primaryModel}) failed:`, err?.message || err, '. Attempting fallback...');
    try {
      const fallbackResult = await Promise.race([callGemini(fallbackModel), timeoutPromise]);
      return fallbackResult;
    } catch (fallbackErr: any) {
      console.error('[aiService] Fallback model also failed:', fallbackErr?.message || fallbackErr);
      throw new Error('AI summary is temporarily unavailable. Please try again.');
    }
  }
}
