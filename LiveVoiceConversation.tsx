import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AudioLines,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  Send,
  Volume2,
} from 'lucide-react';
import { getStoredToken } from '../api';
import type { Language } from '../types';

interface LiveTurnItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface LiveVoiceConversationProps {
  language: Language;
  onSwitchToGuided: () => void;
}

type LiveStatus = 'idle' | 'connecting' | 'connected' | 'error';

function downsampleTo16kPcmBase64(input: Float32Array, inputSampleRate: number): string {
  const targetRate = 16000;
  let samples: Float32Array;
  if (inputSampleRate === targetRate) {
    samples = input;
  } else {
    const ratio = inputSampleRate / targetRate;
    const newLen = Math.max(1, Math.round(input.length / ratio));
    samples = new Float32Array(newLen);
    for (let i = 0; i < newLen; i += 1) {
      const start = Math.floor(i * ratio);
      const end = Math.min(input.length, Math.floor((i + 1) * ratio));
      let sum = 0;
      let count = 0;
      for (let j = start; j < end; j += 1) {
        sum += input[j];
        count += 1;
      }
      samples[i] = count > 0 ? sum / count : input[Math.min(start, input.length - 1)] || 0;
    }
  }

  const pcm16 = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    pcm16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  const bytes = new Uint8Array(pcm16.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function base64Pcm24kToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer);
  const sampleCount = Math.floor(bytes.byteLength / 2);
  const floats = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i += 1) {
    const s = view.getInt16(i * 2, true);
    floats[i] = s / 32768;
  }
  return floats;
}

const LIVE_LABELS: Record<
  Language,
  {
    title: string;
    subtitle: string;
    connectBtn: string;
    connecting: string;
    liveListening: string;
    aiSpeaking: string;
    mutedLabel: string;
    muteBtn: string;
    unmuteBtn: string;
    endBtn: string;
    switchGuided: string;
    placeholder: string;
    send: string;
    emptyHint: string;
  }
> = {
  en: {
    title: 'Real-Time Live AI Conversation',
    subtitle: 'Speak in English, Kannada, or Hindi — replies always in English',
    connectBtn: 'Start Live Conversation',
    connecting: 'Connecting live voice session...',
    liveListening: 'Live — Speak naturally anytime',
    aiSpeaking: 'PortoAssist Live is speaking...',
    mutedLabel: 'Microphone muted',
    muteBtn: 'Mute Mic',
    unmuteBtn: 'Unmute Mic',
    endBtn: 'Disconnect Live',
    switchGuided: 'Back to Guided Booking',
    placeholder: 'Or type a message to Live AI...',
    send: 'Send',
    emptyHint: 'Speak freely to ask about luggage porters, wheelchair support, station pickups, or booking steps.',
  },
  kn: {
    title: 'ನೇರ ಲೈವ್ AI ಸಂಭಾಷಣೆ',
    subtitle: 'ಇಂಗ್ಲಿಷ್, ಕನ್ನಡ ಅಥವಾ ಹಿಂದಿಯಲ್ಲಿ ನೈಜ-ಸಮಯದ ಧ್ವನಿ ಸಂಭಾಷಣೆ',
    connectBtn: 'ಲೈವ್ ಸಂಭಾಷಣೆ ಪ್ರಾರಂಭಿಸಿ',
    connecting: 'ಲೈವ್ ಧ್ವನಿ ಸಂಪರ್ಕಿಸಲಾಗುತ್ತಿದೆ...',
    liveListening: 'ಲೈವ್ — ಯಾವಾಗ ಬೇಕಾದರೂ ಸಹಜವಾಗಿ ಮಾತನಾಡಿ',
    aiSpeaking: 'PortoAssist ಲೈವ್ ಮಾತನಾಡುತ್ತಿದೆ...',
    mutedLabel: 'ಮೈಕ್ರೊಫೋನ್ ಮ್ಯೂಟ್ ಆಗಿದೆ',
    muteBtn: 'ಮೈಕ್ ಮ್ಯೂಟ್',
    unmuteBtn: 'ಮೈಕ್ ಆನ್ ಮಾಡಿ',
    endBtn: 'ಲೈವ್ ನಿಲ್ಲಿಸಿ',
    switchGuided: 'ಬುಕಿಂಗ್ ಹಂತಕ್ಕೆ ಹಿಂತಿರುಗಿ',
    placeholder: 'ಅಥವಾ ಇಲ್ಲಿ ಸಂದೇಶ ಟೈಪ್ ಮಾಡಿ...',
    send: 'ಕಳುಹಿಸಿ',
    emptyHint: 'ಲಗೇಜ್ ಸಹಾಯ, ವೀಲ್‌ಚೇರ್ ಬೆಂಬಲ, ನಿಲ್ದಾಣ ಪಿಕಪ್ ಅಥವಾ ಬುಕಿಂಗ್ ಬಗ್ಗೆ ಮುಕ್ತವಾಗಿ ಮಾತನಾಡಿ.',
  },
  hi: {
    title: 'रियल-टाइम लाइव AI बातचीत',
    subtitle: 'अंग्रेज़ी, कन्नड़ या हिंदी में तुरंत स्वाभाविक आवाज़ में बातचीत',
    connectBtn: 'लाइव बातचीत शुरू करें',
    connecting: 'लाइव वॉइस सेशन जुड़ रहा है...',
    liveListening: 'लाइव — कभी भी सहज रूप से बोलें',
    aiSpeaking: 'PortoAssist लाइव बोल रहा है...',
    mutedLabel: 'माइक्रोफ़ोन म्यूट है',
    muteBtn: 'माइक म्यूट करें',
    unmuteBtn: 'माइक चालू करें',
    endBtn: 'लाइव बंद करें',
    switchGuided: 'गाइडेड बुकिंग पर लौटें',
    placeholder: 'या लाइव AI को संदेश टाइप करें...',
    send: 'भेजें',
    emptyHint: 'लगेज सहायता, व्हीलचेयर सपोर्ट, स्टेशन पिकअप या बुकिंग के बारे में बेझिझक बोलें।',
  },
};

export const LiveVoiceConversation: React.FC<LiveVoiceConversationProps> = ({
  language: _language,
  onSwitchToGuided,
}) => {
  const copy = LIVE_LABELS.en;
  const [status, setStatus] = useState<LiveStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [muted, setMuted] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [turns, setTurns] = useState<LiveTurnItem[]>([]);
  const [textInput, setTextInput] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const mutedRef = useRef<boolean>(false);
  const disposedRef = useRef<boolean>(false);
  const langRef = useRef<Language>('en');

  mutedRef.current = muted;
  langRef.current = 'en';

  const stopAudioPlaybackQueue = useCallback(() => {
    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
      } catch {
        // ignore
      }
    }
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setAiSpeaking(false);
  }, []);

  const cleanupSession = useCallback(() => {
    stopAudioPlaybackQueue();

    if (processorRef.current) {
      try {
        processorRef.current.onaudioprocess = null;
        processorRef.current.disconnect();
      } catch {
        // ignore
      }
      processorRef.current = null;
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        try {
          track.stop();
        } catch {
          // ignore
        }
      }
      streamRef.current = null;
    }

    if (inputCtxRef.current) {
      void inputCtxRef.current.close().catch(() => {});
      inputCtxRef.current = null;
    }

    if (outputCtxRef.current) {
      void outputCtxRef.current.close().catch(() => {});
      outputCtxRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    setMicLevel(0);
    setAiSpeaking(false);
  }, [stopAudioPlaybackQueue]);

  const appendTurnChunk = useCallback((role: 'user' | 'assistant', chunk: string) => {
    if (!chunk) return;
    setTurns((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role) {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...last,
          text: `${last.text}${chunk}`.replace(/\s+/g, ' '),
        };
        return updated;
      }
      return [...prev.slice(-19), { id: `${Date.now()}-${Math.random()}`, role, text: chunk.trim() }];
    });
  }, []);

  const playAudioChunk24k = useCallback((base64Audio: string) => {
    const ctx = outputCtxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }

    const floats = base64Pcm24kToFloat32(base64Audio);
    if (floats.length === 0) return;

    const buffer = ctx.createBuffer(1, floats.length, 24000);
    buffer.getChannelData(0).set(floats);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const startAt = Math.max(ctx.currentTime, nextStartTimeRef.current);
    nextStartTimeRef.current = startAt + buffer.duration;

    activeSourcesRef.current.add(source);
    setAiSpeaking(true);

    source.onended = () => {
      activeSourcesRef.current.delete(source);
      if (activeSourcesRef.current.size === 0) {
        setAiSpeaking(false);
      }
    };

    source.start(startAt);
  }, []);

  const startLiveSession = useCallback(async () => {
    cleanupSession();
    setErrorMsg('');
    setStatus('connecting');
    setMuted(false);
    mutedRef.current = false;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      const outputCtx = new AudioCtx({ sampleRate: 24000 });
      inputCtxRef.current = inputCtx;
      outputCtxRef.current = outputCtx;

      if (inputCtx.state === 'suspended') await inputCtx.resume().catch(() => {});
      if (outputCtx.state === 'suspended') await outputCtx.resume().catch(() => {});

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (disposedRef.current) {
        for (const t of stream.getTracks()) t.stop();
        return;
      }
      streamRef.current = stream;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const token = getStoredToken();
      const params = new URLSearchParams({ lang: langRef.current });
      if (token) params.set('token', token);
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/live?${params.toString()}`);
      wsRef.current = ws;

      ws.onmessage = (evt) => {
        if (disposedRef.current) return;
        let msg: {
          type?: string;
          data?: string;
          text?: string;
          error?: string;
          reason?: string;
        };
        try {
          msg = JSON.parse(evt.data);
        } catch {
          return;
        }

        if (msg.type === 'ready') {
          setStatus('connected');
          return;
        }
        if (msg.type === 'audio' && msg.data) {
          playAudioChunk24k(msg.data);
          return;
        }
        if (msg.type === 'inputTranscript' && msg.text) {
          appendTurnChunk('user', msg.text);
          return;
        }
        if (msg.type === 'outputTranscript' && msg.text) {
          appendTurnChunk('assistant', msg.text);
          return;
        }
        if (msg.type === 'interrupted') {
          stopAudioPlaybackQueue();
          return;
        }
        if (msg.type === 'error') {
          setErrorMsg(msg.error || 'Gemini Live voice connection failed.');
          setStatus('error');
          cleanupSession();
          return;
        }
        if (msg.type === 'closed') {
          setStatus((prev) => (prev === 'error' ? 'error' : 'idle'));
          cleanupSession();
        }
      };

      ws.onerror = () => {
        if (disposedRef.current) return;
        setErrorMsg('WebSocket connection error while connecting to Gemini Live.');
        setStatus('error');
        cleanupSession();
      };

      ws.onclose = () => {
        if (disposedRef.current) return;
        setStatus((prev) => (prev === 'error' ? 'error' : 'idle'));
      };

      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      const silentGain = inputCtx.createGain();
      silentGain.gain.value = 0;

      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(inputCtx.destination);

      processor.onaudioprocess = (e) => {
        if (disposedRef.current || mutedRef.current) {
          setMicLevel(0);
          return;
        }
        const channel = e.inputBuffer.getChannelData(0);
        let sumSq = 0;
        for (let i = 0; i < channel.length; i += 1) {
          sumSq += channel[i] * channel[i];
        }
        const rms = Math.sqrt(sumSq / channel.length);
        setMicLevel(Math.min(1, rms * 10));

        const socket = wsRef.current;
        if (socket && socket.readyState === WebSocket.OPEN) {
          const base64 = downsampleTo16kPcmBase64(channel, inputCtx.sampleRate);
          socket.send(JSON.stringify({ type: 'audio', audio: base64 }));
        }
      };
    } catch (err: any) {
      setErrorMsg(
        err?.name === 'NotAllowedError'
          ? 'Microphone access was denied. Please allow microphone permission in your browser.'
          : err?.message || 'Unable to start live voice session.'
      );
      setStatus('error');
      cleanupSession();
    }
  }, [appendTurnChunk, cleanupSession, playAudioChunk24k, stopAudioPlaybackQueue]);

  useEffect(() => {
    disposedRef.current = false;
    void startLiveSession();
    return () => {
      disposedRef.current = true;
      cleanupSession();
    };
  }, [cleanupSession, startLiveSession]);

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    const text = textInput.trim();
    if (!text) return;
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    setTextInput('');
    appendTurnChunk('user', text);
    socket.send(JSON.stringify({ type: 'text', text }));
  };

  const bars = [0.45, 0.8, 1.0, 0.72, 0.5];

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Live Status & Audio Activity Card */}
      <div className="bg-[#F5F8FC] border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              status === 'connected'
                ? aiSpeaking
                  ? 'bg-[#123B67] text-white'
                  : 'bg-[#16A6A1] text-white'
                : status === 'error'
                ? 'bg-red-100 text-red-700'
                : 'bg-[#EAF4FF] text-[#123B67]'
            }`}
          >
            {aiSpeaking ? (
              <Volume2 className="w-5 h-5" />
            ) : status === 'connected' ? (
              <Radio className="w-5 h-5" />
            ) : (
              <AudioLines className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="font-display text-base sm:text-lg font-bold text-[#123B67]">
              {copy.title}
            </h3>
            <p className="text-xs sm:text-sm text-[#526174]">
              {status === 'connecting'
                ? copy.connecting
                : status === 'connected'
                ? aiSpeaking
                  ? copy.aiSpeaking
                  : muted
                  ? copy.mutedLabel
                  : copy.liveListening
                : copy.subtitle}
            </p>
          </div>
        </div>

        {/* Waveform */}
        <div className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white border border-slate-200 shrink-0 self-start sm:self-center">
          {bars.map((factor, idx) => {
            const level = aiSpeaking ? 0.65 : muted ? 0.08 : Math.max(0.12, micLevel);
            const h = Math.max(5, Math.round(6 + level * factor * 20));
            return (
              <span
                key={idx}
                style={{ height: `${h}px` }}
                className={`w-1.5 rounded-full transition-all duration-75 ${
                  aiSpeaking ? 'bg-[#123B67]' : status === 'connected' && !muted ? 'bg-[#16A6A1]' : 'bg-slate-300'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Error Display (Propagated Directly from Live API / Mic) */}
      {errorMsg && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Action Controls */}
      <div className="flex flex-wrap items-center gap-2.5">
        {status !== 'connected' && status !== 'connecting' ? (
          <button
            type="button"
            onClick={() => void startLiveSession()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#16A6A1] hover:bg-[#11827E] text-white text-sm font-bold transition-colors"
          >
            <Mic className="w-4 h-4" />
            <span>{copy.connectBtn}</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setMuted((prev) => !prev)}
              disabled={status !== 'connected'}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 ${
                muted
                  ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                  : 'bg-[#123B67] text-white hover:bg-[#0B2545]'
              }`}
            >
              {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{muted ? copy.unmuteBtn : copy.muteBtn}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                cleanupSession();
                setStatus('idle');
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors"
            >
              <PhoneOff className="w-4 h-4" />
              <span>{copy.endBtn}</span>
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => {
            cleanupSession();
            onSwitchToGuided();
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-[#123B67] text-sm font-semibold transition-colors ml-auto"
        >
          <span>{copy.switchGuided}</span>
        </button>
      </div>

      {/* Live Transcript Conversation Feed */}
      <div className="bg-[#F5F8FC] border border-slate-200 rounded-xl p-4 min-h-[200px] max-h-[280px] overflow-y-auto space-y-3">
        {turns.length === 0 ? (
          <p className="text-sm text-[#526174] text-center py-10">{copy.emptyHint}</p>
        ) : (
          turns.map((turn) => (
            <div
              key={turn.id}
              className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  turn.role === 'user'
                    ? 'bg-[#123B67] text-white'
                    : 'bg-white border border-slate-200 text-[#0B2545]'
                }`}
              >
                {turn.text}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Optional Text Message Input into Live Session */}
      <form onSubmit={handleSendText} className="flex items-center gap-2">
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          disabled={status !== 'connected'}
          placeholder={copy.placeholder}
          className="flex-1 min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm text-[#0B2545] focus:outline-none focus:ring-2 focus:ring-[#16A6A1] disabled:bg-slate-100"
        />
        <button
          type="submit"
          disabled={status !== 'connected' || !textInput.trim()}
          className="inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl bg-[#16A6A1] hover:bg-[#11827E] disabled:opacity-50 text-white text-sm font-bold transition-colors"
        >
          <Send className="w-4 h-4" />
          <span>{copy.send}</span>
        </button>
      </form>
    </div>
  );
};
