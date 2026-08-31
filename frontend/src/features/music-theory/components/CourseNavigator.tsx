import { Link, NavLink } from 'react-router-dom'
import { useI18n } from '../../../shared/i18n/I18nProvider'
import { LanguageSwitcher } from '../../../shared/ui/LanguageSwitcher'
import { COURSE_CHAPTERS, lessonPath } from '../course/catalog'
import { HomeIcon } from './Icons'

type CourseNavigatorProps = {
  currentLessonId?: string
  isLab: boolean
  onNavigate?: () => void
  showIdentity?: boolean
}

const futureKeys = [
  'music.future.rhythm',
  'music.future.seventh',
  'music.future.accompaniment',
  'music.future.modes',
  'music.future.borrowed',
  'music.future.modulation',
] as const

export function CourseNavigator({ currentLessonId, isLab, onNavigate, showIdentity = true }: CourseNavigatorProps) {
  const { t } = useI18n()

  return (
    <div className="course-navigator">
      {showIdentity && (
        <div className="course-identity">
          <div className="course-identity-top">
            <p>{t('music.title')}</p>
            <LanguageSwitcher />
          </div>
          <Link className="course-home-link" to="/">
            <HomeIcon />
            {t('common.home')}
          </Link>
          <p className="course-identity-intro">{t('music.intro')}</p>
        </div>
      )}

      <nav aria-label={t('music.courseNav')} className="course-tree">
        {COURSE_CHAPTERS.map((chapter, chapterIndex) => (
          <section className="course-chapter" key={chapter.id}>
            <h2 className="course-chapter-title">
              <span aria-hidden="true">{chapterIndex + 1}</span>
              {t(chapter.titleKey)}
            </h2>
            <ol>
              {chapter.lessons.map((lesson, lessonIndex) => (
                <li key={lesson.id}>
                  <NavLink
                    aria-current={currentLessonId === lesson.id ? 'page' : undefined}
                    className={({ isActive }) => `course-lesson-link ${isActive || currentLessonId === lesson.id ? 'is-current' : ''}`}
                    onClick={onNavigate}
                    to={lessonPath({ chapter, lesson })}
                  >
                    <span aria-hidden="true">{chapterIndex + 1}.{lessonIndex + 1}</span>
                    <span>{t(lesson.titleKey)}</span>
                  </NavLink>
                </li>
              ))}
            </ol>
          </section>
        ))}

        <NavLink className={`course-lab-link ${isLab ? 'is-current' : ''}`} onClick={onNavigate} to="/music-theory/lab">
          {t('music.freeLab')}
        </NavLink>

        <section className="future-map">
          <h2>{t('music.future.title')}</h2>
          <p>{t('music.future.description')}</p>
          <ul>
            {futureKeys.map((key) => <li key={key}>{t(key)}</li>)}
          </ul>
        </section>
      </nav>
    </div>
  )
}
