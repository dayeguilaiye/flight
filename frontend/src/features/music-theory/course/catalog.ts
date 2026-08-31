import type { CourseChapter, CourseLesson, LessonKind, LessonLocation } from './types'

const LESSON_COPY = {
  'keyboard.keyboard-map': { slug: 'keyboard-map', titleKey: 'music.lesson.keyboard.keyboard-map.title', summaryKey: 'music.lesson.keyboard.keyboard-map.summary', observationKey: 'music.lesson.keyboard.keyboard-map.observation' },
  'keyboard.note-names': { slug: 'note-names', titleKey: 'music.lesson.keyboard.note-names.title', summaryKey: 'music.lesson.keyboard.note-names.summary', observationKey: 'music.lesson.keyboard.note-names.observation' },
  'keyboard.octaves': { slug: 'octaves', titleKey: 'music.lesson.keyboard.octaves.title', summaryKey: 'music.lesson.keyboard.octaves.summary', observationKey: 'music.lesson.keyboard.octaves.observation' },
  'keyboard.steps-accidentals': { slug: 'steps-accidentals', titleKey: 'music.lesson.keyboard.steps-accidentals.title', summaryKey: 'music.lesson.keyboard.steps-accidentals.summary', observationKey: 'music.lesson.keyboard.steps-accidentals.observation' },
  'keyboard.keyboard-observation': { slug: 'keyboard-observation', titleKey: 'music.lesson.keyboard.keyboard-observation.title', summaryKey: 'music.lesson.keyboard.keyboard-observation.summary', observationKey: 'music.lesson.keyboard.keyboard-observation.observation' },
  'intervals.interval-distance': { slug: 'interval-distance', titleKey: 'music.lesson.intervals.interval-distance.title', summaryKey: 'music.lesson.intervals.interval-distance.summary', observationKey: 'music.lesson.intervals.interval-distance.observation' },
  'intervals.count-semitones': { slug: 'count-semitones', titleKey: 'music.lesson.intervals.count-semitones.title', summaryKey: 'music.lesson.intervals.count-semitones.summary', observationKey: 'music.lesson.intervals.count-semitones.observation' },
  'intervals.interval-qualities': { slug: 'interval-qualities', titleKey: 'music.lesson.intervals.interval-qualities.title', summaryKey: 'music.lesson.intervals.interval-qualities.summary', observationKey: 'music.lesson.intervals.interval-qualities.observation' },
  'intervals.melodic-harmonic': { slug: 'melodic-harmonic', titleKey: 'music.lesson.intervals.melodic-harmonic.title', summaryKey: 'music.lesson.intervals.melodic-harmonic.summary', observationKey: 'music.lesson.intervals.melodic-harmonic.observation' },
  'intervals.transpose-interval': { slug: 'transpose-interval', titleKey: 'music.lesson.intervals.transpose-interval.title', summaryKey: 'music.lesson.intervals.transpose-interval.summary', observationKey: 'music.lesson.intervals.transpose-interval.observation' },
  'scales.tonic-key': { slug: 'tonic-key', titleKey: 'music.lesson.scales.tonic-key.title', summaryKey: 'music.lesson.scales.tonic-key.summary', observationKey: 'music.lesson.scales.tonic-key.observation' },
  'scales.major-formula': { slug: 'major-formula', titleKey: 'music.lesson.scales.major-formula.title', summaryKey: 'music.lesson.scales.major-formula.summary', observationKey: 'music.lesson.scales.major-formula.observation' },
  'scales.natural-minor': { slug: 'natural-minor', titleKey: 'music.lesson.scales.natural-minor.title', summaryKey: 'music.lesson.scales.natural-minor.summary', observationKey: 'music.lesson.scales.natural-minor.observation' },
  'scales.twelve-tonics': { slug: 'twelve-tonics', titleKey: 'music.lesson.scales.twelve-tonics.title', summaryKey: 'music.lesson.scales.twelve-tonics.summary', observationKey: 'music.lesson.scales.twelve-tonics.observation' },
  'scales.major-minor-relations': { slug: 'major-minor-relations', titleKey: 'music.lesson.scales.major-minor-relations.title', summaryKey: 'music.lesson.scales.major-minor-relations.summary', observationKey: 'music.lesson.scales.major-minor-relations.observation' },
  'triads.stack-thirds': { slug: 'stack-thirds', titleKey: 'music.lesson.triads.stack-thirds.title', summaryKey: 'music.lesson.triads.stack-thirds.summary', observationKey: 'music.lesson.triads.stack-thirds.observation' },
  'triads.triad-qualities': { slug: 'triad-qualities', titleKey: 'music.lesson.triads.triad-qualities.title', summaryKey: 'music.lesson.triads.triad-qualities.summary', observationKey: 'music.lesson.triads.triad-qualities.observation' },
  'triads.chord-tone-roles': { slug: 'chord-tone-roles', titleKey: 'music.lesson.triads.chord-tone-roles.title', summaryKey: 'music.lesson.triads.chord-tone-roles.summary', observationKey: 'music.lesson.triads.chord-tone-roles.observation' },
  'triads.inversions': { slug: 'inversions', titleKey: 'music.lesson.triads.inversions.title', summaryKey: 'music.lesson.triads.inversions.summary', observationKey: 'music.lesson.triads.inversions.observation' },
  'triads.build-triad': { slug: 'build-triad', titleKey: 'music.lesson.triads.build-triad.title', summaryKey: 'music.lesson.triads.build-triad.summary', observationKey: 'music.lesson.triads.build-triad.observation' },
  'harmony.scale-degree-triads': { slug: 'scale-degree-triads', titleKey: 'music.lesson.harmony.scale-degree-triads.title', summaryKey: 'music.lesson.harmony.scale-degree-triads.summary', observationKey: 'music.lesson.harmony.scale-degree-triads.observation' },
  'harmony.major-key-chords': { slug: 'major-key-chords', titleKey: 'music.lesson.harmony.major-key-chords.title', summaryKey: 'music.lesson.harmony.major-key-chords.summary', observationKey: 'music.lesson.harmony.major-key-chords.observation' },
  'harmony.minor-key-chords': { slug: 'minor-key-chords', titleKey: 'music.lesson.harmony.minor-key-chords.title', summaryKey: 'music.lesson.harmony.minor-key-chords.summary', observationKey: 'music.lesson.harmony.minor-key-chords.observation' },
  'harmony.roman-numerals': { slug: 'roman-numerals', titleKey: 'music.lesson.harmony.roman-numerals.title', summaryKey: 'music.lesson.harmony.roman-numerals.summary', observationKey: 'music.lesson.harmony.roman-numerals.observation' },
  'harmony.harmonic-functions': { slug: 'harmonic-functions', titleKey: 'music.lesson.harmony.harmonic-functions.title', summaryKey: 'music.lesson.harmony.harmonic-functions.summary', observationKey: 'music.lesson.harmony.harmonic-functions.observation' },
  'progressions.progression-motion': { slug: 'progression-motion', titleKey: 'music.lesson.progressions.progression-motion.title', summaryKey: 'music.lesson.progressions.progression-motion.summary', observationKey: 'music.lesson.progressions.progression-motion.observation' },
  'progressions.cadences': { slug: 'cadences', titleKey: 'music.lesson.progressions.cadences.title', summaryKey: 'music.lesson.progressions.cadences.summary', observationKey: 'music.lesson.progressions.cadences.observation' },
  'progressions.common-progressions': { slug: 'common-progressions', titleKey: 'music.lesson.progressions.common-progressions.title', summaryKey: 'music.lesson.progressions.common-progressions.summary', observationKey: 'music.lesson.progressions.common-progressions.observation' },
  'progressions.block-arpeggio': { slug: 'block-arpeggio', titleKey: 'music.lesson.progressions.block-arpeggio.title', summaryKey: 'music.lesson.progressions.block-arpeggio.summary', observationKey: 'music.lesson.progressions.block-arpeggio.observation' },
  'progressions.voice-leading': { slug: 'voice-leading', titleKey: 'music.lesson.progressions.voice-leading.title', summaryKey: 'music.lesson.progressions.voice-leading.summary', observationKey: 'music.lesson.progressions.voice-leading.observation' },
} as const satisfies Record<string, Omit<CourseLesson, 'id' | 'kind'>>

type LessonCopyId = keyof typeof LESSON_COPY

function lessons(kind: LessonKind, ids: ReadonlyArray<LessonCopyId>): ReadonlyArray<CourseLesson> {
  return ids.map((id) => ({ id, kind, ...LESSON_COPY[id] }))
}

export const COURSE_CHAPTERS: ReadonlyArray<CourseChapter> = [
  {
    id: 'keyboard',
    slug: 'sound-keyboard',
    titleKey: 'music.chapter.keyboard.title',
    descriptionKey: 'music.chapter.keyboard.description',
    lessons: lessons('keyboard', [
      'keyboard.keyboard-map',
      'keyboard.note-names',
      'keyboard.octaves',
      'keyboard.steps-accidentals',
      'keyboard.keyboard-observation',
    ]),
  },
  {
    id: 'intervals',
    slug: 'hear-intervals',
    titleKey: 'music.chapter.intervals.title',
    descriptionKey: 'music.chapter.intervals.description',
    lessons: lessons('interval', [
      'intervals.interval-distance',
      'intervals.count-semitones',
      'intervals.interval-qualities',
      'intervals.melodic-harmonic',
      'intervals.transpose-interval',
    ]),
  },
  {
    id: 'scales',
    slug: 'scales-keys',
    titleKey: 'music.chapter.scales.title',
    descriptionKey: 'music.chapter.scales.description',
    lessons: lessons('scale', [
      'scales.tonic-key',
      'scales.major-formula',
      'scales.natural-minor',
      'scales.twelve-tonics',
      'scales.major-minor-relations',
    ]),
  },
  {
    id: 'triads',
    slug: 'build-triads',
    titleKey: 'music.chapter.triads.title',
    descriptionKey: 'music.chapter.triads.description',
    lessons: lessons('triad', [
      'triads.stack-thirds',
      'triads.triad-qualities',
      'triads.chord-tone-roles',
      'triads.inversions',
      'triads.build-triad',
    ]),
  },
  {
    id: 'harmony',
    slug: 'diatonic-chords',
    titleKey: 'music.chapter.harmony.title',
    descriptionKey: 'music.chapter.harmony.description',
    lessons: lessons('harmony', [
      'harmony.scale-degree-triads',
      'harmony.major-key-chords',
      'harmony.minor-key-chords',
      'harmony.roman-numerals',
      'harmony.harmonic-functions',
    ]),
  },
  {
    id: 'progressions',
    slug: 'chord-progressions',
    titleKey: 'music.chapter.progressions.title',
    descriptionKey: 'music.chapter.progressions.description',
    lessons: lessons('progression', [
      'progressions.progression-motion',
      'progressions.cadences',
      'progressions.common-progressions',
      'progressions.block-arpeggio',
      'progressions.voice-leading',
    ]),
  },
]

export const FIRST_LESSON = COURSE_CHAPTERS[0].lessons[0]

export function findLesson(chapterSlug?: string, lessonSlug?: string): LessonLocation | undefined {
  const chapterIndex = COURSE_CHAPTERS.findIndex((chapter) => chapter.slug === chapterSlug)
  if (chapterIndex < 0) return undefined
  const chapter = COURSE_CHAPTERS[chapterIndex]
  const lessonIndex = chapter.lessons.findIndex((lesson) => lesson.slug === lessonSlug)
  if (lessonIndex < 0) return undefined
  return { chapter, lesson: chapter.lessons[lessonIndex], chapterIndex, lessonIndex }
}

export function firstLessonLocation(): LessonLocation {
  return { chapter: COURSE_CHAPTERS[0], lesson: FIRST_LESSON, chapterIndex: 0, lessonIndex: 0 }
}

export function adjacentLesson(location: LessonLocation, direction: -1 | 1): LessonLocation | undefined {
  const flattened = COURSE_CHAPTERS.flatMap((chapter, chapterIndex) => chapter.lessons.map((lesson, lessonIndex) => ({
    chapter,
    lesson,
    chapterIndex,
    lessonIndex,
  })))
  const currentIndex = flattened.findIndex((candidate) => candidate.lesson.id === location.lesson.id)
  return flattened[currentIndex + direction]
}

export function lessonPath(location: Pick<LessonLocation, 'chapter' | 'lesson'>): string {
  return `/music-theory/${location.chapter.slug}/${location.lesson.slug}`
}
