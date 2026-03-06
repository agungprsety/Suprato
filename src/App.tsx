import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Activity, Music, Waves, Maximize2, Bot, Sparkles } from 'lucide-react';
import { noteFromPitch, continuousNoteFromPitch, centsOffFromPitch, noteStrings } from './lib/pitch';
import { initSwiftF0, detectPitchSwiftF0 } from './lib/swiftf0';
import { GoogleGenAI } from '@google/genai';

const HISTORY_SIZE = 150; // Number of points in the graph

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [pitch, setPitch] = useState<number | null>(null);
  const [note, setNote] = useState<string>('--');
  const [cents, setCents] = useState<number>(0);
  
  // Vocal Range Tracking
  const [minNote, setMinNote] = useState<number>(Infinity);
  const [maxNote, setMaxNote] = useState<number>(-Infinity);
  
  // AI Coach
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const sessionStatsRef = useRef<Map<string, number[]>>(new Map());
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const requestRef = useRef<number | null>(null);
  
  // Canvas & History
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<(number | null)[]>(Array(HISTORY_SIZE).fill(null));
  
  const [isInitializing, setIsInitializing] = useState(false);
  const isProcessingRef = useRef(false);
  
  const startRecording = async () => {
    try {
      setIsInitializing(true);
      await initSwiftF0(); // Load the ONNX model
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      
      mediaStreamSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      mediaStreamSourceRef.current.connect(analyserRef.current);
      
      sessionStatsRef.current.clear();
      setAiFeedback(null);
      setIsRecording(true);
      setIsInitializing(false);
      updatePitch();
    } catch (err) {
      console.error('Error accessing microphone or loading model:', err);
      alert('Could not start recording. Please ensure permissions are granted and network is stable.');
      setIsInitializing(false);
    }
  };
  
  const stopRecording = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (mediaStreamSourceRef.current) mediaStreamSourceRef.current.disconnect();
    if (audioContextRef.current) audioContextRef.current.close();
    
    setIsRecording(false);
    setPitch(null);
    setNote('--');
    setCents(0);
    historyRef.current = Array(HISTORY_SIZE).fill(null);
    drawGraph();
  };
  
  const updatePitch = async () => {
    if (!analyserRef.current || !audioContextRef.current || !isRecording) return;
    if (isProcessingRef.current) {
      requestRef.current = requestAnimationFrame(updatePitch);
      return;
    }
    
    isProcessingRef.current = true;
    
    const buffer = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buffer);
    
    try {
      const { pitch: pitchVal, confidence } = await detectPitchSwiftF0(buffer);
      
      // SwiftF0 confidence threshold (0.9 is recommended in the paper)
      if (confidence >= 0.9 && pitchVal > 0) {
        setPitch(pitchVal);
        const noteNum = noteFromPitch(pitchVal);
        const continuousNote = continuousNoteFromPitch(pitchVal);
        
        const noteName = noteStrings[noteNum % 12];
        const currentCents = centsOffFromPitch(pitchVal, noteNum);
        
        setNote(noteName);
        setCents(currentCents);
        
        // Update Vocal Range
        setMinNote(prev => Math.min(prev, noteNum));
        setMaxNote(prev => Math.max(prev, noteNum));
        
        // Update AI Stats
        if (!sessionStatsRef.current.has(noteName)) {
          sessionStatsRef.current.set(noteName, []);
        }
        sessionStatsRef.current.get(noteName)!.push(currentCents);
        
        // Update History
        historyRef.current.push(continuousNote);
        historyRef.current.shift();
      } else {
        // No pitch detected
        historyRef.current.push(null);
        historyRef.current.shift();
        setCents(0);
      }
    } catch (e) {
      console.error("SwiftF0 error:", e);
    }
    
    drawGraph();
    isProcessingRef.current = false;
    
    if (isRecording) {
      requestRef.current = requestAnimationFrame(updatePitch);
    }
  };
  
  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Draw Grid Lines
    ctx.strokeStyle = '#262626'; // neutral-800
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw Pitch Trajectory
    ctx.beginPath();
    ctx.strokeStyle = '#10b981'; // emerald-500
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let isDrawing = false;
    
    // Find a baseline to center the graph around the current average pitch
    const validNotes = historyRef.current.filter(n => n !== null) as number[];
    const currentCenterNote = validNotes.length > 0 
      ? validNotes[validNotes.length - 1] 
      : 60; // Default to Middle C (60)

    const noteRange = 4; // Show +/- 2 notes vertically

    historyRef.current.forEach((val, i) => {
      const x = (i / (HISTORY_SIZE - 1)) * width;
      
      if (val !== null) {
        // Map note value to Y coordinate
        // Center of canvas is currentCenterNote
        const yOffset = val - currentCenterNote;
        const y = height / 2 - (yOffset / noteRange) * (height / 2);
        
        if (!isDrawing) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          isDrawing = true;
        } else {
          ctx.lineTo(x, y);
        }
      } else {
        if (isDrawing) {
          ctx.stroke();
          isDrawing = false;
        }
      }
    });
    
    if (isDrawing) {
      ctx.stroke();
    }
  };
  
  const generateAIFeedback = async () => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const statsSummary: Record<string, { avgCents: number, samples: number }> = {};
      let totalSamples = 0;
      sessionStatsRef.current.forEach((centsArray, noteStr) => {
        const avg = centsArray.reduce((a, b) => a + b, 0) / centsArray.length;
        statsSummary[noteStr] = { avgCents: Math.round(avg), samples: centsArray.length };
        totalSamples += centsArray.length;
      });

      if (totalSamples < 50) {
        setAiFeedback("Not enough data to analyze. Try singing a bit longer!");
        setIsAnalyzing(false);
        return;
      }

      const prompt = `You are a supportive, expert vocal coach. Analyze this pitch data from a user's recent singing session.
      Data format: Note -> { avgCents: average cents off pitch, samples: number of frames detected }.
      Positive cents = sharp, negative cents = flat.
      
      Session Data:
      ${JSON.stringify(statsSummary, null, 2)}
      
      Provide a concise, 2-3 sentence critique. Be encouraging. Point out specific notes they were consistently flat or sharp on, and praise them for notes they hit accurately (close to 0 cents). Keep it professional but friendly.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setAiFeedback(response.text || "Keep practicing! You're doing great.");
    } catch (err) {
      console.error(err);
      setAiFeedback("Oops, the AI coach is currently unavailable.");
    }
    setIsAnalyzing(false);
  };

  useEffect(() => {
    drawGraph(); // Initial draw
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const getCentsColor = (c: number) => {
    const absCents = Math.abs(c);
    if (absCents < 10) return 'text-emerald-400';
    if (absCents < 25) return 'text-yellow-400';
    return 'text-rose-500';
  };

  const formatNote = (noteNum: number) => {
    if (noteNum === Infinity || noteNum === -Infinity) return '--';
    const octave = Math.floor(noteNum / 12) - 1;
    return `${noteStrings[noteNum % 12]}${octave}`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-white font-sans p-4 sm:p-8">
      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Main Tuner Panel */}
        <div className="md:col-span-2 p-8 bg-[#141414] rounded-3xl border border-neutral-800/50 shadow-2xl relative overflow-hidden flex flex-col">
          
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-sm font-semibold tracking-widest uppercase text-neutral-400 flex items-center gap-2">
              <Waves className="w-4 h-4 text-emerald-500" />
              Suprato <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] tracking-widest">SWIFTF0 ENGINE</span>
            </h1>
            <button 
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isInitializing}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                isInitializing ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' :
                isRecording 
                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.15)]' 
                  : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20'
              }`}
            >
              {isInitializing ? <Activity className="w-4 h-4 animate-spin" /> : isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isInitializing ? 'Loading Model...' : isRecording ? 'Stop Monitoring' : 'Start Monitoring'}
            </button>
          </div>

          <div className="flex-grow flex flex-col items-center justify-center mb-8">
            <div className="flex items-baseline gap-4">
              <span className={`text-8xl sm:text-9xl font-bold tracking-tighter ${pitch ? getCentsColor(cents) : 'text-neutral-800'} transition-colors duration-150`}>
                {note}
              </span>
            </div>
            <span className="text-neutral-500 font-mono mt-2 text-lg tracking-widest">
              {pitch ? `${pitch.toFixed(1)} HZ` : '--- HZ'}
            </span>
          </div>

          {/* Cents Bar */}
          <div className="w-full px-4">
            <div className="flex justify-between w-full text-xs font-mono text-neutral-600 mb-2">
              <span>-50</span>
              <span className="text-emerald-500/50">0</span>
              <span>+50</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-900 rounded-full relative overflow-hidden">
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-neutral-700 -translate-x-1/2 z-10"></div>
              {pitch && (
                <div 
                  className={`absolute top-0 bottom-0 w-2 rounded-full -translate-x-1/2 transition-all duration-75 ease-out ${
                    Math.abs(cents) < 10 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 
                    Math.abs(cents) < 25 ? 'bg-yellow-500' : 'bg-rose-500'
                  }`}
                  style={{ left: `${Math.max(0, Math.min(100, 50 + cents))}%` }}
                ></div>
              )}
            </div>
          </div>
        </div>

        {/* Side Panels */}
        <div className="flex flex-col gap-6">
          
          {/* Pitch Trajectory Graph */}
          <div className="p-6 bg-[#141414] rounded-3xl border border-neutral-800/50 shadow-xl flex flex-col h-64">
            <h2 className="text-xs font-semibold tracking-widest uppercase text-neutral-500 mb-4 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" />
              Pitch Trajectory
            </h2>
            <div className="flex-grow relative w-full rounded-xl overflow-hidden bg-[#0a0a0a] border border-neutral-800/50">
              <canvas 
                ref={canvasRef} 
                width={400} 
                height={200} 
                className="w-full h-full object-fill"
              />
              {!isRecording && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                  <span className="text-xs text-neutral-500 font-medium uppercase tracking-widest">Inactive</span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-neutral-600 mt-3 text-center uppercase tracking-wider">
              Visualizes vibrato & stability
            </p>
          </div>

          {/* Vocal Range Tracker */}
          <div className="p-6 bg-[#141414] rounded-3xl border border-neutral-800/50 shadow-xl flex flex-col flex-grow">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xs font-semibold tracking-widest uppercase text-neutral-500 flex items-center gap-2">
                <Maximize2 className="w-3.5 h-3.5" />
                Session Range
              </h2>
              <button 
                onClick={() => { setMinNote(Infinity); setMaxNote(-Infinity); }}
                className="text-[10px] uppercase tracking-wider text-neutral-600 hover:text-neutral-300 transition-colors"
              >
                Reset
              </button>
            </div>
            
            <div className="flex-grow flex flex-col justify-center gap-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-900/50 border border-neutral-800/50">
                <span className="text-xs text-neutral-500 uppercase tracking-widest">Highest</span>
                <span className="font-mono text-lg text-emerald-400">{formatNote(maxNote)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-900/50 border border-neutral-800/50">
                <span className="text-xs text-neutral-500 uppercase tracking-widest">Lowest</span>
                <span className="font-mono text-lg text-rose-400">{formatNote(minNote)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* AI Vocal Coach Panel */}
        <div className="md:col-span-3 p-6 bg-[#141414] rounded-3xl border border-neutral-800/50 shadow-xl flex flex-col mt-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs font-semibold tracking-widest uppercase text-neutral-500 flex items-center gap-2">
              <Bot className="w-4 h-4 text-violet-500" />
              AI Vocal Coach
            </h2>
            <button
              onClick={generateAIFeedback}
              disabled={isRecording || isAnalyzing}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isAnalyzing ? 'Analyzing...' : 'Analyze Session'}
            </button>
          </div>
          
          <div className="flex-grow flex items-center justify-center p-4 rounded-2xl bg-[#0a0a0a] border border-neutral-800/50 min-h-[100px]">
            {isAnalyzing ? (
              <div className="flex items-center gap-3 text-violet-400/70">
                <Activity className="w-5 h-5 animate-pulse" />
                <span className="text-sm font-medium tracking-wide">Evaluating pitch accuracy...</span>
              </div>
            ) : aiFeedback ? (
              <p className="text-sm text-neutral-300 leading-relaxed max-w-4xl text-center">
                {aiFeedback}
              </p>
            ) : (
              <p className="text-sm text-neutral-600 text-center">
                Record a session, then click Analyze to get personalized feedback on your pitch accuracy.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
