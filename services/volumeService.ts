let currentVolume = 1.0;
let ringtoneEnabled = true;

export function getVolume(): number {
  return currentVolume;
}

export function setVolume(v: number): void {
  currentVolume = Math.max(0, Math.min(1, v));
}

export function isRingtoneEnabled(): boolean {
  return ringtoneEnabled;
}

export function setRingtoneEnabled(v: boolean): void {
  ringtoneEnabled = v;
}
