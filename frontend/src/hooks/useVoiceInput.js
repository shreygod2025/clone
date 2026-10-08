import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

/**
 * Web Speech API voice input hook used by the FAQ page and the Need-Help popup.
 *
 * The naive implementation had two bugs:
 *
 *  1. On every `onresult` event we only looked at `ev.results[ev.resultIndex..]`
 *     and rebuilt the input as `base + currentChunk`. When the SpeechRecognition
 *     engine advanced `resultIndex` past an already-finalized chunk (which
 *     Chrome does once a chunk is marked final), that older text was dropped on
 *     the next event — the user's dictation appeared to "replace itself" every
 *     time they paused for breath.
 *
 *  2. With `continuous = true` Chrome still fires `onend` after prolonged
 *     silence; a user-visible "restart" happens because `isListening` flips
 *     off and the composer snaps back to the pre-dictation base text. We
 *     keep an auto-restart cycle guarded by `userStoppedRef` so a mid-sentence
 *     silence doesn't lose context.
 *
 * The fix:
 *   - Keep a persistent `finalBuf` ref that accumulates all finalized chunks
 *     across every `onresult` + every auto-restart.
 *   - If `continuous=true` and the engine ends on its own (not from a user
 *     click), silently `.start()` it again so the mic stays "live" like the
 *     user expects.
 */
export const useVoiceInput = ({ getBaseText, setText }) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const finalBufRef = useRef('');
  const baseTextRef = useRef('');
  const userStoppedRef = useRef(true);

  const voiceSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const buildInput = () => {
    const base = (baseTextRef.current || '').trim();
    const buf = (finalBufRef.current || '').trim();
    const parts = [base, buf].filter(Boolean);
    return parts.join(' ').replace(/\s+/g, ' ').trimStart();
  };

  const start = useCallback(() => {
    if (!voiceSupported) {
      toast.error("Voice input isn't supported in this browser. Try Chrome or Safari.");
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-IN';
    rec.maxAlternatives = 1;

    // Snapshot the text that was already in the composer so new dictation is
    // APPENDED, not substituted. Reset the finalized buffer each new session
    // but keep accumulating across engine-level restarts.
    baseTextRef.current = (getBaseText() || '').trim();
    finalBufRef.current = '';
    userStoppedRef.current = false;

    rec.onstart = () => setIsListening(true);

    rec.onerror = (ev) => {
      if (ev?.error === 'not-allowed' || ev?.error === 'service-not-allowed') {
        userStoppedRef.current = true;
        setIsListening(false);
        toast.error('Mic permission denied. Enable microphone in browser settings.');
      } else if (ev?.error === 'no-speech') {
        // Keep listening — don't flip isListening off for a silent gap.
      } else if (ev?.error === 'aborted') {
        // Expected when we call stop() explicitly.
      } else {
        // Unknown error → surface a toast but don't crash.
        toast.error(`Voice input error: ${ev?.error || 'unknown'}`);
      }
    };

    rec.onresult = (ev) => {
      let interim = '';
      // Walk only the NEW results in this event (resultIndex..end) and push
      // final ones into the persistent buffer so earlier finalized sentences
      // are never lost on the next event.
      for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
        const r = ev.results[i];
        const chunk = r[0]?.transcript || '';
        if (r.isFinal) {
          finalBufRef.current = (finalBufRef.current + ' ' + chunk).replace(/\s+/g, ' ').trim();
        } else {
          interim += chunk;
        }
      }
      const combined = [buildInput(), interim.trim()].filter(Boolean).join(' ').trim();
      setText(combined);
    };

    rec.onend = () => {
      if (userStoppedRef.current) {
        setIsListening(false);
        return;
      }
      // Engine stopped on its own (silence timeout / tab blur). Keep the mic
      // "live" by restarting — the finalBuf and baseText survive so the user
      // sees no visible interruption.
      try {
        rec.start();
      } catch {
        setIsListening(false);
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      userStoppedRef.current = true;
      setIsListening(false);
      toast.error("Couldn't start the mic — try again.");
    }
  }, [voiceSupported, getBaseText, setText]);

  const stop = useCallback(() => {
    userStoppedRef.current = true;
    try {
      recognitionRef.current?.stop();
    } catch {}
    setIsListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  // Stop recognition when the host component unmounts so the mic doesn't
  // keep listening in the background.
  useEffect(
    () => () => {
      userStoppedRef.current = true;
      try {
        recognitionRef.current?.stop();
      } catch {}
    },
    [],
  );

  return { isListening, toggle, voiceSupported };
};
