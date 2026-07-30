/**
 * Celebrate a task completion.
 * - Fires a canvas-confetti burst from the click point (or centre)
 * - Plays a two-note synthetic "ding" via Web Audio API (no asset file needed)
 *
 * Both effects respect the user's `prefers-reduced-motion` setting and the
 * app-level "sounds" mute toggle stored in localStorage under `oll_sounds`.
 */
import confetti from 'canvas-confetti';

const reduceMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

const soundsEnabled = () => {
  try {
    const v = window.localStorage.getItem('oll_sounds');
    return v !== 'off';
  } catch {
    return true;
  }
};

// Small "ding" synthesised with two overlapping sine tones.
export const playCompleteSound = () => {
  if (!soundsEnabled() || reduceMotion()) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;

    const play = (freq, delay, dur = 0.35) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.28, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + dur + 0.02);
    };
    // C6 → E6 (bright ascending "ding")
    play(1046.5, 0);
    play(1318.5, 0.08);
    // Auto-close ctx to free resources
    setTimeout(() => ctx.close?.(), 800);
  } catch {
    /* silent */
  }
};

// Fires confetti from a click event (or centre of screen if no event).
export const celebrateTaskComplete = (e) => {
  playCompleteSound();
  if (reduceMotion()) return;

  const rect = e?.currentTarget?.getBoundingClientRect?.();
  const originX = rect
    ? (rect.left + rect.width / 2) / window.innerWidth
    : 0.5;
  const originY = rect
    ? (rect.top + rect.height / 2) / window.innerHeight
    : 0.5;

  // Colour palette pulled from OLL brand
  const colors = ['#D63031', '#7B2C5C', '#1E3A5F', '#10B981', '#F59E0B'];

  confetti({
    particleCount: 90,
    spread: 70,
    startVelocity: 45,
    origin: { x: originX, y: originY },
    colors,
    scalar: 0.9,
    zIndex: 9999,
  });
  // Second, wider follow-up burst
  setTimeout(() => {
    confetti({
      particleCount: 55,
      spread: 120,
      startVelocity: 35,
      origin: { x: originX, y: originY },
      colors,
      scalar: 0.7,
      zIndex: 9999,
    });
  }, 180);
};

// Toggle sounds site-wide. Returns the new state (true = on).
export const toggleSounds = () => {
  try {
    const cur = window.localStorage.getItem('oll_sounds');
    const next = cur === 'off' ? 'on' : 'off';
    window.localStorage.setItem('oll_sounds', next);
    return next === 'on';
  } catch {
    return true;
  }
};

export const areSoundsOn = () => soundsEnabled();
