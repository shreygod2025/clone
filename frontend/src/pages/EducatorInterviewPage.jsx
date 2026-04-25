import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Mic, MicOff, Volume2, AlertTriangle, CheckCircle2, Loader2, X, ShieldAlert, ArrowRight, Headphones, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const STAGE_LABEL = {
  stage_1: 'Personality & Communication',
  stage_2: 'Subject Knowledge',
  stage_3: 'Commitment & Reliability',
};

const STAGE_INDEX = { stage_1: 1, stage_2: 2, stage_3: 3 };

export default function EducatorInterviewPage() {
  const { applicationId } = useParams();
  const navigate = useNavigate();

  // Lifecycle state
  const [phase, setPhase] = useState('intro'); // intro | running | done
  const [starting, setStarting] = useState(false);

  // Session state
  const [sessionId, setSessionId] = useState(null);
  const [candidateName, setCandidateName] = useState('');
  const [currentStage, setCurrentStage] = useState('stage_1');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [stageProgress, setStageProgress] = useState({ answered: 0, total: 0 });
  const [chat, setChat] = useState([]); // [{role:'bot'|'me', text, score?, reasoning?}]
  const [scorecard, setScorecard] = useState(null);
  const [interviewStatus, setInterviewStatus] = useState(null);

  // Recording
  const [recording, setRecording] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const recordTimerRef = useRef(null);
  const [recordSeconds, setRecordSeconds] = useState(0);

  // Anti-cheat
  const [warnings, setWarnings] = useState(0);
  const warnedThisHide = useRef(false);

  // Auto-scroll chat
  const chatEndRef = useRef(null);
  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  // ── TTS helper using browser SpeechSynthesis ─────────────────────────────
  const speak = useCallback((text) => {
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = 'en-IN';
      utt.rate = 0.95;
      utt.pitch = 1.0;
      // Pick a friendly voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => /female|google|english|samantha/i.test(v.name) && v.lang?.startsWith('en')) || voices.find(v => v.lang?.startsWith('en'));
      if (preferred) utt.voice = preferred;
      window.speechSynthesis.speak(utt);
    } catch (e) {
      // Non-fatal — text always shown
    }
  }, []);

  // Speak a question whenever it changes
  useEffect(() => {
    if (phase === 'running' && currentQuestion?.text) {
      // Slight delay so the chat bubble appears first
      const t = setTimeout(() => speak(currentQuestion.text), 350);
      return () => clearTimeout(t);
    }
  }, [currentQuestion, phase, speak]);

  // ── Anti-cheat: detect tab/window blur ────────────────────────────────────
  useEffect(() => {
    if (phase !== 'running' || !sessionId) return;
    const reportWarning = async () => {
      try {
        const res = await axios.post(`${API}/api/educator-interview/${sessionId}/anti-cheat`, {});
        const w = res.data?.warnings || 0;
        setWarnings(w);
        if (res.data?.auto_failed) {
          toast.error('Interview auto-failed: too many tab switches');
          setPhase('done');
          setInterviewStatus('auto_failed_anti_cheat');
        } else {
          toast.warning(`Tab switch detected (${w}/3) — please stay on this screen`);
        }
      } catch {/* ignore */}
    };
    const onVis = () => {
      if (document.hidden && !warnedThisHide.current) {
        warnedThisHide.current = true;
        reportWarning();
      } else if (!document.hidden) {
        warnedThisHide.current = false;
      }
    };
    const onBlur = () => {
      if (!warnedThisHide.current) {
        warnedThisHide.current = true;
        reportWarning();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
    };
  }, [phase, sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Pre-load voices (Chrome quirk)
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  // ── Start interview ────────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!applicationId) {
      toast.error('Missing application id');
      return;
    }
    setStarting(true);
    try {
      const res = await axios.post(`${API}/api/educator-interview/start`, { application_id: applicationId });
      setSessionId(res.data.session_id);
      setCandidateName(res.data.candidate_name || '');
      setCurrentStage(res.data.stage || 'stage_1');
      const q = res.data.question;
      setCurrentQuestion(q);
      setStageProgress({ answered: q?.q_index || 0, total: q?.total_in_stage || 0 });
      setChat(prev => [...prev, { role: 'bot', text: q?.text || '' }]);
      setPhase('running');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to start interview');
    } finally {
      setStarting(false);
    }
  };

  // ── Recording ──────────────────────────────────────────────────────────────
  const startRecording = async () => {
    if (recording || submitting) return;
    try {
      window.speechSynthesis?.cancel();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch (e) {
      toast.error('Microphone permission is required for the interview');
    }
  };

  const stopRecording = () => {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr || mr.state === 'inactive') return resolve(null);
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        clearInterval(recordTimerRef.current);
        setRecordSeconds(0);
        setRecording(false);
        resolve(blob);
      };
      mr.stop();
    });
  };

  const handleStopAndSubmit = async () => {
    if (!recording || !currentQuestion) return;
    setSubmitting(true);
    try {
      const blob = await stopRecording();
      if (!blob || blob.size < 800) {
        toast.error('Audio too short — please try recording again');
        setSubmitting(false);
        return;
      }
      const fd = new FormData();
      fd.append('audio', blob, 'answer.webm');
      fd.append('question_id', currentQuestion.id);
      const res = await axios.post(
        `${API}/api/educator-interview/${sessionId}/respond`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      const { transcript, next_question, interview_complete, failure_reason, current_stage, stage_complete, stage_progress } = res.data;
      setChat(prev => [...prev, { role: 'me', text: transcript || '(no transcription)' }]);

      if (interview_complete) {
        // Fetch scorecard
        try {
          const det = await axios.get(`${API}/api/educator-interview/${sessionId}`);
          setScorecard(det.data?.scorecard || null);
          setInterviewStatus(det.data?.status || (failure_reason ? 'failed' : 'completed'));
        } catch {/* ignore */}
        if (failure_reason) toast.error(failure_reason);
        setPhase('done');
        return;
      }
      if (stage_complete) {
        toast.success('Stage cleared! Moving to the next stage');
      }
      if (current_stage) setCurrentStage(current_stage);
      if (stage_progress) setStageProgress(stage_progress);
      if (next_question) {
        setCurrentQuestion(next_question);
        setChat(prev => [...prev, { role: 'bot', text: next_question.text }]);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit answer — please try again');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#1E3A5F] to-slate-900 flex items-center justify-center px-4 py-8">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-7 sm:p-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D63031] to-orange-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1E3A5F]">AI Interview</h1>
              <p className="text-sm text-slate-500">Final step before HR review</p>
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-slate-700 leading-relaxed">
              Welcome to your live AI interview at OLL. This is a friendly conversation — we just want to learn about you, how you'd handle a class, and your subject knowledge.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2.5">
              <p className="font-bold text-amber-900 flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Please read carefully</p>
              <ul className="text-sm text-amber-900 space-y-1.5 list-disc pl-5">
                <li><strong>This will take 15–20 minutes.</strong> Please find a quiet place with no distractions.</li>
                <li><strong>Stay on this screen.</strong> Switching tabs / windows will trigger a warning. <strong>3 switches = automatic failure.</strong></li>
                <li>Allow microphone access when prompted. The bot will speak the question, you click <em>Record</em> to answer, then click <em>Stop</em> when done.</li>
                <li>Your responses are transcribed and reviewed automatically.</li>
              </ul>
            </div>
            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="font-bold text-[#D63031] text-base">Stage 1</div>
                <div className="text-slate-500 mt-0.5">Personality & Communication</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="font-bold text-[#D63031] text-base">Stage 2</div>
                <div className="text-slate-500 mt-0.5">Subject Knowledge</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="font-bold text-[#D63031] text-base">Stage 3</div>
                <div className="text-slate-500 mt-0.5">Commitment & Reliability</div>
              </div>
            </div>
            <Button
              onClick={handleStart}
              disabled={starting}
              data-testid="start-interview-btn"
              className="w-full py-6 text-base font-bold bg-[#D63031] hover:bg-[#b52828] text-white rounded-2xl shadow-lg"
            >
              {starting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Setting up…</> : <><Headphones className="w-5 h-5 mr-2" /> I'm ready — Start Interview</>}
            </Button>
            <p className="text-xs text-slate-400 text-center">By starting, you consent to your audio being recorded and transcribed for hiring purposes.</p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    const passed = interviewStatus === 'completed';
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#1E3A5F] to-slate-900 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-7 text-center">
          {passed ? (
            <>
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-[#1E3A5F] mb-2">Thank you!</h2>
              <p className="text-slate-600">You've completed the AI interview. Our team will review your responses and get back to you within 2–3 working days.</p>
            </>
          ) : interviewStatus === 'auto_failed_anti_cheat' ? (
            <>
              <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-[#1E3A5F] mb-2">Interview ended</h2>
              <p className="text-slate-600">Your interview ended due to multiple tab/window switches. If you'd like another chance, please contact our team.</p>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-[#1E3A5F] mb-2">Thanks for your time!</h2>
              <p className="text-slate-600">We've recorded your responses. Our team will reach out with next steps shortly.</p>
            </>
          )}
          <Link to="/" className="inline-block mt-6 text-sm text-[#D63031] font-semibold hover:underline" data-testid="back-home-link">← Back to home</Link>
        </div>
      </div>
    );
  }

  // phase === 'running'
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D63031] to-orange-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1E3A5F]">OLL AI Interview</p>
            <p className="text-xs text-slate-500">Stage {STAGE_INDEX[currentStage]}/3 · {STAGE_LABEL[currentStage]} · Q{(stageProgress.answered || 0) + 1} of {stageProgress.total || '–'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {warnings > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold flex items-center gap-1.5" data-testid="anti-cheat-warning">
              <AlertTriangle className="w-3.5 h-3.5" /> {warnings}/3
            </span>
          )}
          <button
            onClick={() => speak(currentQuestion?.text || '')}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
            title="Replay question"
            data-testid="replay-question-btn"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4 pb-32">
          {chat.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm ${
                msg.role === 'me' ? 'bg-[#1E3A5F] text-white rounded-br-sm' : 'bg-white text-slate-800 rounded-bl-sm border border-slate-100'
              }`} data-testid={`chat-msg-${i}`}>
                <div className="text-[11px] font-semibold uppercase tracking-wide mb-1 opacity-70">
                  {msg.role === 'me' ? 'You' : 'Interviewer Bot'}
                </div>
                <p className="text-sm leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Recording controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {recording ? (
            <div className="flex items-center justify-between bg-red-50 rounded-2xl p-3 border border-red-100">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                    <Mic className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-40"></div>
                </div>
                <div>
                  <p className="text-sm font-bold text-red-700">Recording…</p>
                  <p className="text-xs text-red-600 font-mono">{Math.floor(recordSeconds / 60)}:{String(recordSeconds % 60).padStart(2, '0')}</p>
                </div>
              </div>
              <Button
                onClick={handleStopAndSubmit}
                disabled={submitting}
                className="bg-red-500 hover:bg-red-600 text-white font-bold px-6"
                data-testid="stop-record-btn"
              >
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : <><MicOff className="w-4 h-4 mr-2" /> Stop & Submit</>}
              </Button>
            </div>
          ) : submitting ? (
            <div className="flex items-center justify-center bg-slate-50 rounded-2xl p-4">
              <Loader2 className="w-5 h-5 animate-spin mr-2 text-slate-500" />
              <p className="text-sm text-slate-600 font-semibold">Transcribing your answer…</p>
            </div>
          ) : (
            <Button
              onClick={startRecording}
              disabled={!currentQuestion}
              className="w-full py-6 text-base font-bold bg-[#D63031] hover:bg-[#b52828] text-white rounded-2xl shadow-md"
              data-testid="record-answer-btn"
            >
              <Mic className="w-5 h-5 mr-2" /> Tap to Answer
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
