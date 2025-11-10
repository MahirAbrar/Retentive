// Electron API type definitions for the renderer process

declare global {
  interface Window {
    electronAPI: {
      send: (channel: string, data?: any) => void
      receive: (channel: string, func: (...args: any[]) => void) => void
      invoke: (channel: string, data?: any) => Promise<any>
      removeAllListeners: (channel: string) => void
      openExternal: (url: string) => void
      secureStorage: {
        get: (key: string) => Promise<string | null>
        set: (key: string, value: string) => Promise<boolean>
        remove: (key: string) => Promise<boolean>
        clear: () => Promise<boolean>
      }
      notification: {
        show: (title: string, body: string, options?: any) => Promise<void>
        requestPermission: () => Promise<boolean>
        schedule: (title: string, body: string, date: Date, options?: any) => Promise<void>
        getAll: () => Promise<any[]>
        clear: (id?: string) => Promise<void>
        clearAll: () => Promise<void>
        onClick: (callback: () => void) => void
        request: () => Promise<boolean>
        check: () => Promise<boolean>
        scheduleReminder: (itemName: string, delayInMs: number) => void
      }
      notifications: {
        requestPermission: () => Promise<boolean>
        scheduleNotification: (options: { title: string; body: string; delay?: number }) => void
        checkPermission: () => Promise<string>
        cancelAll: () => void
        schedule: (title: string, body: string, delay?: number) => void
        cancel: (id?: string) => void
        test: () => void
        testDaily: (userId: string) => Promise<any>
      }
      onNotificationClick: (callback: (data: any) => void) => void
      store: {
        get: (key: string) => Promise<any>
        set: (key: string, value: any) => Promise<void>
        delete: (key: string) => Promise<void>
        clear: () => Promise<void>
      }
      systemTheme: {
        get: () => Promise<'light' | 'dark'>
        onChange: (callback: (theme: 'light' | 'dark') => void) => void
      }
      appInfo: {
        getVersion: () => Promise<string>
        isPackaged: () => Promise<boolean>
        getPath: (name: string) => Promise<string>
      }
      getSupabaseConfig: () => Promise<{ url: string; anonKey: string } | null>
      updates: {
        onAvailable: (callback: (info: any) => void) => void
        onDownloadProgress: (callback: (progress: any) => void) => void
        onDownloaded: (callback: (info: any) => void) => void
        download: () => Promise<{ success: boolean; error?: string }>
        install: () => Promise<{ success: boolean; error?: string }>
      }
      database: {
        topics: {
          create: (topic: any) => Promise<any>
          update: (id: string, updates: any) => Promise<any>
          delete: (id: string) => Promise<any>
          getAll: (userId: string) => Promise<any[]>
          getById: (id: string) => Promise<any>
          get: (id: string, userId: string) => Promise<any>
        }
        learningItems: {
          create: (item: any) => Promise<any>
          update: (id: string, updates: any) => Promise<any>
          delete: (id: string) => Promise<any>
          getByTopic: (topicId: string) => Promise<any[]>
          getById: (id: string) => Promise<any>
          getDueItems: (userId: string, mode?: string) => Promise<any[]>
          recordReview: (itemId: string, difficulty: string) => Promise<any>
          getAll: (userId: string, topicId?: string) => Promise<any[]>
          get: (id: string, userId: string) => Promise<any>
        }
        items: {
          create: (item: any) => Promise<any>
          update: (id: string, updates: any, userId: string) => Promise<any>
          delete: (id: string, userId: string) => Promise<any>
          getAll: (userId: string, topicId?: string) => Promise<any[]>
          get: (id: string, userId: string) => Promise<any>
        }
        reviews: {
          create: (session: any) => Promise<any>
          getRecent: (userId: string, limit?: number) => Promise<any[]>
        }
        gamification: {
          getStats: (userId: string) => Promise<any>
          updateStats: (userId: string, updates: any) => Promise<any>
          getAchievements: (userId: string) => Promise<any[]>
          unlockAchievement: (userId: string, achievementId: string, points: number) => Promise<any>
        }
        daily: {
          getStats: (userId: string, date: string) => Promise<any>
          updateStats: (userId: string, date: string, updates: any) => Promise<any>
        }
        user: {
          get: (userId: string) => Promise<any>
          upsert: (user: any) => Promise<void>
        }
        sync: {
          all: (userId: string) => Promise<any>
          status: (userId: string) => Promise<any>
          onStatusChange: (callback: (status: any) => void) => void
        }
        offline: {
          stats: (userId: string) => Promise<any>
        }
        openExternal?: (url: string) => void
      }
      offline: {
        topics: {
          create: (topic: any) => Promise<any>
          update: (id: string, updates: any) => Promise<any>
          delete: (id: string) => Promise<any>
          getAll: (userId: string) => Promise<any[]>
          getById: (id: string) => Promise<any>
        }
        learningItems: {
          create: (item: any) => Promise<any>
          update: (id: string, updates: any) => Promise<any>
          delete: (id: string) => Promise<any>
          getByTopic: (topicId: string) => Promise<any[]>
          getById: (id: string) => Promise<any>
          getDueItems: (userId: string) => Promise<any[]>
          getAllByUser: (userId: string) => Promise<any[]>
        }
        reviewSessions: {
          create: (session: any) => Promise<any>
          getByItem: (itemId: string) => Promise<any[]>
          getRecent: (userId: string, limit: number) => Promise<any[]>
        }
        user: {
          getSettings: (userId: string) => Promise<any>
          updateSettings: (userId: string, settings: any) => Promise<any>
        }
        gamification: {
          getStats: (userId: string) => Promise<any>
          updateStats: (userId: string, updates: any) => Promise<any>
          getAchievements: (userId: string) => Promise<any[]>
          unlockAchievement: (userId: string, achievementId: string) => Promise<any>
          getDailyProgress: (userId: string) => Promise<any>
        }
        daily: {
          getDailyProgress: (userId: string, date: string) => Promise<any>
          updateDailyProgress: (progress: any) => Promise<any>
        }
        sync: {
          syncToCloud: () => Promise<any>
          syncFromCloud: () => Promise<any>
          getLastSync: () => Promise<any>
        }
        cache: {
          getArchivedTopics: (userId: string) => Promise<any[]>
          getMaintenanceItems: (userId: string) => Promise<any[]>
        }
        stats: (userId: string) => Promise<any>
      }
      sync: {
        all: (userId: string) => Promise<any>
        status: (userId: string) => Promise<any>
        onStatusChange: (callback: (status: any) => void) => void
      }
      user: {
        upsert: (user: any) => Promise<void>
      }
      offlineStatus: {
        get: () => Promise<boolean>
        onChange: (callback: (isOffline: boolean) => void) => void
      }
    }
  }
}

export {}