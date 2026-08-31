import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toDisplayError, type DisplayError } from '../../../shared/api/errors'
import { translateDisplayError } from '../../../shared/i18n/errors'
import { useI18n } from '../../../shared/i18n/I18nProvider'
import type { TranslationKey } from '../../../shared/i18n/resources'
import { LanguageSwitcher } from '../../../shared/ui/LanguageSwitcher'
import { useLlmApiTester } from '../hooks/useLlmApiTester'
import { capabilities, type Capability, type CapabilityStatus, type InterfaceType } from '../types'

const capabilityCopyKeys: Record<Capability, { name: TranslationKey; note: TranslationKey }> = {
  tool_use: { name: 'llm.capability.toolUse.name', note: 'llm.capability.toolUse.note' },
  reasoning: { name: 'llm.capability.reasoning.name', note: 'llm.capability.reasoning.note' },
  stream: { name: 'llm.capability.stream.name', note: 'llm.capability.stream.note' },
  tool_choice: { name: 'llm.capability.toolChoice.name', note: 'llm.capability.toolChoice.note' },
  structured_output: { name: 'llm.capability.structuredOutput.name', note: 'llm.capability.structuredOutput.note' },
}

const statusKeys: Record<CapabilityStatus, TranslationKey> = {
  never_run: 'llm.status.never_run',
  passed: 'llm.status.passed',
  failed: 'llm.status.failed',
  unsupported: 'llm.status.unsupported',
  not_run: 'llm.status.not_run',
}

const interfaceLabels: Record<InterfaceType, string> = {
  openai_chat: 'OpenAI Chat Completions',
  openai_responses: 'OpenAI Responses',
  anthropic_messages: 'Anthropic Messages',
}

type FormNotice =
  | { kind: 'message'; key: TranslationKey }
  | { kind: 'error'; error: DisplayError }

function DeleteIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 20 20">
      <path d="M4.5 5.5h11m-8-2h5m-6.5 2 .6 10h6.8l.6-10M8 8.5v4m4-4v4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  )
}

export function LlmApiTesterPage() {
  const { locale, t } = useI18n()
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
  const [formNotice, setFormNotice] = useState<FormNotice>()

  useEffect(() => {
    document.title = t('llm.documentTitle')
  }, [locale, t])

  const submitConfiguration = async (event: FormEvent) => {
    event.preventDefault()
    setFormBusy(true)
    setFormNotice(undefined)
    try {
      await tester.addProviderAndModel(
        { name: providerName || t('llm.form.temporaryProvider'), description: providerDescription, baseUrl, token },
        { name: modelName, interfaceType, maxConcurrency: maxConcurrency ? Number(maxConcurrency) : undefined },
      )
      setFormNotice({ kind: 'message', key: tester.authenticated ? 'llm.form.saved' : 'llm.form.temporaryReady' })
      if (!tester.authenticated) setToken('')
    } catch (cause) {
      setFormNotice({ kind: 'error', error: toDisplayError(cause, 'configuration_failed') })
    } finally {
      setFormBusy(false)
    }
  }

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault()
    setFormNotice(undefined)
    try {
      await tester.login(password)
      setPassword('')
      setLoginOpen(false)
    } catch (cause) {
      setFormNotice({ kind: 'error', error: toDisplayError(cause, 'login_failed') })
    }
  }

  const activeTarget = tester.selectedModels.length > 0
    ? tester.selectedModels.map((model) => model.name).join(' + ')
    : tester.guest.modelName
      ? t('llm.capabilities.temporaryTarget', { name: tester.guest.modelName })
      : t('llm.capabilities.noTarget')

  const noticeCopy = formNotice?.kind === 'message'
    ? t(formNotice.key)
    : formNotice?.kind === 'error'
      ? translateDisplayError(formNotice.error, t)
      : undefined

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 sm:px-10 lg:px-14">
        <header className="flex flex-col gap-6 border-b border-ink/15 pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-moss">{t('llm.experiment')}</p>
            <h1 className="font-display text-4xl leading-tight sm:text-6xl">{t('llm.title')}</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-ink/65 sm:text-base">{t('llm.intro')}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
            <Link className="rounded-full border border-ink/20 px-4 py-2 text-sm transition hover:border-ink/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal" to="/">
              {t('common.home')}
            </Link>
            <LanguageSwitcher />
            <span className="rounded-full bg-moss/10 px-3 py-1.5 text-xs text-moss">
              {t(tester.authenticated ? 'llm.workspace.owner' : 'llm.workspace.guest')}
            </span>
            {tester.authenticated ? (
              <button className="rounded-full border border-ink/20 px-4 py-2 text-sm transition hover:border-ink/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal" onClick={() => void tester.logout()} type="button">
                {t('llm.auth.logout')}
              </button>
            ) : (
              <button className="rounded-full border border-ink/20 px-4 py-2 text-sm transition hover:border-ink/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal" onClick={() => setLoginOpen((open) => !open)} type="button">
                {t('llm.auth.login')}
              </button>
            )}
          </div>
        </header>

        {loginOpen && !tester.authenticated && (
          <form className="mt-5 flex flex-col gap-3 rounded-2xl border border-ink/15 bg-white/40 p-4 sm:flex-row sm:items-end" onSubmit={submitLogin}>
            <label className="flex-1 text-sm">
              <span className="mb-2 block font-medium">{t('llm.auth.password')}</span>
              <input autoFocus className="w-full rounded-xl border border-ink/15 bg-white/60 px-4 py-3 outline-none focus:border-signal focus-visible:ring-2 focus-visible:ring-signal/25" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
            </label>
            <button className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-signal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal" type="submit">
              {t('llm.auth.unlock')}
            </button>
          </form>
        )}

        <section className="grid flex-1 gap-6 py-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
          <form className="min-w-0 rounded-2xl border border-ink/15 bg-paper/70 p-6 sm:p-8" onSubmit={submitConfiguration}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-signal">{t(tester.authenticated ? 'llm.configuration.contextOwner' : 'llm.configuration.contextGuest')}</p>
                <h2 className="mt-2 font-display text-3xl">{t('llm.configuration.title')}</h2>
              </div>
              <span className="rounded-full bg-moss/10 px-3 py-1 text-xs text-moss">{t(tester.authenticated ? 'llm.configuration.persisted' : 'llm.configuration.inMemory')}</span>
            </div>

            {tester.authenticated && tester.providers.length > 0 && (
              <div className="mt-6 space-y-2 rounded-xl bg-white/40 p-3">
                <p className="flex flex-wrap items-center justify-between gap-2 px-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">
                  <span>{t('llm.configuration.savedModels')}</span>
                  <span>{tester.selectedModelIds.length ? t('llm.configuration.selectedCount', { count: tester.selectedModelIds.length }) : t('llm.configuration.selectModels')}</span>
                </p>
                {tester.providers.flatMap((provider) => provider.models.map((model) => (
                  <div className="flex items-center gap-2" key={model.id}>
                    <button
                      className={`flex min-w-0 flex-1 items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal ${tester.selectedModelIds.includes(model.id) ? 'bg-ink text-paper' : 'hover:bg-ink/5'}`}
                      onClick={() => {
                        tester.toggleModel(model.id)
                        setProviderName(provider.name)
                        setProviderDescription(provider.description)
                        setBaseUrl(provider.baseUrl)
                        setModelName(model.name)
                        setInterfaceType(model.interfaceType)
                        setMaxConcurrency(model.maxConcurrency?.toString() ?? '')
                        setToken('')
                      }}
                      type="button"
                    >
                      <span className="truncate">{provider.name} / {model.name}</span>
                      <span className="ml-3 shrink-0 text-xs opacity-60">{interfaceLabels[model.interfaceType]}</span>
                    </button>
                    <button aria-label={t('llm.configuration.deleteModel', { name: model.name })} className="rounded-full p-2 text-ink/35 hover:bg-signal/10 hover:text-signal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal" onClick={() => void tester.deleteOwnerModel(model.id)} type="button">
                      <DeleteIcon />
                    </button>
                  </div>
                )))}
                {tester.providers.map((provider) => (
                  <button className="mt-1 px-3 text-xs text-ink/45 underline-offset-4 hover:text-signal hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal" key={`delete-${provider.id}`} onClick={() => void tester.deleteOwnerProvider(provider.id)} type="button">
                    {t('llm.configuration.deleteProvider', { name: provider.name })}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-2 block font-medium">{t('llm.form.providerName')}</span>
                  <input className="w-full rounded-xl border border-ink/15 bg-white/50 px-4 py-3 outline-none placeholder:text-ink/45 focus:border-signal focus-visible:ring-2 focus-visible:ring-signal/25" onChange={(event) => setProviderName(event.target.value)} placeholder={t('llm.form.providerNamePlaceholder')} value={providerName} />
                </label>
                <label className="block text-sm">
                  <span className="mb-2 block font-medium">{t('llm.form.description')}</span>
                  <input className="w-full rounded-xl border border-ink/15 bg-white/50 px-4 py-3 outline-none placeholder:text-ink/45 focus:border-signal focus-visible:ring-2 focus-visible:ring-signal/25" onChange={(event) => setProviderDescription(event.target.value)} placeholder={t('llm.form.descriptionPlaceholder')} value={providerDescription} />
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-2 block font-medium">{t('llm.form.baseUrl')}</span>
                <input className="w-full rounded-xl border border-ink/15 bg-white/50 px-4 py-3 outline-none placeholder:text-ink/45 focus:border-signal focus-visible:ring-2 focus-visible:ring-signal/25" onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.example.com/v1" required value={baseUrl} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-2 block font-medium">{t('llm.form.modelName')}</span>
                  <input className="w-full rounded-xl border border-ink/15 bg-white/50 px-4 py-3 outline-none placeholder:text-ink/45 focus:border-signal focus-visible:ring-2 focus-visible:ring-signal/25" onChange={(event) => setModelName(event.target.value)} placeholder="model-id" required value={modelName} />
                </label>
                <label className="block text-sm">
                  <span className="mb-2 block font-medium">{t('llm.form.interface')}</span>
                  <select className="w-full rounded-xl border border-ink/15 bg-white/50 px-4 py-3 outline-none focus:border-signal focus-visible:ring-2 focus-visible:ring-signal/25" onChange={(event) => setInterfaceType(event.target.value as InterfaceType)} value={interfaceType}>
                    {Object.entries(interfaceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-2 block font-medium">{t('llm.form.token')}</span>
                  <input className="w-full rounded-xl border border-ink/15 bg-white/50 px-4 py-3 outline-none placeholder:text-ink/45 focus:border-signal focus-visible:ring-2 focus-visible:ring-signal/25" onChange={(event) => setToken(event.target.value)} placeholder={t(tester.authenticated ? 'llm.form.tokenOwnerPlaceholder' : 'llm.form.tokenGuestPlaceholder')} required={!tester.authenticated} type="password" value={token} />
                </label>
                <label className="block text-sm">
                  <span className="mb-2 block font-medium">{t('llm.form.maxConcurrency')}</span>
                  <input className="w-full rounded-xl border border-ink/15 bg-white/50 px-4 py-3 outline-none placeholder:text-ink/45 focus:border-signal focus-visible:ring-2 focus-visible:ring-signal/25" min="1" onChange={(event) => setMaxConcurrency(event.target.value)} placeholder={t('llm.form.maxConcurrencyPlaceholder')} type="number" value={maxConcurrency} />
                </label>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-signal disabled:cursor-wait disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal" disabled={formBusy} type="submit">
                {formBusy ? t('llm.form.saving') : tester.authenticated ? tester.selectedModelIds.length === 1 ? t('llm.form.saveChanges') : t('llm.form.saveProviderModel') : t('llm.form.useTemporaryModel')}
              </button>
              {noticeCopy && <span aria-live="polite" className={`text-xs ${formNotice?.kind === 'error' ? 'text-signal' : 'text-ink/55'}`}>{noticeCopy}</span>}
            </div>
          </form>

          <aside className="min-w-0 rounded-2xl bg-ink p-6 text-paper sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-paper/55">{t('llm.capabilities.label')}</p>
            <h2 className="mt-2 font-display text-3xl">{t('llm.capabilities.title')}</h2>
            <div className="mt-8 divide-y divide-paper/15">
              {capabilities.map((capability) => (
                <label className="flex cursor-pointer items-center justify-between gap-4 py-4" key={capability}>
                  <span>
                    <span className="block text-sm font-medium">{t(capabilityCopyKeys[capability].name)}</span>
                    <span className="mt-1 block text-xs text-paper/55">{t(capabilityCopyKeys[capability].note)}</span>
                  </span>
                  <input checked={tester.selectedCapabilities.includes(capability)} className="h-4 w-4 shrink-0 accent-signal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal" onChange={() => tester.toggleCapability(capability)} type="checkbox" />
                </label>
              ))}
            </div>
            <button className="mt-8 w-full rounded-full bg-signal px-5 py-3 text-sm font-medium text-white transition hover:bg-signal/85 disabled:cursor-wait disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper" disabled={tester.busy || tester.selectedCapabilities.length === 0} onClick={() => void tester.run()} type="button">
              {t(tester.busy ? 'llm.capabilities.running' : 'llm.capabilities.run')}
            </button>
            <p className="mt-4 text-xs leading-5 text-paper/55">{t('llm.capabilities.currentTarget', { target: activeTarget })}</p>
            <p className="mt-2 text-xs leading-5 text-paper/55">{t('llm.capabilities.persistenceNote')}</p>
          </aside>
        </section>

        {(tester.error || Object.keys(tester.results).length > 0) && (
          <section className="mb-8 rounded-2xl border border-ink/15 bg-white/30 p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss">{t('llm.results.latest')}</p>
                <h2 className="mt-2 font-display text-3xl">{t('llm.results.title')}</h2>
              </div>
              {tester.error && <p aria-live="polite" className="text-sm text-signal">{translateDisplayError(tester.error, t)}</p>}
            </div>
            {Object.entries(tester.results).map(([modelRef, modelResults]) => (
              <div className="mt-6" key={modelRef}>
                <p className="text-sm font-medium">{t('llm.results.model', { model: modelRef })}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {capabilities.map((capability) => {
                    const result = modelResults[capability]
                    const status = result?.status ?? 'not_run'
                    return (
                      <div className="min-w-0 rounded-xl border border-ink/10 bg-paper/70 p-4" key={capability}>
                        <p className="text-xs text-ink/55">{t(capabilityCopyKeys[capability].name)}</p>
                        <p className={`mt-2 text-sm font-semibold ${status === 'passed' ? 'text-moss' : status === 'unsupported' ? 'text-ink/45' : 'text-signal'}`}>{t(statusKeys[status])}</p>
                        <p className="mt-2 text-xs text-ink/45">{result?.ttftMs !== undefined ? `TTFT ${result.ttftMs} ms` : result?.durationMs !== undefined ? t('llm.metrics.total', { duration: result.durationMs }) : t('llm.metrics.unavailable')}</p>
                        {result?.outputTokensPerSecond !== undefined && <p className="mt-1 text-xs text-ink/45">{t('llm.metrics.outputRate', { rate: result.outputTokensPerSecond.toFixed(1) })}</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </section>
        )}

        <footer className="flex flex-col gap-2 border-t border-ink/15 pt-5 text-xs text-ink/45 sm:flex-row sm:items-center sm:justify-between">
          <span>{t('llm.footer.database')}</span>
          <span>{t('llm.footer.curiosity')}</span>
        </footer>
      </div>
    </main>
  )
}
