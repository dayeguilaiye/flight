import { iceCream, sausage, type Sprite } from '../sprites/sprites'
import type { RewardKind } from '../types'

export const rewardSprites: Record<RewardKind, Sprite> = {
  ice_cream: iceCream,
  sausage,
}
