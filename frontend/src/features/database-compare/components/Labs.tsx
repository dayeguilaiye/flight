import { useState } from 'react'
import { useI18n } from '../../../shared/i18n/I18nProvider'
import type { TranslationKey } from '../../../shared/i18n/resources'
import { buildOrderQuery, originalUser, preloadSizes, renameDetection, simulatePreload, simulateUpdate, staticOrderSQL, type OrderFilters, type UpdateMode } from '../domain/simulations'
import { CodeBlock } from './CodeBlock'

const stages = ['write', 'generate', 'compile', 'test', 'runtime'] as const

export function RenameLab() {
  const { t } = useI18n()
  const [renamed, setRenamed] = useState(false)
  const [covered, setCovered] = useState(false)
  const detection = renameDetection(renamed, covered)
  return (
    <div className="db-lab-grid">
      <div className="db-controls">
        <h3>{t('db.rename.title')}</h3>
        <p>{t('db.rename.description')}</p>
        <label className="db-check"><input checked={renamed} onChange={(event) => setRenamed(event.target.checked)} type="checkbox" />{t('db.rename.toggle')}</label>
        <label className="db-check"><input checked={covered} onChange={(event) => setCovered(event.target.checked)} type="checkbox" />{t('db.rename.covered')}</label>
        <CodeBlock name="schema.sql" code={renamed ? 'ALTER TABLE users\nRENAME COLUMN name TO display_name;' : 'CREATE TABLE users (\n  id bigserial PRIMARY KEY,\n  name text NOT NULL\n);'} />
        <p className="db-note">{t('db.rename.source')}</p>
      </div>
      <div className="db-results" aria-live="polite">
        {(['sqlc', 'gorm'] as const).map((tool) => {
          const found = detection[tool]
          const stopped = stages.findIndex((stage) => stage === found)
          return (
            <div className="db-track" key={tool}>
              <h4>{tool === 'gorm' ? 'GORM' : 'sqlc'}</h4>
              <ol className="db-stages">
                {stages.map((stage, index) => (
                  <li className={stage === found ? 'db-stage-error' : stopped >= 0 && index > stopped ? 'db-stage-later' : ''} key={stage}>
                    <span>{t(`db.stage.${stage}`)}</span>
                    {stage === found && <strong>{t('db.stage.error')}</strong>}
                    {tool === 'gorm' && stage === 'generate' && <small>{t('db.stage.na')}</small>}
                  </li>
                ))}
              </ol>
              <p className={found === 'ok' ? 'db-verdict' : 'db-verdict db-warning'}>{t(`db.rename.${found}`)}</p>
              <CodeBlock name={tool === 'gorm' ? 'Go' : 'query.sql'} code={tool === 'gorm' ? 'db.Create(&User{Name: "Lin"})' : '-- name: CreateUser :one\nINSERT INTO users (name) VALUES ($1)\nRETURNING id, name;'} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function UpdateLab() {
  const { t } = useI18n()
  const [name, setName] = useState('Lin')
  const [age, setAge] = useState(0)
  const [active, setActive] = useState(false)
  const [mode, setMode] = useState<UpdateMode>('struct')
  const update = simulateUpdate({ name, age, active }, mode)
  const value = mode === 'struct' ? `User{\n  Name: ${JSON.stringify(name)}, Age: ${age}, Active: ${active},\n}` : `map[string]interface{}{\n  "name": ${JSON.stringify(name)}, "age": ${age}, "active": ${active},\n}`
  return (
    <div className="db-lab-grid">
      <div className="db-controls">
        <h3>{t('db.update.title')}</h3><p>{t('db.update.description')}</p>
        <div className="db-form-row">
          <label>{t('db.update.name')}<input maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>{t('db.update.age')}<input type="number" min={0} max={150} value={age} onChange={(event) => setAge(Math.max(0, Math.min(150, Math.trunc(Number(event.target.value)) || 0)))} /></label>
        </div>
        <label className="db-check"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />{t('db.update.active')}</label>
        <label>{t('db.update.mode')}<select value={mode} onChange={(event) => setMode(event.target.value === 'map' ? 'map' : 'struct')}><option value="struct">{t('db.update.struct')}</option><option value="map">{t('db.update.map')}</option></select></label>
        <CodeBlock name="Go" code={`db.Model(&User{ID: 10}).Updates(${value})`} />
        <p className="db-note">{t('db.update.model')}</p>
      </div>
      <div className="db-results">
        <div className="db-row-result" aria-live="polite">
          <div><h4>{t('db.update.before')}</h4><code>{JSON.stringify(originalUser, null, 2)}</code></div>
          <div><h4>{t('db.update.after')}</h4><code>{JSON.stringify(update.result, null, 2)}</code></div>
        </div>
        <p className={update.skipped.length ? 'db-verdict db-warning' : 'db-verdict'} aria-live="polite">{update.skipped.length ? t('db.update.skipped', { fields: update.skipped.join(', ') }) : t('db.update.complete')}</p>
        <CodeBlock name="GORM / SQL" code={update.sql ?? t('db.update.noSQL')} />
        <p className="db-args">{t('db.args')}: <code>{JSON.stringify(update.args)}</code></p>
        <h4>{t('db.update.sqlc')}</h4>
        <CodeBlock name="query.sql" code={'-- name: UpdateUser :exec\nUPDATE users\nSET name = $2, age = $3, active = $4\nWHERE id = $1;'} />
        <p className="db-args">{t('db.args')}: <code>{JSON.stringify([10, name, age, active])}</code></p>
      </div>
    </div>
  )
}

export function DeleteLab() {
  const { t } = useI18n()
  const [soft, setSoft] = useState(true)
  const [partial, setPartial] = useState(false)
  const conflict = soft && !partial
  const indexSQL = `CREATE UNIQUE INDEX users_email_key\nON users (email)${partial ? '\nWHERE deleted_at IS NULL' : ''};`
  return (
    <div className="db-lab-grid">
      <div className="db-controls">
        <h3>{t('db.delete.title')}</h3><p>{t('db.delete.description')}</p>
        <label className="db-check"><input type="checkbox" checked={soft} onChange={(event) => { setSoft(event.target.checked); if (!event.target.checked) setPartial(false) }} />{t('db.delete.soft')}</label>
        <label className="db-check"><input type="checkbox" disabled={!soft} checked={partial} onChange={(event) => setPartial(event.target.checked)} />{t('db.delete.partial')}</label>
        <p className="db-note">{t('db.delete.assumption')}</p>
        <CodeBlock name="Go" code={'db.Delete(&User{ID: 10})\ndb.Find(&users)\ndb.Create(&User{Email: "lin@example.com"})'} />
        <CodeBlock name="schema.sql" code={indexSQL} />
      </div>
      <div className="db-results">
        <CodeBlock name="GORM / SQL" code={soft ? 'UPDATE "users" SET "deleted_at" = $1\nWHERE "id" = $2 AND "deleted_at" IS NULL;\n\nSELECT * FROM "users"\nWHERE "deleted_at" IS NULL;' : 'DELETE FROM "users" WHERE "id" = $1;\n\nSELECT * FROM "users";'} />
        <p>{t(soft ? 'db.delete.hidden' : 'db.delete.removed')}</p>
        <p className={conflict ? 'db-verdict db-warning' : 'db-verdict'} aria-live="polite">{t(conflict ? 'db.delete.conflict' : 'db.delete.available')}</p>
        <h4>{t('db.delete.sqlc')}</h4>
        <CodeBlock name="query.sql" code={soft ? '-- name: SoftDeleteUser :exec\nUPDATE users SET deleted_at = now()\nWHERE id = $1;\n\n-- name: ListUsers :many\nSELECT id, email FROM users\nWHERE deleted_at IS NULL;' : '-- name: DeleteUser :exec\nDELETE FROM users WHERE id = $1;'} />
        <p className="db-note">{t('db.delete.note')}</p>
      </div>
    </div>
  )
}

export function PreloadLab() {
  const { locale, t } = useI18n()
  const [size, setSize] = useState(1)
  const [batch, setBatch] = useState(false)
  const count = preloadSizes[size] ?? 50
  const result = simulatePreload(count, batch)
  return (
    <div className="db-lab-grid">
      <div className="db-controls">
        <h3>{t('db.preload.title')}</h3><p>{t('db.preload.description')}</p>
        <label>{t('db.preload.users')}<output className="db-big-number" htmlFor="db-user-count">{count.toLocaleString(locale)}</output><input id="db-user-count" type="range" min={0} max={preloadSizes.length - 1} step={1} value={size} aria-valuetext={count.toLocaleString(locale)} onChange={(event) => setSize(Number(event.target.value))} /></label>
        <label className="db-check"><input type="checkbox" checked={batch} onChange={(event) => setBatch(event.target.checked)} />{t('db.preload.batch')}</label>
        <CodeBlock name="Go" code={batch ? 'db.Find(&users)\nfor _, ids := range chunks(userIDs, 1000) {\n  db.Where("user_id IN ?", ids).Find(&orders)\n  // Append each batch to the final result.\n}' : 'db.Preload("Orders").Find(&users)'} />
        <p className="db-note">{t('db.preload.batchNote')}</p>
      </div>
      <div className="db-results">
        <dl className="db-metrics" aria-live="polite"><div><dt>{t('db.preload.queryCount')}</dt><dd>{result.queries}</dd></div><div><dt>{t('db.preload.parameters')}</dt><dd>{result.parameters.toLocaleString(locale)}</dd></div></dl>
        <CodeBlock name="GORM / SQL" code={result.sql} />
        <p className={result.exceedsLimit ? 'db-verdict db-warning' : 'db-verdict'} aria-live="polite">{t(result.exceedsLimit ? 'db.preload.limit' : 'db.preload.within')}</p>
        <h4>{t('db.preload.array')}</h4>
        <CodeBlock name="query.sql" code={'-- name: ListOrdersByUsers :many\nSELECT id, user_id, amount FROM orders\nWHERE user_id = ANY(sqlc.arg(user_ids)::bigint[]);'} />
        <p className="db-note">{t('db.preload.arrayNote')}</p>
      </div>
    </div>
  )
}

export function DynamicLab() {
  const { t } = useI18n()
  const [filters, setFilters] = useState<OrderFilters>({ status: '', userId: '', sort: 'created_at' })
  const query = buildOrderQuery(filters)
  return (
    <div className="db-dynamic">
      <h3>{t('db.dynamic.title')}</h3><p className="db-lab-intro">{t('db.dynamic.description')}</p>
      <div className="db-filter-row">
        <label>{t('db.dynamic.status')}<select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value === 'paid' ? 'paid' : event.target.value === 'shipped' ? 'shipped' : '' })}><option value="">{t('db.dynamic.all')}</option><option value="paid">{t('db.dynamic.paid')}</option><option value="shipped">{t('db.dynamic.shipped')}</option></select></label>
        <label>{t('db.dynamic.user')}<input value={filters.userId} inputMode="numeric" maxLength={24} placeholder={t('db.dynamic.optional')} aria-invalid={!query.valid} aria-describedby={!query.valid ? 'db-id-error' : undefined} onChange={(event) => setFilters({ ...filters, userId: event.target.value })} /></label>
        <label>{t('db.dynamic.sort')}<select value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value === 'amount' ? 'amount' : 'created_at' })}><option value="created_at">{t('db.dynamic.newest')}</option><option value="amount">{t('db.dynamic.amount')}</option></select></label>
      </div>
      {!query.valid && <p className="db-warning" id="db-id-error" role="alert">{t('db.dynamic.invalid')}</p>}
      <div className="db-dynamic-columns">
        <div><h4>{t('db.dynamic.fixed')}</h4><p>{t('db.dynamic.fixedNote')}</p><CodeBlock name="query.sql" code={staticOrderSQL} />{query.valid && <p className="db-args">{t('db.args')}: <code>{JSON.stringify(query.staticArgs)}</code></p>}</div>
        <div><h4>{t('db.dynamic.composed')}</h4><p>{t('db.dynamic.composedNote')}</p>{query.valid && <><CodeBlock name="SQL" code={query.sql} /><p className="db-args">{t('db.args')}: <code>{JSON.stringify(query.args)}</code></p></>}<p className="db-note">{t('db.dynamic.planNote')}</p></div>
      </div>
    </div>
  )
}

export const labs: ReadonlyArray<{ id: string; label: TranslationKey; Component: typeof RenameLab }> = [
  { id: 'rename', label: 'db.tab.rename', Component: RenameLab },
  { id: 'update', label: 'db.tab.update', Component: UpdateLab },
  { id: 'delete', label: 'db.tab.delete', Component: DeleteLab },
  { id: 'preload', label: 'db.tab.preload', Component: PreloadLab },
  { id: 'dynamic', label: 'db.tab.dynamic', Component: DynamicLab },
]
