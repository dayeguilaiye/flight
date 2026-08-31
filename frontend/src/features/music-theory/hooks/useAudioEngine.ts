import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioEngine, type AudioStatus } from '../audio/AudioEngine'
import type { MidiNote } from '../domain/notes'
import type { PlaybackPlan } from '../domain/playback'

export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | undefined>(undefined)
  const [status, setStatus] = useState<AudioStatus>('idle')
  if (!engineRef.current) engineRef.current = new AudioEngine()

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    const unsubscribe = engine.subscribe(setStatus)
    const stopWhenHidden = () => {
      if (document.visibilityState === 'hidden') engine.stopAll()
    }
    const stopWhenBlurred = () => engine.stopAll()
    document.addEventListener('visibilitychange', stopWhenHidden)
    window.addEventListener('blur', stopWhenBlurred)
    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', stopWhenHidden)
      window.removeEventListener('blur', stopWhenBlurred)
      void engine.dispose()
    }
  }, [])

  const play = useCallback((plan: PlaybackPlan) => engineRef.current?.play(plan) ?? Promise.resolve(false), [])
  const noteOn = useCallback((midi: MidiNote, velocity?: number) => engineRef.current?.noteOn(midi, velocity) ?? Promise.resolve(false), [])
  const noteOff = useCallback((midi: MidiNote) => engineRef.current?.noteOff(midi), [])
  const stop = useCallback(() => engineRef.current?.stopAll(), [])

  return { status, play, noteOn, noteOff, stop }
}
