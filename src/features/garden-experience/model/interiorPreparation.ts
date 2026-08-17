import type { CottagePortalSnapshot } from '@/entities/scene/items/cottage-flower-garden/model/cottagePortalMachine'

/** 开门或保持开启时，当前门户事务尚未收到室内首帧确认才需要遮罩。 */
export function isCottageInteriorPreparing(
  snapshot: Pick<CottagePortalSnapshot, 'epoch' | 'motion' | 'visualOpen'>,
  readyEpoch: number | null,
) {
  return (
    snapshot.visualOpen &&
    (snapshot.motion === 'opening' || snapshot.motion === 'open') &&
    readyEpoch !== snapshot.epoch
  )
}
