import { frequencyForMidi, type MidiNote } from '../domain/notes'
import { playbackPlanDuration, type PlaybackPlan } from '../domain/playback'

export type AudioStatus = 'idle' | 'ready' | 'playing' | 'unavailable'
export type AudioContextFactory = () => AudioContext

type SynthVoice = {
  envelope: GainNode
  midi: MidiNote
  nodes: AudioNode[]
  oscillators: OscillatorNode[]
  released: boolean
  sources: Array<OscillatorNode | AudioBufferSourceNode>
}

type OutputBus = {
  input: GainNode
  nodes: AudioNode[]
}

const MIN_GAIN = 0.0001
const PLAN_RELEASE_SECONDS = 0.42
const LIVE_RELEASE_SECONDS = 0.56
const MAX_LIVE_VOICES = 20

const HARMONICS = [
  { multiple: 1, level: 0.72, detune: 0 },
  { multiple: 2, level: 0.19, detune: 0.7 },
  { multiple: 3, level: 0.075, detune: 1.9 },
  { multiple: 4, level: 0.028, detune: 3.4 },
] as const

function createBrowserAudioContext(): AudioContext {
  if (typeof window === 'undefined' || !window.AudioContext) {
    throw new Error('Web Audio is unavailable')
  }
  return new window.AudioContext()
}

export class AudioEngine {
  private context: AudioContext | undefined
  private readonly contextFactory: AudioContextFactory
  private readonly allVoices = new Set<SynthVoice>()
  private readonly liveVoices = new Map<MidiNote, SynthVoice>()
  private readonly listeners = new Set<(status: AudioStatus) => void>()
  private completionTimer: ReturnType<typeof setTimeout> | undefined
  private hammerBuffer: AudioBuffer | undefined
  private outputBus: OutputBus | undefined
  private status: AudioStatus = 'idle'

  constructor(contextFactory: AudioContextFactory = createBrowserAudioContext) {
    this.contextFactory = contextFactory
  }

  getStatus(): AudioStatus {
    return this.status
  }

  subscribe(listener: (status: AudioStatus) => void): () => void {
    this.listeners.add(listener)
    listener(this.status)
    return () => this.listeners.delete(listener)
  }

  /** Plays a complete lesson example, replacing any previous playback. */
  async play(plan: PlaybackPlan): Promise<boolean> {
    const context = await this.ensureContext()
    if (!context) return false
    this.cancelActive(false)
    if (plan.length === 0) {
      this.setStatus('ready')
      return true
    }

    const start = context.currentTime + 0.025
    plan.forEach((planned) => {
      const noteStart = start + planned.startsAtSeconds
      const noteEnd = noteStart + planned.durationSeconds
      const voice = this.createVoice(context, planned.midi, planned.velocity, noteStart)
      this.releaseVoice(voice, noteEnd, PLAN_RELEASE_SECONDS)
    })

    this.setStatus('playing')
    this.completionTimer = setTimeout(() => {
      this.completionTimer = undefined
      if (this.allVoices.size === 0 && this.status === 'playing') this.setStatus('ready')
    }, (playbackPlanDuration(plan) + PLAN_RELEASE_SECONDS + 0.12) * 1000)
    return true
  }

  /** Starts one independently sustained voice for real-time keyboard playing. */
  async noteOn(midi: MidiNote, velocity = 0.82): Promise<boolean> {
    if (this.liveVoices.has(midi)) return true
    const context = await this.ensureContext()
    if (!context) return false

    if (this.liveVoices.size >= MAX_LIVE_VOICES) {
      const oldest = this.liveVoices.values().next().value as SynthVoice | undefined
      if (oldest) {
        this.liveVoices.delete(oldest.midi)
        this.releaseVoice(oldest, context.currentTime, 0.08)
      }
    }

    const voice = this.createVoice(context, midi, velocity, context.currentTime + 0.008)
    this.liveVoices.set(midi, voice)
    this.setStatus('playing')
    return true
  }

  /** Releases only the requested real-time voice, leaving held chord tones sounding. */
  noteOff(midi: MidiNote): void {
    const voice = this.liveVoices.get(midi)
    if (!voice || !this.context) return
    this.liveVoices.delete(midi)
    this.releaseVoice(voice, this.context.currentTime + 0.005, LIVE_RELEASE_SECONDS)
  }

  stopAll(): void {
    this.cancelActive(true)
  }

  async dispose(): Promise<void> {
    this.cancelActive(false)
    this.outputBus?.nodes.forEach((node) => node.disconnect())
    this.outputBus = undefined
    this.hammerBuffer = undefined
    const context = this.context
    this.context = undefined
    if (context && context.state !== 'closed') await context.close()
    this.listeners.clear()
  }

  private createVoice(context: AudioContext, midi: MidiNote, velocity: number, startsAt: number): SynthVoice {
    const output = this.ensureOutputBus(context)
    const frequency = frequencyForMidi(midi)
    const normalizedVelocity = Math.max(0.08, Math.min(1, velocity))
    const peak = 0.135 * Math.pow(normalizedVelocity, 1.25)
    const filter = context.createBiquadFilter()
    const envelope = context.createGain()
    const oscillators: OscillatorNode[] = []
    const harmonicGains: GainNode[] = []

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(Math.min(7200, 1900 + frequency * 7 + normalizedVelocity * 1600), startsAt)
    filter.Q.setValueAtTime(0.62, startsAt)

    envelope.gain.setValueAtTime(MIN_GAIN, startsAt)
    envelope.gain.exponentialRampToValueAtTime(peak, startsAt + 0.006)
    envelope.gain.exponentialRampToValueAtTime(Math.max(MIN_GAIN, peak * 0.52), startsAt + 0.085)
    envelope.gain.setTargetAtTime(Math.max(MIN_GAIN, peak * 0.075), startsAt + 0.085, 1.9)
    filter.connect(envelope)
    envelope.connect(output.input)

    HARMONICS.forEach((harmonic) => {
      const oscillator = context.createOscillator()
      const harmonicGain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency * harmonic.multiple, startsAt)
      oscillator.detune.setValueAtTime(harmonic.detune, startsAt)
      harmonicGain.gain.setValueAtTime(harmonic.level, startsAt)
      oscillator.connect(harmonicGain)
      harmonicGain.connect(filter)
      oscillator.start(startsAt)
      oscillators.push(oscillator)
      harmonicGains.push(harmonicGain)
    })

    const hammerSource = context.createBufferSource()
    const hammerFilter = context.createBiquadFilter()
    const hammerGain = context.createGain()
    hammerSource.buffer = this.ensureHammerBuffer(context)
    hammerFilter.type = 'highpass'
    hammerFilter.frequency.setValueAtTime(Math.min(3600, 700 + frequency * 2.5), startsAt)
    hammerGain.gain.setValueAtTime(MIN_GAIN, startsAt)
    hammerGain.gain.exponentialRampToValueAtTime(0.022 * normalizedVelocity, startsAt + 0.002)
    hammerGain.gain.exponentialRampToValueAtTime(MIN_GAIN, startsAt + 0.032)
    hammerSource.connect(hammerFilter)
    hammerFilter.connect(hammerGain)
    hammerGain.connect(output.input)
    hammerSource.start(startsAt)

    const voice: SynthVoice = {
      envelope,
      midi,
      nodes: [filter, envelope, ...harmonicGains, hammerFilter, hammerGain],
      oscillators,
      released: false,
      sources: [...oscillators, hammerSource],
    }
    oscillators[0].addEventListener('ended', () => this.cleanupVoice(voice), { once: true })
    this.allVoices.add(voice)
    return voice
  }

  private releaseVoice(voice: SynthVoice, releasesAt: number, duration: number): void {
    if (voice.released) return
    voice.released = true
    const end = releasesAt + duration
    holdAtTime(voice.envelope.gain, releasesAt)
    voice.envelope.gain.exponentialRampToValueAtTime(MIN_GAIN, end)
    voice.oscillators.forEach((oscillator) => oscillator.stop(end + 0.035))
  }

  private cleanupVoice(voice: SynthVoice): void {
    if (!this.allVoices.delete(voice)) return
    if (this.liveVoices.get(voice.midi) === voice) this.liveVoices.delete(voice.midi)
    voice.sources.forEach((source) => source.disconnect())
    voice.nodes.forEach((node) => node.disconnect())
    if (this.allVoices.size === 0 && this.status === 'playing') {
      if (this.completionTimer !== undefined) {
        clearTimeout(this.completionTimer)
        this.completionTimer = undefined
      }
      this.setStatus('ready')
    }
  }

  private ensureOutputBus(context: AudioContext): OutputBus {
    if (this.outputBus) return this.outputBus

    const input = context.createGain()
    const dry = context.createGain()
    const wet = context.createGain()
    const room = context.createConvolver()
    const compressor = context.createDynamicsCompressor()
    const now = context.currentTime

    input.gain.setValueAtTime(0.74, now)
    dry.gain.setValueAtTime(0.88, now)
    wet.gain.setValueAtTime(0.12, now)
    room.buffer = createRoomImpulse(context)
    compressor.threshold.setValueAtTime(-19, now)
    compressor.knee.setValueAtTime(12, now)
    compressor.ratio.setValueAtTime(4, now)
    compressor.attack.setValueAtTime(0.004, now)
    compressor.release.setValueAtTime(0.22, now)

    input.connect(dry)
    dry.connect(compressor)
    input.connect(room)
    room.connect(wet)
    wet.connect(compressor)
    compressor.connect(context.destination)

    this.outputBus = { input, nodes: [input, dry, wet, room, compressor] }
    return this.outputBus
  }

  private ensureHammerBuffer(context: AudioContext): AudioBuffer {
    if (this.hammerBuffer) return this.hammerBuffer
    const length = Math.max(1, Math.floor(context.sampleRate * 0.04))
    const buffer = context.createBuffer(1, length, context.sampleRate)
    const samples = buffer.getChannelData(0)
    let seed = 17
    for (let index = 0; index < length; index += 1) {
      seed = (seed * 48271) % 2147483647
      const noise = (seed / 2147483647) * 2 - 1
      samples[index] = noise * Math.pow(1 - index / length, 2.4)
    }
    this.hammerBuffer = buffer
    return buffer
  }

  private async ensureContext(): Promise<AudioContext | undefined> {
    try {
      this.context ??= this.contextFactory()
      if (this.context.state === 'suspended') await this.context.resume()
      if (this.status !== 'playing') this.setStatus('ready')
      return this.context
    } catch {
      this.setStatus('unavailable')
      return undefined
    }
  }

  private cancelActive(announce: boolean): void {
    if (this.completionTimer !== undefined) {
      clearTimeout(this.completionTimer)
      this.completionTimer = undefined
    }
    ;[...this.allVoices].forEach((voice) => {
      voice.sources.forEach((source) => {
        try {
          source.stop()
        } catch {
          // A source that already ended has nothing left to stop.
        }
      })
      this.cleanupVoice(voice)
    })
    this.liveVoices.clear()
    if (announce && this.status !== 'unavailable') this.setStatus(this.context ? 'ready' : 'idle')
  }

  private setStatus(status: AudioStatus): void {
    if (this.status === status) return
    this.status = status
    this.listeners.forEach((listener) => listener(status))
  }
}

function holdAtTime(param: AudioParam, time: number): void {
  try {
    param.cancelAndHoldAtTime(time)
  } catch {
    param.cancelScheduledValues(time)
    param.setValueAtTime(Math.max(MIN_GAIN, param.value), time)
  }
}

function createRoomImpulse(context: AudioContext): AudioBuffer {
  const length = Math.max(1, Math.floor(context.sampleRate * 0.48))
  const impulse = context.createBuffer(2, length, context.sampleRate)
  let seed = 97
  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const samples = impulse.getChannelData(channel)
    for (let index = 0; index < length; index += 1) {
      seed = (seed * 16807) % 2147483647
      const noise = (seed / 2147483647) * 2 - 1
      samples[index] = noise * Math.pow(1 - index / length, 3.2) * 0.52
    }
  }
  return impulse
}
