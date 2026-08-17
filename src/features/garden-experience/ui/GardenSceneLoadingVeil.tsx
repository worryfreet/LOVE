import styles from '../gardenExperience.module.css'

export function GardenSceneLoadingVeil({
  visible,
  phase,
}: {
  visible: boolean
  phase: 'garden' | 'interior'
}) {
  const interior = phase === 'interior'
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
        <p>{interior ? '正在点亮小屋' : '花园正在醒来'}</p>
        <small>
          {interior ? '照片、书信与灯火正在就位' : '让花与光慢慢抵达'}
        </small>
      </div>
    </div>
  )
}
