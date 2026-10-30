import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../../shared/i18n/I18nProvider'
import type { TranslationKey } from '../../../shared/i18n/resources'
import { LanguageSwitcher } from '../../../shared/ui/LanguageSwitcher'
import { labs } from '../components/Labs'
import './databaseCompare.css'

const sources: ReadonlyArray<{ label: TranslationKey; href: string }> = [
  { label: 'db.source.update', href: 'https://gorm.io/docs/update.html' },
  { label: 'db.source.delete', href: 'https://gorm.io/docs/delete.html' },
  { label: 'db.source.preload', href: 'https://gorm.io/docs/preload.html' },
  { label: 'db.source.generate', href: 'https://docs.sqlc.dev/en/latest/howto/generate.html' },
  { label: 'db.source.parameters', href: 'https://docs.sqlc.dev/en/latest/howto/named_parameters.html' },
  { label: 'db.source.limits', href: 'https://www.postgresql.org/docs/current/limits.html' },
]

export function DatabaseComparePage() {
  const { locale, t } = useI18n()
  const [selected, setSelected] = useState(0)
  const [resets, setResets] = useState<Record<string, number>>({})
  const buttons = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => { document.title = t('db.documentTitle') }, [locale, t])

  function moveTab(event: KeyboardEvent<HTMLButtonElement>) {
    let next: number
    if (event.key === 'ArrowRight') next = (selected + 1) % labs.length
    else if (event.key === 'ArrowLeft') next = (selected + labs.length - 1) % labs.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = labs.length - 1
    else return
    event.preventDefault()
    setSelected(next)
    buttons.current[next]?.focus()
  }

  return (
    <main className="db-page" lang={locale}>
      <header className="db-header"><Link to="/">{t('common.home')}</Link><LanguageSwitcher /></header>
      <div className="db-content">
        <section className="db-intro" aria-labelledby="db-title">
          <h1 id="db-title">{t('db.title')}</h1>
          <p className="db-subtitle">{t('db.subtitle')}</p>
          <p className="db-lede">{t('db.intro')}</p>
          <div className="db-flow" role="group" aria-label={t('db.flowLabel')}>
            <div><strong>GORM</strong><ol><li>{t('db.gormFlow')}</li><li>{t('db.gormRuntime')}</li><li>{t('db.execute')}</li></ol></div>
            <div><strong>sqlc</strong><ol><li>{t('db.sqlcFlow')}</li><li>{t('db.sqlcBuild')}</li><li>{t('db.execute')}</li></ol></div>
          </div>
        </section>

        <section className="db-playground" aria-labelledby="db-playground-title">
          <div className="db-section-header"><div><h2 id="db-playground-title">{t('db.playground')}</h2><p>{t('db.playgroundIntro')}</p></div><button className="db-reset" onClick={() => { const id = labs[selected].id; setResets((value) => ({ ...value, [id]: (value[id] ?? 0) + 1 })) }} type="button">{t('db.reset')}</button></div>
          <div className="db-tabs" role="tablist" aria-label={t('db.tabsLabel')}>
            {labs.map((item, index) => <button aria-controls={`db-panel-${item.id}`} aria-selected={selected === index} id={`db-tab-${item.id}`} key={item.id} onClick={() => setSelected(index)} onKeyDown={moveTab} ref={(node) => { buttons.current[index] = node }} role="tab" tabIndex={selected === index ? 0 : -1} type="button">{t(item.label)}</button>)}
          </div>
          {labs.map(({ id, Component }, index) => <div className="db-panel" hidden={index !== selected} id={`db-panel-${id}`} aria-labelledby={`db-tab-${id}`} role="tabpanel" tabIndex={0} key={id}>
            <Component key={`${id}-${resets[id] ?? 0}`} />
          </div>)}
          <p className="db-simulation-note">{t('db.simulationNote')}</p>
        </section>

        <section className="db-takeaway" aria-labelledby="db-takeaway-title">
          <h2 id="db-takeaway-title">{t('db.takeaway.title')}</h2><p>{t('db.takeaway.intro')}</p>
          <div className="db-table-scroll"><table><thead><tr><th scope="col">{t('db.takeaway.concern')}</th><th scope="col">GORM</th><th scope="col">sqlc</th></tr></thead><tbody>
            {(['author', 'behavior', 'change'] as const).map((topic) => <tr key={topic}><th scope="row">{t(`db.takeaway.${topic}`)}</th><td>{t(`db.takeaway.${topic}Gorm`)}</td><td>{t(`db.takeaway.${topic}Sqlc`)}</td></tr>)}
          </tbody></table></div>
          <p className="db-common"><strong>{t('db.takeaway.shared')}</strong>{t('db.takeaway.sharedText')}</p>
        </section>
        <footer className="db-sources"><h2>{t('db.sources')}</h2><ul>{sources.map((source) => <li key={source.href}><a href={source.href} rel="noopener noreferrer" target="_blank">{t(source.label)}<span aria-hidden="true"> ↗</span></a></li>)}</ul></footer>
      </div>
    </main>
  )
}
