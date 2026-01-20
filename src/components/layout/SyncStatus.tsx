import { logger } from '../../utils/logger'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import styles from './SyncStatus.module.css'

export function SyncStatus() {
  const { isOnline, isSyncing, syncStatus, sync } = useOnlineStatus()

  const handleSync = async () => {
    if (!isOnline || isSyncing) return

    try {
      const result = await sync()
      if (result.failed > 0) {
        logger.error('Sync errors:', result.errors)
      }
    } catch (error) {
      logger.error('Sync failed:', error)
    }
  }

  return (
    <div className={styles.syncStatus}>
      <div className={styles.statusIndicator}>
        <span
          className={`${styles.dot} ${isOnline ? styles.online : styles.offline}`}
          title={isOnline ? 'Online' : 'Offline'}
        />
        <span className={styles.statusText}>
          {isSyncing ? 'Syncing...' : isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {syncStatus.pendingOperations > 0 && (
        <div className={styles.pendingCount}>
          {syncStatus.pendingOperations} pending
        </div>
      )}

      {isOnline && !isSyncing && syncStatus.pendingOperations > 0 && (
        <button
          className={styles.syncButton}
          onClick={handleSync}
          title="Sync now"
        >
          Sync
        </button>
      )}
    </div>
  )
}
