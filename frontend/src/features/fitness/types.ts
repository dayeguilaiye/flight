import { z } from 'zod'

export const rewardKinds = ['ice_cream', 'sausage'] as const
export type RewardKind = (typeof rewardKinds)[number]

export const fitnessStateSchema = z.object({
  summary: z.object({
    totalMinutes: z.number().int(),
    minutesPerCoin: z.number().int().positive(),
    coinsEarned: z.number().int(),
    coinsSpent: z.number().int(),
    coinBalance: z.number().int(),
    minutesTowardNextCoin: z.number().int(),
  }),
  rewards: z.array(z.object({ kind: z.enum(rewardKinds), cost: z.number().int().positive() })),
  workouts: z.array(
    z.object({
      id: z.number().int(),
      durationMinutes: z.number().int(),
      endedAt: z.string(),
      note: z.string(),
      createdAt: z.string(),
    }),
  ),
  items: z.array(
    z.object({
      id: z.number().int(),
      kind: z.enum(rewardKinds),
      cost: z.number().int(),
      redeemedAt: z.string(),
      eatenAt: z.string().optional(),
    }),
  ),
})

export type FitnessState = z.infer<typeof fitnessStateSchema>
export type Workout = FitnessState['workouts'][number]
export type InventoryItem = FitnessState['items'][number]
export type Reward = FitnessState['rewards'][number]

export type WorkoutDraft = {
  durationMinutes: number
  /** RFC 3339 end time; omitted means "now" on the server. */
  endedAt?: string
  note: string
}

export const workoutLimits = { minMinutes: 1, maxMinutes: 720, maxNote: 500 } as const
