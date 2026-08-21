import { useCallback, useEffect, useMemo, useState } from 'react'
import * as api from '../api/client'
import { capabilities, type Capability, type EphemeralTarget, type Provider, type TestRunResults } from '../types'

const emptyGuest: EphemeralTarget = {
  baseUrl: '',
  token: '',
  modelName: '',
  interfaceType: 'openai_chat',
}

export function useLlmApiTester() {
  const [authenticated, setAuthenticated] = useState(false)
  const [providers, setProviders] = useState<Provider[]>([])
  const [guest, setGuest] = useState<EphemeralTarget>(emptyGuest)
  const [selectedModelIds, setSelectedModelIds] = useState<number[]>([])
  const [selectedCapabilities, setSelectedCapabilities] = useState<Capability[]>([...capabilities])
  const [results, setResults] = useState<TestRunResults>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const refresh = useCallback(async () => {
    try {
      const owner = await api.getSession()
      setAuthenticated(owner)
      if (owner) setProviders(await api.listProviders())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load workspace')
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const selectedModels = useMemo(() => providers.flatMap((provider) => provider.models).filter((model) => selectedModelIds.includes(model.id)), [providers, selectedModelIds])

  const toggleCapability = (capability: Capability) => {
    setSelectedCapabilities((current) => current.includes(capability) ? current.filter((item) => item !== capability) : [...current, capability])
  }

  const login = async (password: string) => {
    setError(undefined)
    await api.login(password)
    await refresh()
  }

  const logout = async () => {
    await api.logout()
    setAuthenticated(false)
    setProviders([])
    setSelectedModelIds([])
  }

  const addProviderAndModel = async (providerInput: { name: string; description: string; baseUrl: string; token: string }, modelInput: { name: string; interfaceType: string; maxConcurrency?: number }) => {
    setError(undefined)
    if (authenticated) {
      if (selectedModelIds.length === 1) {
        const selectedModelId = selectedModelIds[0]
        const existingProvider = providers.find((provider) => provider.models.some((model) => model.id === selectedModelId))
        if (!existingProvider) throw new Error('Selected model is no longer available')
        await api.updateProvider(existingProvider.id, { ...providerInput, token: providerInput.token || undefined })
        await api.updateModel(selectedModelId, modelInput)
      } else {
        const provider = await api.createProvider(providerInput)
        await api.createModel(provider.id, modelInput)
      }
      await refresh()
      return
    }
    setGuest({ baseUrl: providerInput.baseUrl, token: providerInput.token, modelName: modelInput.name, interfaceType: modelInput.interfaceType as EphemeralTarget['interfaceType'], maxConcurrency: modelInput.maxConcurrency })
  }

  const run = async () => {
    setBusy(true)
    setError(undefined)
    try {
      const targets = authenticated && selectedModelIds.length > 0 ? selectedModelIds.map((modelId) => ({ modelId })) : [guest]
      if (targets.length === 0 || ('modelId' in targets[0] ? !targets[0].modelId : !targets[0].baseUrl || !targets[0].token || !targets[0].modelName)) throw new Error('请先配置一个模型')
      setResults({})
      const finalResults = await api.runCapabilitiesStream(targets, selectedCapabilities, (modelRef, capability, result) => {
        setResults((current) => ({ ...current, [modelRef]: { ...(current[modelRef] ?? {}), [capability]: result } }))
      })
      if (Object.keys(finalResults).length > 0) setResults(finalResults)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '测试失败')
    } finally {
      setBusy(false)
    }
  }

  const deleteOwnerProvider = async (id: number) => {
    const deletingSelectedModel = providers.find((provider) => provider.id === id)?.models.some((model) => selectedModelIds.includes(model.id)) ?? false
    await api.deleteProvider(id)
    await refresh()
    if (deletingSelectedModel) setSelectedModelIds([])
  }

  const deleteOwnerModel = async (id: number) => {
    await api.deleteModel(id)
    await refresh()
    setSelectedModelIds((current) => current.filter((modelId) => modelId !== id))
  }

  const toggleModel = (id: number) => setSelectedModelIds((current) => current.includes(id) ? current.filter((modelId) => modelId !== id) : [...current, id])

  return { authenticated, providers, guest, setGuest, selectedModels, selectedModelIds, toggleModel, selectedCapabilities, toggleCapability, results, busy, error, login, logout, addProviderAndModel, deleteOwnerProvider, deleteOwnerModel, run }
}
