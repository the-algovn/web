// iOS Safari ignores writes to HTMLMediaElement.volume, which makes a volume
// slider a dead control there. Detect by writing a probe and reading it back —
// never sniff the user agent.
export function volumeIsControllable(audio: HTMLAudioElement): boolean {
  const original = audio.volume
  const probe = original === 0.5 ? 0.25 : 0.5
  try {
    audio.volume = probe
    const took = Math.abs(audio.volume - probe) < 0.001
    audio.volume = original
    return took
  } catch {
    return false
  }
}
