const capabilities = [
  { name: 'Tool use', note: '工具调用' },
  { name: 'Reasoning', note: '推理输出' },
  { name: 'Streaming', note: '流式响应' },
  { name: 'Tool choice', note: '工具选择' },
  { name: 'Structured output', note: '结构化输出' },
]

export function LlmApiTesterPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 sm:px-10 lg:px-14">
        <header className="flex items-start justify-between border-b border-ink/15 pb-8">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-moss">Flight / experiment 01</p>
            <h1 className="font-display text-4xl leading-tight sm:text-6xl">LLM API tester</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-ink/65 sm:text-base">
              给模型一组明确的问题，观察它真实支持什么。
              <br className="hidden sm:block" />
              访客可以临时测试；登录后才会保存你的配置和最近结果。
            </p>
          </div>
          <button className="rounded-full border border-ink/20 px-4 py-2 text-sm transition hover:border-ink/50" type="button">
            Owner login
          </button>
        </header>

        <section className="grid flex-1 gap-6 py-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
          <div className="rounded-2xl border border-ink/15 bg-paper/70 p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-signal">Workspace / guest</p>
                <h2 className="mt-2 font-display text-3xl">Choose a model</h2>
              </div>
              <span className="rounded-full bg-moss/10 px-3 py-1 text-xs text-moss">In memory</span>
            </div>
            <div className="mt-8 space-y-4">
              <label className="block text-sm">
                <span className="mb-2 block font-medium">Provider base URL</span>
                <input className="w-full rounded-xl border border-ink/15 bg-white/50 px-4 py-3 outline-none transition placeholder:text-ink/35 focus:border-signal" placeholder="https://api.example.com" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-2 block font-medium">Model name</span>
                  <input className="w-full rounded-xl border border-ink/15 bg-white/50 px-4 py-3 outline-none transition placeholder:text-ink/35 focus:border-signal" placeholder="model-id" />
                </label>
                <label className="block text-sm">
                  <span className="mb-2 block font-medium">Interface</span>
                  <select className="w-full rounded-xl border border-ink/15 bg-white/50 px-4 py-3 outline-none focus:border-signal" defaultValue="chat">
                    <option value="chat">OpenAI Chat Completions</option>
                    <option value="responses">OpenAI Responses</option>
                    <option value="anthropic">Anthropic Messages</option>
                  </select>
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-2 block font-medium">Token</span>
                <input className="w-full rounded-xl border border-ink/15 bg-white/50 px-4 py-3 outline-none transition placeholder:text-ink/35 focus:border-signal" placeholder="仅在本次会话内使用" type="password" />
              </label>
            </div>
            <button className="mt-8 rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-signal" type="button">
              Add temporary model
            </button>
          </div>

          <aside className="rounded-2xl bg-ink p-6 text-paper sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-paper/45">Capability deck</p>
            <h2 className="mt-2 font-display text-3xl">What should we ask?</h2>
            <div className="mt-8 divide-y divide-paper/15">
              {capabilities.map((capability) => (
                <label className="flex cursor-pointer items-center justify-between gap-4 py-4" key={capability.name}>
                  <span>
                    <span className="block text-sm font-medium">{capability.name}</span>
                    <span className="mt-1 block text-xs text-paper/45">{capability.note}</span>
                  </span>
                  <input className="h-4 w-4 accent-signal" defaultChecked type="checkbox" />
                </label>
              ))}
            </div>
            <button className="mt-8 w-full rounded-full bg-signal px-5 py-3 text-sm font-medium text-white transition hover:bg-signal/85" type="button">
              Run selected checks
            </button>
            <p className="mt-4 text-xs leading-5 text-paper/45">结果会从后端发起请求。当前访客工作区不会写入数据库。</p>
          </aside>
        </section>

        <footer className="flex flex-col gap-2 border-t border-ink/15 pt-5 text-xs text-ink/45 sm:flex-row sm:items-center sm:justify-between">
          <span>One shared database · many independent experiments</span>
          <span>Built for curiosity</span>
        </footer>
      </div>
    </main>
  )
}
