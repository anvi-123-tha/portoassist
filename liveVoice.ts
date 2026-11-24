import { GoogleGenAI, Modality, type LiveServerMessage } from '@google/genai';
import type { IncomingMessage } from 'node:http';
import { WebSocket } from 'ws';
import { verifyToken } from '../auth.ts';
import { db } from '../db.ts';

const LIVE_MODEL = 'gemini-3.8-live';

function buildLiveSystemInstruction(_preferredLang?: string, userName?: string): string {
  const userLine = userName ? `The signed-in passenger's name is ${userName}.` : '';

  return `You are PortoAssist Live, a real-time accessible voice companion for PortoAssist — an on-demand luggage assistance and mobility support platform for airports, railway stations, and bus terminals.
${userLine}

CRITICAL ENGLISH-ONLY OUTPUT RULE:
- Understand the passenger whether they speak in English, Kannada, or Hindi (including native scripts and mixed Kanglish or Hinglish).
- Regardless of which language the passenger speaks, ALWAYS translate their intent mentally and respond STRICTLY in clear, natural English ONLY.
- NEVER speak or output Kannada words, Hindi words, Kanglish, Hinglish, or mixed-language sentences in your response.
- NEVER ask the passenger which language they prefer or ask them to choose a language.

VOICE STYLE & HELPFULNESS:
- Speak concisely, warmly, and clearly as in a real phone conversation (1–3 short sentences per turn unless detailed help is requested).
- Help passengers understand PortoAssist services: luggage porter assistance, wheelchair & mobility escort, visually impaired & senior citizen support, verified helpers, live GPS helper tracking, OTP pickup verification, and UPI or Cash payment.
- If the passenger wants to complete a hands-free booking directly into their account, guide them that they can switch back to the "Guided Booking" tab anytime to confirm pickup, destination, and dispatch a helper immediately.`;
}

function formatLiveErrorMessage(err: unknown): string {
  const raw =
    err && typeof err === 'object' && 'message' in err
      ? String((err as { message?: unknown }).message || '')
      : String(err || 'Gemini Live connection error');
  if (raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID') || raw.includes('403')) {
    return 'Gemini API key error (403/400). Please check your API key in Settings > Secrets.';
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return 'Gemini Live API quota exhausted (429). Please try again shortly or check billing in Settings > Secrets.';
  }
  if (raw.includes('NOT_FOUND') || raw.includes('404')) {
    return `Gemini Live model (${LIVE_MODEL}) is unavailable for the current API key or region.`;
  }
  return raw || 'Unable to connect to Gemini Live voice session.';
}

export function handleLiveVoiceConnection(clientWs: WebSocket, req: IncomingMessage) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey.startsWith('MY_')) {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(
        JSON.stringify({
          type: 'error',
          error: 'Gemini API key is not configured on the server. Please add GEMINI_API_KEY in Settings > Secrets.',
        })
      );
      clientWs.close();
    }
    return;
  }

  const url = new URL(req.url || '/ws/live', 'http://localhost');
  const token = url.searchParams.get('token');
  const lang = url.searchParams.get('lang') || 'en';
  const auth = token ? verifyToken(token) : null;
  const user = auth
    ? (db.prepare('SELECT full_name FROM users WHERE id = ?').get(auth.userId) as
        | { full_name?: string }
        | undefined)
    : undefined;

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  let closedByClient = false;
  let sessionClosed = false;

  const sendToClient = (payload: Record<string, unknown>) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify(payload));
    }
  };

  const sessionPromise = ai.live
    .connect({
      model: LIVE_MODEL,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' },
          },
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: buildLiveSystemInstruction(lang, user?.full_name),
      },
      callbacks: {
        onopen: () => {
          sendToClient({ type: 'ready', model: LIVE_MODEL });
        },
        onmessage: (message: LiveServerMessage) => {
          const content = message.serverContent;
          if (!content) return;

          if (content.inputTranscription?.text) {
            sendToClient({
              type: 'inputTranscript',
              text: content.inputTranscription.text,
            });
          }

          if (content.outputTranscription?.text) {
            sendToClient({
              type: 'outputTranscript',
              text: content.outputTranscription.text,
            });
          }

          for (const part of content.modelTurn?.parts ?? []) {
            if (part.inlineData?.data) {
              sendToClient({
                type: 'audio',
                data: part.inlineData.data,
              });
            }
          }

          if (content.interrupted) {
            sendToClient({ type: 'interrupted' });
          }

          if (content.turnComplete) {
            sendToClient({ type: 'turnComplete' });
          }
        },
        onerror: (err: unknown) => {
          sendToClient({
            type: 'error',
            error: formatLiveErrorMessage(err),
          });
        },
        onclose: (evt?: { reason?: string }) => {
          sessionClosed = true;
          if (!closedByClient) {
            sendToClient({
              type: 'closed',
              reason: evt?.reason || 'Live voice session closed.',
            });
          }
        },
      },
    })
    .catch((err: unknown) => {
      sendToClient({
        type: 'error',
        error: formatLiveErrorMessage(err),
      });
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close();
      }
      return null;
    });

  clientWs.on('message', (raw) => {
    let msg: { type?: string; audio?: string; text?: string };
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    void sessionPromise.then((session) => {
      if (!session || sessionClosed || closedByClient) return;
      try {
        if (msg.type === 'audio' && typeof msg.audio === 'string' && msg.audio.length > 0) {
          session.sendRealtimeInput({
            audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (msg.type === 'text' && typeof msg.text === 'string' && msg.text.trim()) {
          session.sendRealtimeInput({
            text: msg.text.trim(),
          });
        }
      } catch (err) {
        sendToClient({
          type: 'error',
          error: formatLiveErrorMessage(err),
        });
      }
    });
  });

  clientWs.on('close', () => {
    closedByClient = true;
    void sessionPromise.then((session) => {
      if (session && !sessionClosed) {
        sessionClosed = true;
        try {
          session.close();
        } catch {
          // ignore
        }
      }
    });
  });
}
