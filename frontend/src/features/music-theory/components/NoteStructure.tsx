import { useI18n } from '../../../shared/i18n/I18nProvider'
import type { ActiveNote } from '../hooks/useMusicTheoryWorkbench'

export function NoteStructure({ notes }: { notes: ReadonlyArray<ActiveNote> }) {
  const { t } = useI18n()

  return (
    <section aria-label={t('music.structure.selectedNotes')} className="note-structure">
      <h2>{t('music.structure.selectedNotes')}</h2>
      <div className="note-structure-row">
        {notes.length > 0 ? notes.map((note, index) => (
          <div className={`note-structure-item role-${note.role}`} key={`${note.midi}-${index}`}>
            <span className="note-marker">{note.marker ?? '·'}</span>
            <strong>{note.label}</strong>
            <span>{t(`music.role.${note.role}`)}</span>
          </div>
        )) : <p className="py-6 text-sm text-ink/50">—</p>}
      </div>
    </section>
  )
}
