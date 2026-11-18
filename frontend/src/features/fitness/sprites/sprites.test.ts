import { describe, expect, it } from 'vitest'
import { spriteRuns } from './PixelSprite'
import * as sprites from './sprites'
import type { Sprite } from './sprites'

function allSprites(): Array<[string, Sprite]> {
  const entries: Array<[string, Sprite]> = []
  for (const [name, value] of Object.entries(sprites)) {
    if (Array.isArray(value)) value.forEach((sprite: Sprite, index) => entries.push([`${name}[${index}]`, sprite]))
    else entries.push([name, value as Sprite])
  }
  return entries
}

describe('pixel sprites', () => {
  it.each(allSprites())('%s has rectangular rows and only palette colours', (_name, sprite) => {
    const width = sprite.rows[0].length
    for (const row of sprite.rows) {
      expect(row).toHaveLength(width)
      for (const pixel of row) {
        if (pixel !== '.') expect(sprite.palette).toHaveProperty(pixel)
      }
    }
  })

  it('merges horizontal runs of one colour', () => {
    const runs = spriteRuns({ palette: { a: '#000' }, rows: ['aa.a'] })
    expect(runs).toEqual([
      { x: 0, y: 0, width: 2, color: '#000' },
      { x: 3, y: 0, width: 1, color: '#000' },
    ])
  })
})
