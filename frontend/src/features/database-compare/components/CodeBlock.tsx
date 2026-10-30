import { useI18n } from '../../../shared/i18n/I18nProvider'

const tokenPattern = /(--[^\n]*|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:''|[^'])*'|\$\d+|\b(?:SELECT|FROM|WHERE|UPDATE|SET|DELETE|INSERT|INTO|VALUES|RETURNING|CREATE|UNIQUE|INDEX|ON|AND|OR|IS|NULL|NOT|IN|ANY|ORDER|BY|DESC|LIMIT|CASE|WHEN|THEN|END|ALTER|TABLE|RENAME|COLUMN|TO|type|struct|func|return|true|false)\b)/g

export function CodeBlock({ name, code }: { name: string; code: string }) {
  const { t } = useI18n()
  return (
    <figure className="db-code">
      <figcaption>{name}</figcaption>
      <pre aria-label={t('db.codeLabel', { name })} tabIndex={0}><code>{code.split(tokenPattern).map((part, index) => {
        const kind = /^(--|\/\/)/.test(part) ? 'comment' : /^["']/.test(part) ? 'string' : /^\$\d+$/.test(part) ? 'parameter' : index % 2 ? 'keyword' : undefined
        return <span className={kind ? `db-token-${kind}` : undefined} key={`${index}-${part}`}>{part}</span>
      })}</code></pre>
    </figure>
  )
}
