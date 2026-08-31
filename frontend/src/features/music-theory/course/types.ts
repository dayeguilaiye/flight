import type { TranslationKey } from '../../../shared/i18n/resources'

export type LessonKind = 'keyboard' | 'interval' | 'scale' | 'triad' | 'harmony' | 'progression'

export type CourseLesson = {
  id: string
  slug: string
  kind: LessonKind
  titleKey: TranslationKey
  summaryKey: TranslationKey
  observationKey: TranslationKey
}

export type CourseChapter = {
  id: string
  slug: string
  titleKey: TranslationKey
  descriptionKey: TranslationKey
  lessons: ReadonlyArray<CourseLesson>
}

export type LessonLocation = {
  chapter: CourseChapter
  lesson: CourseLesson
  chapterIndex: number
  lessonIndex: number
}
