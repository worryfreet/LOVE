import styles from '../gardenExperience.module.css'

export function GardenSceneLoadingVeil({
  visible,
  phase,
}: {
  visible: boolean
  phase: 'garden' | 'interior' | 'exterior'
}) {
  const interior = phase === 'interior'
  const exterior = phase === 'exterior'
  return (
    <div
      className={styles.sceneLoadingVeil}
      data-testid="garden-scene-loading"
      data-visible={visible}
      data-phase={phase}
      role={visible ? 'status' : undefined}
      aria-live="polite"
      aria-hidden={!visible}
    >
      <div className={styles.sceneLoadingCopy}>
        <span className={styles.sceneLoadingBrand}>LOVE</span>
        <span className={styles.loadingThreshold} aria-hidden="true">
          <i />
        </span>
        <p>
          {interior
            ? '正在点亮小屋'
            : exterior
              ? '正在打开花园'
              : '花园正在醒来'}
        </p>
        <small>
          {interior
            ? '照片、书信与灯火正在就位'
            : exterior
              ? '花海与晚风正在回到门外'
              : '让花与光慢慢抵达'}
        </small>
      </div>
    </div>
  )
}
