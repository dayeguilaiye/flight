import { useMemo } from 'react'
import type { Sprite } from './sprites'

type Run = { x: number; y: number; width: number; color: string }

/** Merges horizontal runs of equal colour so each sprite renders few rects. */
export function spriteRuns(sprite: Sprite): Run[] {
  const runs: Run[] = []
  sprite.rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const key = row[x]
      const color = sprite.palette[key]
      let end = x + 1
      while (end < row.length && row[end] === key) end += 1
      if (color) runs.push({ x, y, width: end - x, color })
      x = end
    }
  })
  return runs
}

type PixelSpriteProps = {
  sprite: Sprite
  /** Rendered pixel size of one sprite pixel, in CSS px. */
  scale?: number
  className?: string
  title?: string
}

export function PixelSprite({ sprite, scale = 4, className, title }: PixelSpriteProps) {
  const runs = useMemo(() => spriteRuns(sprite), [sprite])
  const width = sprite.rows[0]?.length ?? 0
  const height = sprite.rows.length
  return (
    <svg
      aria-hidden={title ? undefined : true}
      className={className}
      height={height * scale}
      role={title ? 'img' : undefined}
      shapeRendering="crispEdges"
      viewBox={`0 0 ${width} ${height}`}
      width={width * scale}
    >
      {title ? <title>{title}</title> : null}
      {runs.map((run) => (
        <rect fill={run.color} height={1} key={`${run.x}-${run.y}`} width={run.width} x={run.x} y={run.y} />
      ))}
    </svg>
  )
}
