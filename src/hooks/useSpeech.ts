import { useCallback, useEffect, useRef, useState } from 'react';
import type { Lang } from '../data/types';
import { SPEECH_LANG } from '../i18n/translations';

/** Web Speech API ustidan yupqa qobiq */
export function useSpeech(lang: Lang) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [speaking, setSpeaking] = useState(false);
  const [voiceMissing, setVoiceMissing] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!supported) return;
    const load = () => (voicesRef.current = speechSynthesis.getVoices());
    load();
    speechSynthesis.addEventListener('voiceschanged', load);
    return () => {
      speechSynthesis.removeEventListener('voiceschanged', load);
      speechSynthesis.cancel();
    };
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      speechSynthesis.cancel();
      const code = SPEECH_LANG[lang];
      const voice =
        voicesRef.current.find((v) => v.lang === code) ??
        voicesRef.current.find((v) => v.lang.toLowerCase().startsWith(lang));
      setVoiceMissing(!voice);

      // Uzun matnni gaplarga bo'lib o'qiymiz — ba'zi brauzerlar uzun utterance'ni uzib qo'yadi
      const chunks = text.match(/[^.!?]+[.!?]*/g) ?? [text];
      chunks.forEach((chunk, i) => {
        const u = new SpeechSynthesisUtterance(chunk.trim());
        u.lang = code;
        if (voice) u.voice = voice;
        u.rate = 0.98;
        if (i === 0) u.onstart = () => setSpeaking(true);
        if (i === chunks.length - 1) {
          u.onend = () => setSpeaking(false);
          u.onerror = () => setSpeaking(false);
        }
        speechSynthesis.speak(u);
      });
    },
    [lang, supported],
  );

  return { supported, speaking, voiceMissing, speak, stop };
}
