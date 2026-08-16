import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SetStateAction,
} from 'react'
import {
  COTTAGE_INTERIOR_DEFAULT_DOCUMENT,
  COTTAGE_INTERIOR_LEGACY_STORAGE_KEY,
  COTTAGE_INTERIOR_STORAGE_KEY,
  getNextCottageInteriorSequence,
  parseCottageInteriorDocument,
  type CottageInteriorInstance,
} from '@/entities/scene'

function readInitialInterior() {
  if (typeof window === 'undefined') {
    return [...COTTAGE_INTERIOR_DEFAULT_DOCUMENT.instances]
  }
  try {
    return [
      ...parseCottageInteriorDocument(
        window.sessionStorage.getItem(COTTAGE_INTERIOR_STORAGE_KEY) ??
          window.sessionStorage.getItem(COTTAGE_INTERIOR_LEGACY_STORAGE_KEY),
      ).instances,
    ]
  } catch {
    return [...COTTAGE_INTERIOR_DEFAULT_DOCUMENT.instances]
  }
}

/** LOVE 可从项目草稿初始化陈设，并把每次修改同步回统一配置。 */
export function useCottageInteriorInstances(
  enabled: boolean,
  initialInstances?: readonly CottageInteriorInstance[],
  onInstancesChange?: (instances: CottageInteriorInstance[]) => void,
) {
  const [storedInstances, setStoredInstances] = useState(() =>
    initialInstances?.length ? [...initialInstances] : readInitialInterior(),
  )
  const [persistenceError, setPersistenceError] = useState<string | null>(null)
  const instances = useMemo(
    () => (enabled ? storedInstances : []),
    [enabled, storedInstances],
  )
  const nextSequence = useRef(getNextCottageInteriorSequence(storedInstances))

  const setInstances = useCallback(
    (action: SetStateAction<CottageInteriorInstance[]>) => {
      if (!enabled) return
      setStoredInstances(action)
    },
    [enabled],
  )

  const restoreDefaults = useCallback(() => {
    const defaults = COTTAGE_INTERIOR_DEFAULT_DOCUMENT.instances.map(
      (instance) => ({
        ...instance,
        position: { ...instance.position },
        rotation: { ...instance.rotation },
        scale: { ...instance.scale },
        parameters: { ...instance.parameters },
        ...(instance.path
          ? { path: instance.path.map((point) => ({ ...point })) }
          : {}),
      }),
    )
    nextSequence.current = getNextCottageInteriorSequence(defaults)
    setStoredInstances(defaults)
  }, [])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    try {
      window.sessionStorage.setItem(
        COTTAGE_INTERIOR_STORAGE_KEY,
        JSON.stringify({
          schemaVersion: 2,
          sceneId: 'cottage-flower-garden',
          instances: storedInstances,
        }),
      )
      setPersistenceError(null)
    } catch {
      setPersistenceError('浏览器存储空间不足：当前修改仅保留在本页，刷新后会丢失。')
    }
  }, [enabled, storedInstances])

  useEffect(() => {
    if (enabled) onInstancesChange?.(storedInstances)
  }, [enabled, onInstancesChange, storedInstances])

  return useMemo(
    () => ({
      instances,
      setInstances,
      nextSequence,
      persistenceError,
      restoreDefaults,
    }),
    [instances, persistenceError, restoreDefaults, setInstances],
  )
}
