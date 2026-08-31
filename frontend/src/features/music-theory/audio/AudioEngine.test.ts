import { describe, expect, it } from 'vitest'
import { singleNotePlan } from '../domain/playback'
import { AudioEngine } from './AudioEngine'

class MockAudioParam {
  value = 0

  cancelAndHoldAtTime(): void {}
  cancelScheduledValues(): void {}
  exponentialRampToValueAtTime(value: number): void { this.value = value }
  setTargetAtTime(value: number): void { this.value = value }
  setValueAtTime(value: number): void { this.value = value }
}

class MockNode {
  connect(): void {}
  disconnect(): void {}
}

class MockOscillator extends MockNode {
  readonly detune = new MockAudioParam()
  readonly frequency = new MockAudioParam()
  readonly stoppedAt: Array<number | undefined> = []
  type: OscillatorType = 'sine'

  addEventListener(): void {}
  start(): void {}
  stop(at?: number): void { this.stoppedAt.push(at) }
}

class MockBufferSource extends MockNode {
  buffer: AudioBuffer | null = null
  readonly stoppedAt: Array<number | undefined> = []

  start(): void {}
  stop(at?: number): void { this.stoppedAt.push(at) }
}

class MockBuffer {
  readonly channels: Float32Array[]

  constructor(readonly numberOfChannels: number, length: number) {
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length))
  }

  getChannelData(channel: number): Float32Array {
    return this.channels[channel]
  }
}

class MockAudioContext {
  currentTime = 1
  readonly destination = new MockNode() as unknown as AudioDestinationNode
  readonly oscillators: MockOscillator[] = []
  readonly bufferSources: MockBufferSource[] = []
  readonly sampleRate = 8000
  state: AudioContextState = 'running'

  async close(): Promise<void> { this.state = 'closed' }
  async resume(): Promise<void> { this.state = 'running' }

  createBiquadFilter(): BiquadFilterNode {
    return Object.assign(new MockNode(), {
      frequency: new MockAudioParam(),
      Q: new MockAudioParam(),
      type: 'lowpass',
    }) as unknown as BiquadFilterNode
  }

  createBuffer(channels: number, length: number): AudioBuffer {
    return new MockBuffer(channels, length) as unknown as AudioBuffer
  }

  createBufferSource(): AudioBufferSourceNode {
    const source = new MockBufferSource()
    this.bufferSources.push(source)
    return source as unknown as AudioBufferSourceNode
  }

  createConvolver(): ConvolverNode {
    return Object.assign(new MockNode(), { buffer: null, normalize: true }) as unknown as ConvolverNode
  }

  createDynamicsCompressor(): DynamicsCompressorNode {
    return Object.assign(new MockNode(), {
      attack: new MockAudioParam(),
      knee: new MockAudioParam(),
      ratio: new MockAudioParam(),
      release: new MockAudioParam(),
      threshold: new MockAudioParam(),
    }) as unknown as DynamicsCompressorNode
  }

  createGain(): GainNode {
    return Object.assign(new MockNode(), { gain: new MockAudioParam() }) as unknown as GainNode
  }

  createOscillator(): OscillatorNode {
    const oscillator = new MockOscillator()
    this.oscillators.push(oscillator)
    return oscillator as unknown as OscillatorNode
  }
}

function createEngine() {
  const context = new MockAudioContext()
  const engine = new AudioEngine(() => context as unknown as AudioContext)
  return { context, engine }
}

describe('AudioEngine', () => {
  it('keeps visual learning available when context creation fails', async () => {
    const engine = new AudioEngine(() => {
      throw new Error('unavailable')
    })
    const statuses: Array<string> = []
    engine.subscribe((status) => statuses.push(status))

    await expect(engine.play(singleNotePlan(60))).resolves.toBe(false)
    expect(engine.getStatus()).toBe('unavailable')
    expect(statuses).toEqual(['idle', 'unavailable'])
  })

  it('keeps independently held notes sounding as a polyphonic chord', async () => {
    const { context, engine } = createEngine()

    await engine.noteOn(60)
    await engine.noteOn(64)
    await engine.noteOn(67)

    expect(context.oscillators).toHaveLength(12)
    expect(context.oscillators.every((oscillator) => oscillator.stoppedAt.length === 0)).toBe(true)
    expect(engine.getStatus()).toBe('playing')

    engine.noteOff(64)
    expect(context.oscillators.slice(0, 4).every((oscillator) => oscillator.stoppedAt.length === 0)).toBe(true)
    expect(context.oscillators.slice(4, 8).every((oscillator) => oscillator.stoppedAt.length === 1)).toBe(true)
    expect(context.oscillators.slice(8, 12).every((oscillator) => oscillator.stoppedAt.length === 0)).toBe(true)
  })

  it('ignores repeated note-on events until that note is released', async () => {
    const { context, engine } = createEngine()

    await engine.noteOn(60)
    await engine.noteOn(60)

    expect(context.oscillators).toHaveLength(4)
  })

  it('stops live voices when a lesson example takes over', async () => {
    const { context, engine } = createEngine()

    await engine.noteOn(60)
    await engine.play(singleNotePlan(64))

    expect(context.oscillators.slice(0, 4).every((oscillator) => oscillator.stoppedAt.length > 0)).toBe(true)
    expect(context.oscillators).toHaveLength(8)
  })

  it('stops every live voice through the shared safety stop', async () => {
    const { context, engine } = createEngine()

    await engine.noteOn(60)
    await engine.noteOn(64)
    engine.stopAll()

    expect(context.oscillators.every((oscillator) => oscillator.stoppedAt.length > 0)).toBe(true)
    expect(engine.getStatus()).toBe('ready')
  })
})
