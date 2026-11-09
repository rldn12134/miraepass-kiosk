"use client";

/** Web Speech API 래퍼: 한국어 음성 선택 + 큐(겹쳐 말하지 않기) + 알림음 */

type Job = { text: string; rate: number; chime: boolean };

const queue: Job[] = [];
let speaking = false;
let koVoice: SpeechSynthesisVoice | null = null;
let chimeCtx: AudioContext | null = null;

export const speechSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;

function pickVoice() {
  if (!speechSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  const ko = voices.filter((v) => v.lang?.toLowerCase().startsWith("ko"));
  // 품질 좋은 음성 우선 (Google/Yuna/Siri 등)
  koVoice = ko.find((v) => /google|yuna|siri|premium|enhanced/i.test(v.name)) ?? ko[0] ?? null;
  return koVoice;
}

if (speechSupported()) {
  pickVoice();
  window.speechSynthesis.addEventListener?.("voiceschanged", pickVoice);
}

export function hasKoreanVoice() {
  return !!(koVoice ?? pickVoice());
}

/** WebAudio로 만든 2음 알림음 (외부 파일 불필요) */
export function playChime(): Promise<void> {
  return new Promise((resolve) => {
    try {
      chimeCtx ??= new AudioContext();
      const ctx = chimeCtx;
      if (ctx.state === "suspended") void ctx.resume();
      const now = ctx.currentTime;
      [880, 1318.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const t = now + i * 0.18;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.5);
      });
      setTimeout(resolve, 650);
    } catch {
      resolve();
    }
  });
}

/** 자동재생 정책 해제: 사용자 제스처 안에서 호출 */
export function unlockAudio() {
  try {
    chimeCtx ??= new AudioContext();
    void chimeCtx.resume();
  } catch {}
  if (speechSupported()) {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  }
}

async function drain() {
  if (speaking) return;
  const job = queue.shift();
  if (!job) return;
  speaking = true;
  if (job.chime) await playChime();
  if (speechSupported() && job.text.trim()) {
    await new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(job.text);
      u.lang = "ko-KR";
      u.rate = job.rate;
      const voice = koVoice ?? pickVoice();
      if (voice) u.voice = voice;
      const done = () => resolve();
      u.onend = done;
      u.onerror = done;
      // 일부 브라우저에서 onend가 오지 않는 경우 대비
      setTimeout(done, Math.max(4000, job.text.length * 250));
      window.speechSynthesis.speak(u);
    });
  }
  speaking = false;
  void drain();
}

export function announce(text: string, opts: { rate?: number; chime?: boolean } = {}) {
  queue.push({ text, rate: opts.rate ?? 1, chime: opts.chime ?? true });
  void drain();
}
