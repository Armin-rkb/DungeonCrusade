// Applies settings that have runtime side effects (volumes, touch layout).
import type { AppApi } from './app-api';
import { audio } from './audio';
import { settings } from './settings';

export function applySettingsSideEffects(app: AppApi) {
  audio.setVolumes(settings.sfx, settings.music);
  app.touch.applySettings();
}
