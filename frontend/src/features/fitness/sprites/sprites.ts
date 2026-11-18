/**
 * Pixel-art sprites drawn as character maps. Each character is one pixel and
 * maps to a palette colour; `.` is transparent. Rows of one sprite must have
 * equal width (enforced by sprites.test.ts).
 */
export type Sprite = {
  rows: ReadonlyArray<string>
  palette: Readonly<Record<string, string>>
}

const coinPalette = { o: '#7a3f0c', y: '#f7c234', l: '#fff0b0', d: '#d9861b' }

export const coin: Sprite = {
  palette: coinPalette,
  rows: [
    '....oooo....',
    '..ooyyyyoo..',
    '.oyylyyyyyo.',
    '.oylyyddyyo.',
    'oylyyydyyydo',
    'oylyyydyyydo',
    'oyyyyydyyydo',
    'oyyyyydyyydo',
    '.oyyyyddyddo',
    '.oyyyyyyydo.',
    '..oodddddo..',
    '....oooo....',
  ],
}

export const iceCream: Sprite = {
  palette: { k: '#4a2a1a', r: '#e2343f', p: '#ff9cc2', P: '#e8679a', w: '#ffffff', c: '#eeb066', C: '#b8722c' },
  rows: [
    '.....kr.....',
    '....rrrr....',
    '...pprrpp...',
    '..ppppppwp..',
    '.pppppppppw.',
    '.pPpppppppp.',
    '.PPpPPpPPpP.',
    '..cccccccc..',
    '..cCcCcCcC..',
    '...cCcCcC...',
    '...CcCcCc...',
    '....cCcC....',
    '....CcCc....',
    '.....cC.....',
    '.....Cc.....',
  ],
}

export const sausage: Sprite = {
  palette: { o: '#5a2412', S: '#cf5a2f', h: '#f29a6a', k: '#7a2a12', t: '#ecca8e', T: '#b8925a' },
  rows: [
    '....oooo....',
    '...oShSSo...',
    '...oShSSo...',
    '...oSSkko...',
    '...okkSSo...',
    '...oShSSo...',
    '...oSSkko...',
    '...okkSSo...',
    '...oShSSo...',
    '...oSSSSo...',
    '....oooo....',
    '.....tt.....',
    '.....tt.....',
    '.....tt.....',
    '.....tT.....',
    '.....tT.....',
  ],
}

const heroPalette = {
  h: '#3b2a20',
  b: '#e2463f',
  s: '#f5c9a0',
  o: '#2b2135',
  r: '#d9747a',
  m: '#9aa3ad',
  M: '#4f5866',
  t: '#2fa39a',
  T: '#1f7a73',
  p: '#3d4a7a',
}

/** Hero pressing a barbell: standing frame. */
export const heroStand: Sprite = {
  palette: heroPalette,
  rows: [
    '..............',
    '....hhhhhh....',
    '...hhhhhhhh...',
    '...bbbbbbbb...',
    '...ssossoss...',
    '...ssssssss...',
    'MM..ssrrss..MM',
    'MmmmmmmmmmmmmM',
    'MM.stttttts.MM',
    '....tTttTt....',
    '....tttttt....',
    '....pppppp....',
    '....pp..pp....',
    '....pp..pp....',
    '...oop..poo...',
    '..............',
  ],
}

/** Hero pressing a barbell: squat frame. */
export const heroSquat: Sprite = {
  palette: heroPalette,
  rows: [
    '..............',
    '..............',
    '....hhhhhh....',
    '...hhhhhhhh...',
    '...bbbbbbbb...',
    '...ssossoss...',
    '...ssssssss...',
    'MM..ssrrss..MM',
    'MmmmmmmmmmmmmM',
    'MM.stttttts.MM',
    '....tTttTt....',
    '....tttttt....',
    '...pppppppp...',
    '..ppp....ppp..',
    '.oop......poo.',
    '..............',
  ],
}

const fieldPalette = {
  G: '#58b947',
  D: '#2f7d32',
  s: '#3f8f3a',
  p: '#ff7aa2',
  P: '#d9406e',
  y: '#ffd23f',
  b: '#9a6440',
  B: '#6f4429',
}

const mound = ['...bsbb...', '..bBbbBb..']

/**
 * Training-field tiles: one flower growing through four stages.
 * 0 bare soil, 1 sprout, 2 plant, 3 bud, 4 bloom.
 */
export const fieldTiles: ReadonlyArray<Sprite> = [
  {
    palette: fieldPalette,
    rows: ['..........', '..........', '..........', '..........', '..........', '..........', '..........', '..........', '...bbbb...', '..bBbbBb..'],
  },
  {
    palette: fieldPalette,
    rows: ['..........', '..........', '..........', '..........', '..........', '..GG.GG...', '...GsG....', '....s.....', ...mound],
  },
  {
    palette: fieldPalette,
    rows: ['..........', '..........', '...GG.....', '....sGG...', '.GG.s.....', '.DGGs.....', '....sGGD..', '....s.....', ...mound],
  },
  {
    palette: fieldPalette,
    rows: ['....p.....', '...ppP....', '...DpD....', '....s.....', '.GG.s.....', '.DGGs.....', '....sGGD..', '....s.....', ...mound],
  },
  {
    palette: fieldPalette,
    rows: ['...ppp....', '..ppypp...', '..PyyyP...', '..ppypp...', '...PpP....', '.DGGsGGD..', '..G.s.G...', '....s.....', ...mound],
  },
]

export const sparkle: Sprite = {
  palette: { w: '#ffffff', y: '#ffe066' },
  rows: ['...y...', '...w...', '.y.w.y.', 'ywwwwwy', '.y.w.y.', '...w...', '...y...'],
}
