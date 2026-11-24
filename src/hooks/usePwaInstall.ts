import { useEffect, useState } from 'react';
import { canPromptInstall, isIos, isStandalone, promptInstall, subscribe } from '../lib/pwa';

export type InstallMode = 'prompt' | 'ios' | 'none';

/** Hozirgi qurilmada ilovani qanday o'rnatish mumkinligi */
export function usePwaInstall() {
  const calc = (): InstallMode => (isStandalone() ? 'none' : canPromptInstall() ? 'prompt' : isIos() ? 'ios' : 'none');
  const [mode, setMode] = useState<InstallMode>(calc);
  useEffect(() => subscribe(() => setMode(calc())), []);
  return { mode, install: promptInstall };
}
