import { useEffect, useRef } from 'react'
import { useI18n } from '../../../shared/i18n/I18nProvider'
import { CloseIcon } from './Icons'
import { CourseNavigator } from './CourseNavigator'

type MobileCourseDialogProps = {
  currentLessonId?: string
  isLab: boolean
  onClose: () => void
}

export function MobileCourseDialog({ currentLessonId, isLab, onClose }: MobileCourseDialogProps) {
  const { t } = useI18n()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [onClose])

  return (
    <div aria-label={t('music.courseNav')} aria-modal="true" className="mobile-course-dialog" role="dialog">
      <button aria-label={t('music.closeCourseNav')} className="mobile-course-backdrop" onClick={onClose} type="button" />
      <div className="mobile-course-panel" ref={panelRef} tabIndex={-1}>
        <div className="mobile-course-panel-heading">
          <h2>{t('music.courseNav')}</h2>
          <button aria-label={t('music.closeCourseNav')} onClick={onClose} type="button"><CloseIcon /></button>
        </div>
        <CourseNavigator currentLessonId={currentLessonId} isLab={isLab} onNavigate={onClose} showIdentity={false} />
      </div>
    </div>
  )
}
