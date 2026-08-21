import { useState, type FormEvent } from 'react'
import { useLlmApiTester } from '../hooks/useLlmApiTester'
import { capabilities, type Capability, type InterfaceType } from '../types'

const capabilityCopy: Record<Capability, { name: string; note: string }> = {
  tool_use: { name: 'Tool use', note: '能否调用工具' },
  reasoning: { name: 'Reasoning', note: '能否稳定地产生推理输出' },
  stream: { name: 'Streaming', note: '能否返回流式内容' },
  tool_choice: { name: 'Tool choice', note: '能否按要求选择工具' },
  structured_output: { name: 'Structured output', note: '能否遵循 JSON schema' },
}

const interfaceLabels: Record<InterfaceType, string> = {
  openai_chat: 'OpenAI Chat Completions',
  openai_responses: 'OpenAI Responses',
  anthropic_messages: 'Anthropic Messages',
}

export function LlmApiTesterPage() {
  const tester = useLlmApiTester()
  const [providerName, setProviderName] = useState('')
  const [providerDescription, setProviderDescription] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [token, setToken] = useState('')
  const [modelName, setModelName] = useState('')
  const [interfaceType, setInterfaceType] = useState<InterfaceType>('openai_chat')
  const [maxConcurrency, setMaxConcurrency] = useState('')
  const [password, setPassword] = useState('')
  const [loginOpen, setLoginOpen] = useState(false)
  const [formBusy, setFormBusy] = useState(false)
  const [formMessage, setFormMessage] = useState<string>()

  const submitConfiguration = async (event: FormEvent) => {
    event.preventDefault()
    setFormBusy(true)
    setFormMessage(undefined)
    try {
      await tester.addProviderAndModel(
        { name: providerName || 'Temporary provider', description: providerDescription, baseUrl, token },
        { name: modelName, interfaceType, maxConcurrency: maxConcurrency ? Number(maxConcurrency) : undefined },
      )
      setFormMessage(tester.authenticated ? 'Provider 和 model 已保存。' : '临时 model 已就绪，刷新页面后会消失。')
      if (!tester.authenticated) setToken('')
    } catch (cause) {
      setFormMessage(cause instanceof Error ? cause.message : '配置失败')
    } finally {
      setFormBusy(false)
    }
  }

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await tester.login(password)
      setPassword('')
      setLoginOpen(false)
    } catch (cause) {
      setFormMessage(cause instanceof Error ? cause.message : '登录失败')
    }
  }

  const activeTargetLabel = tester.selectedModel ? `${tester.selectedModel.name} · ${interfaceLabels[tester.selectedModel.interfaceType]}` : tester.guest.modelName ? `${tester.guest.modelName} · 临时配置` : '尚未选择 model'

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 sm:px-10 lg:px-14">
        <header className="flex flex-col gap-6 border-b border-ink/15 pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-moss">Flight / experiment 01</p>
            <h1 className="font-display text-4xl leading-tight sm:text-6xl">LLM API tester</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-ink/65 sm:text-base">给模型一组明确的问题，观察它真实支持什么。访客可以临时测试；登录后才会保存你的配置和最近结果。</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-moss/10 px-3 py-1.5 text-xs text-moss">{tester.authenticated ? 'Owner workspace' : 'Guest workspace'}</span>
            {tester.authenticated ? <button className="rounded-full border border-ink/20 px-4 py-2 text-sm transition hover:border-ink/50" onClick={() => void tester.logout()} type="button">Log out</button> : <button className="rounded-full border border-ink/20 px-4 py-2 text-sm transition hover:border-ink/50" onClick={() => setLoginOpen((open) => !open)} type="button">Owner login</button>}
          </div>
        </header>

        {loginOpen && !tester.authenticated && <form className="mt-5 flex flex-col gap-3 rounded-2xl border border-ink/15 bg-white/40 p-4 sm:flex-row sm:items-end" onSubmit={submitLogin}>
          <label className="flex-1 text-sm"><span className="mb-2 block font-medium">Instance password</span><input autoFocus className="w-full rounded-xl border border-ink/15 bg-white/60 px-4 py-3 outline-none focus:border-signal" onChange={(event) => setPassword(event.target.value)} type="password" value={password} /></label>
          <button className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-signal" type="submit">Unlock owner data</button>
        </form>}

        <section className="grid flex-1 gap-6 py-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
          <form className="rounded-2xl border border-ink/15 bg-paper/70 p-6 sm:p-8" onSubmit={submitConfiguration}>
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-signal">{tester.authenticated ? 'Workspace / owner' : 'Workspace / guest'}</p><h2 className="mt-2 font-display text-3xl">Configure a model</h2></div>
              <span className="rounded-full bg-moss/10 px-3 py-1 text-xs text-moss">{tester.authenticated ? 'Persisted' : 'In memory'}</span>
            </div>
            {tester.authenticated && tester.providers.length > 0 && <div className="mt-6 space-y-2 rounded-xl bg-white/40 p-3">
              <p className="px-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">Saved models</p>
              {tester.providers.flatMap((provider) => provider.models.map((model) => <button className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${tester.selectedModelId === model.id ? 'bg-ink text-paper' : 'hover:bg-ink/5'}`} key={model.id} onClick={() => tester.setSelectedModelId(model.id)} type="button"><span>{provider.name} / {model.name}</span><span className="text-xs opacity-60">{interfaceLabels[model.interfaceType]}</span></button>))}
              {tester.providers.map((provider) => <button className="mt-1 px-3 text-xs text-ink/45 underline-offset-4 hover:text-signal hover:underline" key={`delete-${provider.id}`} onClick={() => void tester.deleteOwnerProvider(provider.id)} type="button">删除 {provider.name}</button>)}
            </div>}
            <div className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm"><span className="mb-2 block font-medium">Provider name</span><input className="w-full rounded-xl border border-ink/15 bg-white/50 px-4 py-3 outline-none placeholder:text-ink/35 focus:border-signal" onChange={(event) => setProviderName(event.target.value)} placeholder="My provider" value={providerName} /></label><label className="block text-sm"><span className="mb-2 block font-medium">Description</span><input className="w-full rounded-xl border border-ink/15 bg-white/50 px-4 py-3 outline-none placeholder:text-ink/35 focus:border-signal" onChange={(event) => setProviderDescription(event.target.value)} placeholder="Optional note" value={providerDescription} /></label></div>
              <label className="block text-sm"><span className="mb-2 block font-medium">Provider base URL</span><input className="w-full rounded-xl border border-ink/15 bg-white/50 px-4 py-3 outline-none placeholder:text-ink/35 focus:border-signal" onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.example.com/v1" required value={baseUrl} /></label>
              <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm"><span className="mb-2 block font-medium">Model name</span><input className="w-full rounded-xl border border-ink/15 bg-white/50 px-4 py-3 outline-none placeholder:text-ink/35 focus:border-signal" onChange={(event) => setModelName(event.target.value)} placeholder="model-id" required value={modelName} /></label><label className="block text-sm"><span className="mb-2 block font-medium">Interface</span><select className="w-full rounded-xl border border-ink/15 bg-white/50 px-4 py-3 outline-none focus:border-signal" onChange={(event) => setInterfaceType(event.target.value as InterfaceType)} value={interfaceType}><option value="openai_chat">OpenAI Chat Completions</option><option value="openai_responses">OpenAI Responses</option><option value="anthropic_messages">Anthropic Messages</option></select></label></div>
              <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm"><span className="mb-2 block font-medium">Token</span><input className="w-full rounded-xl border border-ink/15 bg-white/50 px-4 py-3 outline-none placeholder:text-ink/35 focus:border-signal" onChange={(event) => setToken(event.target.value)} placeholder={tester.authenticated ? 'Required for a new provider' : '仅在本次会话内使用'} required={!tester.authenticated} type="password" value={token} /></label><label className="block text-sm"><span className="mb-2 block font-medium">Max concurrency</span><input className="w-full rounded-xl border border-ink/15 bg-white/50 px-4 py-3 outline-none placeholder:text-ink/35 focus:border-signal" min="1" onChange={(event) => setMaxConcurrency(event.target.value)} placeholder="默认 4" type="number" value={maxConcurrency} /></label></div>
            </div>
            <div className="mt-6 flex items-center gap-4"><button className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-signal disabled:cursor-wait disabled:opacity-50" disabled={formBusy} type="submit">{formBusy ? 'Saving…' : tester.authenticated ? 'Save provider + model' : 'Use temporary model'}</button>{formMessage && <span className="text-xs text-ink/55">{formMessage}</span>}</div>
          </form>

          <aside className="rounded-2xl bg-ink p-6 text-paper sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-paper/45">Capability deck</p><h2 className="mt-2 font-display text-3xl">What should we ask?</h2><div className="mt-8 divide-y divide-paper/15">{capabilities.map((capability) => <label className="flex cursor-pointer items-center justify-between gap-4 py-4" key={capability}><span><span className="block text-sm font-medium">{capabilityCopy[capability].name}</span><span className="mt-1 block text-xs text-paper/45">{capabilityCopy[capability].note}</span></span><input checked={tester.selectedCapabilities.includes(capability)} className="h-4 w-4 accent-signal" onChange={() => tester.toggleCapability(capability)} type="checkbox" /></label>)}</div><button className="mt-8 w-full rounded-full bg-signal px-5 py-3 text-sm font-medium text-white transition hover:bg-signal/85 disabled:cursor-wait disabled:opacity-50" disabled={tester.busy || tester.selectedCapabilities.length === 0} onClick={() => void tester.run()} type="button">{tester.busy ? 'Running checks…' : 'Run selected checks'}</button><p className="mt-4 text-xs leading-5 text-paper/45">当前目标：{activeTargetLabel}</p><p className="mt-2 text-xs leading-5 text-paper/45">结果从后端发起请求。访客工作区不会写入数据库。</p></aside>
        </section>

        {(tester.error || Object.keys(tester.results).length > 0) && <section className="mb-8 rounded-2xl border border-ink/15 bg-white/30 p-6 sm:p-8"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss">Latest result</p><h2 className="mt-2 font-display text-3xl">Capability readout</h2></div>{tester.error && <p className="text-sm text-signal">{tester.error}</p>}</div>{Object.entries(tester.results).map(([modelRef, modelResults]) => <div className="mt-6" key={modelRef}><p className="text-sm font-medium">Model {modelRef}</p><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{capabilities.map((capability) => { const result = modelResults[capability]; return <div className="rounded-xl border border-ink/10 bg-paper/70 p-4" key={capability}><p className="text-xs text-ink/55">{capabilityCopy[capability].name}</p><p className={`mt-2 text-sm font-semibold ${result?.status === 'passed' ? 'text-moss' : result?.status === 'unsupported' ? 'text-ink/45' : 'text-signal'}`}>{result?.status ?? 'not_run'}</p><p className="mt-2 text-xs text-ink/45">{result?.ttftMs ? `TTFT ${result.ttftMs} ms` : result?.durationMs ? `${result.durationMs} ms total` : 'metrics unavailable'}</p></div> })}</div></div>)}</section>}

        <footer className="flex flex-col gap-2 border-t border-ink/15 pt-5 text-xs text-ink/45 sm:flex-row sm:items-center sm:justify-between"><span>One shared database · many independent experiments</span><span>Built for curiosity</span></footer>
      </div>
    </main>
  )
}
