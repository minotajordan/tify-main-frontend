import { GoogleGenAI, Type } from '@google/genai';
import { api } from './api';

const apiKey = process.env.API_KEY || '';
let ai: GoogleGenAI | null = null;

try {
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
  }
} catch (error) {
  console.error('Failed to initialize Gemini:', error);
}

// Helper to build context dynamically from API
const buildSystemContext = async (): Promise<string> => {
  try {
    const uid = api.getCurrentUserId();
    const [channels, stats] = await Promise.all([
      api.getChannels(),
      uid
        ? api.getUserStats(uid)
        : Promise.resolve({
            subscribedChannelsCount: 0,
            messagesCount: 0,
            ownedChannelsCount: 0,
            pendingApprovalsCount: 0,
            recentActivity: [],
          } as any),
    ]);

    // Simplified representations for token efficiency
    const channelSummary = channels.map((c) => ({
      name: c.title,
      members: c.memberCount,
      policy: c.approvalPolicy,
      subchannels: c.subchannels?.length || 0,
    }));

    return `
You are the "Tify Brain", an AI administrator for the Tify messaging platform.
Current System State:
- Active Admin: ${uid || 'unknown'}
- Total Messages Handled: ${stats.messagesCount}
- Channels Managed: ${JSON.stringify(channelSummary)}
- Pending Approvals Count: ${stats.pendingApprovalsCount}

Your capabilities:
1. Draft messages based on channel tone.
2. Analyze delivery statistics.
3. Explain platform rules (e.g., "Emergency messages bypass approval if set to Immediate").
4. Summarize pending approvals.

Response style: Professional, concise, and helpful.
`;
  } catch (error) {
    console.warn('Could not fetch real-time context for AI', error);
    return 'You are Tify Brain. System data is currently unavailable, answer generally.';
  }
};

export const generateMessageDraft = async (
  prompt: string,
  channelName: string
): Promise<string> => {
  if (!ai) return 'AI Service not initialized. Please check API Key.';

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Draft a message for the "${channelName}" channel. Context: ${prompt}. Keep it under 200 characters if possible for push notification compatibility.`,
      config: {
        systemInstruction:
          'You are a helpful communication assistant for a corporate messaging app.',
      },
    });
    return response.text || '';
  } catch (error) {
    console.error('Gemini generation error:', error);
    return 'Error generating draft.';
  }
};

export const askTifyBrain = async (userQuery: string): Promise<string> => {
  if (!ai) return 'AI Service not initialized (Missing API Key).';

  try {
    const systemContext = await buildSystemContext();

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userQuery,
      config: {
        systemInstruction: systemContext,
        thinkingConfig: { thinkingBudget: 1024 },
      },
    });
    return response.text || "I couldn't process that request.";
  } catch (error) {
    console.error('Gemini chat error:', error);
    return "I'm having trouble connecting to the Tify neural network right now.";
  }
};

export const analyzeMessageSentiment = async (
  message: string
): Promise<{ sentiment: string; score: number }> => {
  if (!ai) return { sentiment: 'Unknown', score: 0 };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the sentiment of this message: "${message}"`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: { type: Type.STRING, description: 'POSITIVE, NEGATIVE, or NEUTRAL' },
            score: { type: Type.NUMBER, description: '0 to 1 confidence score' },
          },
        },
      },
    });
    const text = response.text;
    return text ? JSON.parse(text) : { sentiment: 'Neutral', score: 0.5 };
  } catch (e) {
    return { sentiment: 'Error', score: 0 };
  }
};
