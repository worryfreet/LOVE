import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  COTTAGE_INTERIOR_MAX_INSTANCES,
  COTTAGE_INTERIOR_MAX_PHOTOS,
  createCottageInteriorInstance,
  duplicateCottageInteriorInstance,
  findCottageInteriorTableSupport,
  getCottageRoundTableTopY,
  moveCottageInteriorTabletopInstance,
  normalizeCottageInteriorPartParameters,
  removeCottageInteriorInstance,
  sanitizeCottageInteriorInstanceTransform,
  type CottageInteriorInstance,
  type CottageInteriorPartId,
  type CottageInteriorPoint,
} from '@/entities/scene'
import { useCottageInteriorInstances } from '@/features/edit-scene'
import {
  getDefaultCottageInteriorParameters,
  getNewCottageInteriorPosition,
  type CottageInteriorTransformMode,
} from './cottageInteriorEditorCatalog'

export function useCottageInteriorEditor(
  enabled: boolean,
  initialInstances?: readonly CottageInteriorInstance[],
  onInstancesChange?: (instances: CottageInteriorInstance[]) => void,
) {
  const {
    instances,
    setInstances,
    nextSequence,
    persistenceError,
    restoreDefaults: restoreStoredDefaults,
  } = useCottageInteriorInstances(enabled, initialInstances, onInstancesChange)
  const [open, setOpenState] = useState(false)
  const [entryPreview, setEntryPreview] = useState(false)
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(
    null,
  )
  const [transformMode, setTransformMode] =
    useState<CottageInteriorTransformMode>('translate')
  const [selectedPathPointIndex, setSelectedPathPointIndex] = useState<
    number | null
  >(null)

  const setOpen = useCallback((next: boolean) => {
    setEntryPreview(false)
    setOpenState(next)
  }, [])

  const previewEntry = useCallback(() => {
    setEntryPreview(true)
    setOpenState(false)
    setSelectedInstanceId(null)
    setSelectedPathPointIndex(null)
  }, [])

  const selectedInstance = useMemo(
    () =>
      instances.find((instance) => instance.id === selectedInstanceId) ??
      null,
    [instances, selectedInstanceId],
  )

  useEffect(() => {
    if (selectedInstanceId && !selectedInstance) {
      setSelectedInstanceId(null)
      setSelectedPathPointIndex(null)
    }
  }, [selectedInstance, selectedInstanceId])

  const updateInstance = useCallback(
    (
      instanceId: string,
      update: (instance: CottageInteriorInstance) => CottageInteriorInstance,
    ) => {
      setInstances((current) =>
        updateCottageInteriorInstances(current, instanceId, update),
      )
    },
    [setInstances],
  )

  const addInstance = useCallback(
    (partId: CottageInteriorPartId) => {
      if (instances.length >= COTTAGE_INTERIOR_MAX_INSTANCES) return
      if (
        partId === 'cottage-photo-frame' &&
        instances.filter((instance) => instance.partId === partId).length >=
          COTTAGE_INTERIOR_MAX_PHOTOS
      ) {
        return
      }
      const supportTable =
        partId === 'cottage-candle' || partId === 'cottage-envelope'
          ? selectedInstance?.partId === 'cottage-round-table'
            ? selectedInstance
            : instances.find(
                (instance) => instance.partId === 'cottage-round-table',
              )
          : undefined
      const position = supportTable
        ? getNewTabletopPosition(supportTable, partId)
        : getNewCottageInteriorPosition(partId)
      const created = createCottageInteriorInstance(
        partId,
        nextSequence.current,
        getDefaultCottageInteriorParameters(partId),
        position,
      )
      const next = sanitizeCottageInteriorInstanceTransform({
        ...created,
        ...(supportTable ? { supportId: supportTable.id } : {}),
      })
      nextSequence.current += 1
      setInstances((current) => [...current, next])
      setSelectedInstanceId(next.id)
      setSelectedPathPointIndex(null)
      setTransformMode('translate')
    },
    [instances, nextSequence, selectedInstance, setInstances],
  )

  const duplicateInstance = useCallback(
    (instanceId: string) => {
      const source = instances.find((instance) => instance.id === instanceId)
      if (!source || instances.length >= COTTAGE_INTERIOR_MAX_INSTANCES) {
        return
      }
      if (
        source.partId === 'cottage-photo-frame' &&
        instances.filter(
          (instance) => instance.partId === 'cottage-photo-frame',
        ).length >= COTTAGE_INTERIOR_MAX_PHOTOS
      ) {
        return
      }
      const sanitizedCopy = sanitizeCottageInteriorInstanceTransform(
        duplicateCottageInteriorInstance(source, nextSequence.current),
        source,
      )
      const copySupport = findCottageInteriorTableSupport(
        sanitizedCopy,
        instances,
      )
      const copy = {
        ...sanitizedCopy,
        supportId: copySupport?.id,
      }
      nextSequence.current += 1
      setInstances((current) => [...current, copy])
      setSelectedInstanceId(copy.id)
      setSelectedPathPointIndex(null)
    },
    [instances, nextSequence, setInstances],
  )

  const deleteInstance = useCallback(
    (instanceId: string) => {
      setInstances((current) =>
        removeCottageInteriorInstance(current, instanceId),
      )
      if (selectedInstanceId === instanceId) {
        setSelectedInstanceId(null)
        setSelectedPathPointIndex(null)
      }
    },
    [selectedInstanceId, setInstances],
  )

  const restoreDefaults = useCallback(() => {
    restoreStoredDefaults()
    setSelectedInstanceId(null)
    setSelectedPathPointIndex(null)
    setTransformMode('translate')
  }, [restoreStoredDefaults])

  const commitTransform = useCallback(
    (
      instanceId: string,
      next: {
        position: CottageInteriorPoint
        rotation: CottageInteriorPoint
        scale: CottageInteriorPoint
      },
    ) => {
      updateInstance(instanceId, (instance) => ({
        ...instance,
        position: next.position,
        rotation: next.rotation,
        scale: next.scale,
      }))
    },
    [updateInstance],
  )

  const commitPathPoint = useCallback(
    (instanceId: string, index: number, point: CottageInteriorPoint) => {
      updateInstance(instanceId, (instance) => ({
        ...instance,
        path: instance.path?.map((candidate, candidateIndex) =>
          candidateIndex === index
            ? point
            : candidate,
        ),
      }))
    },
    [updateInstance],
  )

  return useMemo(
    () => ({
      instances,
      setInstances,
      nextSequence,
      open,
      entryPreview,
      selectedInstance,
      selectedInstanceId,
      transformMode,
      selectedPathPointIndex,
      persistenceError,
      setOpen,
      previewEntry,
      setSelectedInstanceId,
      setTransformMode,
      setSelectedPathPointIndex,
      addInstance,
      updateInstance,
      duplicateInstance,
      deleteInstance,
      restoreDefaults,
      commitTransform,
      commitPathPoint,
    }),
    [
      addInstance,
      commitPathPoint,
      commitTransform,
      deleteInstance,
      entryPreview,
      duplicateInstance,
      instances,
      nextSequence,
      open,
      persistenceError,
      previewEntry,
      restoreDefaults,
      selectedInstance,
      selectedInstanceId,
      selectedPathPointIndex,
      setInstances,
      setOpen,
      transformMode,
      updateInstance,
    ],
  )
}

function normalizeEditorInstance(
  instance: CottageInteriorInstance,
  fallback?: CottageInteriorInstance,
) {
  return sanitizeCottageInteriorInstanceTransform(
    {
      ...instance,
      parameters: normalizeCottageInteriorPartParameters(
        instance.partId,
        instance.parameters,
      ),
    },
    fallback,
  )
}

function updateCottageInteriorInstances(
  instances: CottageInteriorInstance[],
  instanceId: string,
  update: (instance: CottageInteriorInstance) => CottageInteriorInstance,
) {
  const previous = instances.find((instance) => instance.id === instanceId)
  if (!previous) return instances
  const normalized = normalizeEditorInstance(update(previous), previous)
  const support = findCottageInteriorTableSupport(normalized, instances)
  const next = { ...normalized, supportId: support?.id }
  return instances.map((instance) => {
    if (instance.id === instanceId) return next
    if (
      previous.partId === 'cottage-round-table' &&
      instance.supportId === previous.id
    ) {
      return normalizeEditorInstance(
        moveCottageInteriorTabletopInstance(instance, previous, next),
        instance,
      )
    }
    return instance
  })
}

function getNewTabletopPosition(
  table: CottageInteriorInstance,
  partId: CottageInteriorPartId,
) {
  const local =
    partId === 'cottage-envelope'
      ? { x: 0.18, z: 0.14 }
      : { x: -0.16, z: -0.04 }
  const x = local.x * table.scale.x
  const z = local.z * table.scale.z
  const cosine = Math.cos(table.rotation.y)
  const sine = Math.sin(table.rotation.y)
  return {
    x: table.position.x + cosine * x + sine * z,
    y: getCottageRoundTableTopY(table),
    z: table.position.z - sine * x + cosine * z,
  }
}
