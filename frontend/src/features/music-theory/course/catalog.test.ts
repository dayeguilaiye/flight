import { describe, expect, it } from 'vitest'
import { COURSE_CHAPTERS, findLesson, lessonPath } from './catalog'

describe('music theory course catalog', () => {
  it('exposes six chapters with five directly addressable lessons each', () => {
    expect(COURSE_CHAPTERS).toHaveLength(6)
    expect(COURSE_CHAPTERS.every((chapter) => chapter.lessons.length === 5)).toBe(true)

    const paths = COURSE_CHAPTERS.flatMap((chapter) => chapter.lessons.map((lesson) => lessonPath({ chapter, lesson })))
    expect(paths).toHaveLength(30)
    expect(new Set(paths).size).toBe(30)
  })

  it('treats route slugs as a validated boundary', () => {
    expect(findLesson('diatonic-chords', 'major-key-chords')?.lesson.id).toBe('harmony.major-key-chords')
    expect(findLesson('diatonic-chords', 'not-a-lesson')).toBeUndefined()
    expect(findLesson('not-a-chapter', 'major-key-chords')).toBeUndefined()
  })
})
