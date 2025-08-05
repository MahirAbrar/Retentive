import { contextBridge, ipcRenderer } from 'electron'

const validChannels = {
  send: ['toMain', 'app:quit', 'app:minimize', 'app:maximize'],
  receive: ['fromMain', 'app:update-available', 'app:update-downloaded', 'navigate', 'sync:status'],
  invoke: [
    'dialog:openFile', 
    'dialog:saveFile', 
    'app:version',
    'secureStorage:get',
    'secureStorage:set',
    'secureStorage:remove',
    'secureStorage:clear',
    'notifications:schedule',
    'notifications:cancel',
    'notifications:test',
    // Database operations
    'db:topics:getAll',
    'db:topics:get',
    'db:topics:create',
    'db:topics:update',
    'db:topics:delete',
    'db:items:getAll',
    'db:items:get',
    'db:items:create',
    'db:items:update',
    'db:items:delete',
    'db:reviews:create',
    'db:reviews:getRecent',
    'db:gamification:getStats',
    'db:gamification:updateStats',
    'db:gamification:getAchievements',
    'db:gamification:unlockAchievement',
    'db:daily:getStats',
    'db:daily:updateStats',
    'db:user:get',
    'db:user:upsert',
    'db:sync:all',
    'db:sync:status',
    'db:offline:stats'
  ],
}

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel: string, data?: any) => {
    if (validChannels.send.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  receive: (channel: string, func: (...args: any[]) => void) => {
    if (validChannels.receive.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => func(...args))
    }
  },
  invoke: async (channel: string, data?: any) => {
    if (validChannels.invoke.includes(channel)) {
      return await ipcRenderer.invoke(channel, data)
    }
  },
  removeAllListeners: (channel: string) => {
    if (validChannels.receive.includes(channel)) {
      ipcRenderer.removeAllListeners(channel)
    }
  },
  // Secure storage methods
  secureStorage: {
    get: async (key: string) => {
      return await ipcRenderer.invoke('secureStorage:get', key)
    },
    set: async (key: string, value: string) => {
      return await ipcRenderer.invoke('secureStorage:set', key, value)
    },
    remove: async (key: string) => {
      return await ipcRenderer.invoke('secureStorage:remove', key)
    },
    clear: async () => {
      return await ipcRenderer.invoke('secureStorage:clear')
    }
  },
  // Notification methods
  notifications: {
    schedule: async (type: string, data: any) => {
      return await ipcRenderer.invoke('notifications:schedule', type, data)
    },
    cancel: async (type: string, userId: string) => {
      return await ipcRenderer.invoke('notifications:cancel', type, userId)
    },
    test: async () => {
      return await ipcRenderer.invoke('notifications:test')
    }
  },
  // Database methods
  database: {
    topics: {
      getAll: async (userId: string) => {
        return await ipcRenderer.invoke('db:topics:getAll', userId)
      },
      get: async (id: string, userId: string) => {
        return await ipcRenderer.invoke('db:topics:get', id, userId)
      },
      create: async (topic: any) => {
        return await ipcRenderer.invoke('db:topics:create', topic)
      },
      update: async (id: string, updates: any, userId: string) => {
        return await ipcRenderer.invoke('db:topics:update', id, updates, userId)
      },
      delete: async (id: string, userId: string) => {
        return await ipcRenderer.invoke('db:topics:delete', id, userId)
      }
    },
    items: {
      getAll: async (userId: string, topicId?: string) => {
        return await ipcRenderer.invoke('db:items:getAll', userId, topicId)
      },
      get: async (id: string, userId: string) => {
        return await ipcRenderer.invoke('db:items:get', id, userId)
      },
      create: async (item: any) => {
        return await ipcRenderer.invoke('db:items:create', item)
      },
      update: async (id: string, updates: any, userId: string) => {
        return await ipcRenderer.invoke('db:items:update', id, updates, userId)
      },
      delete: async (id: string, userId: string) => {
        return await ipcRenderer.invoke('db:items:delete', id, userId)
      }
    },
    reviews: {
      create: async (session: any) => {
        return await ipcRenderer.invoke('db:reviews:create', session)
      },
      getRecent: async (userId: string, limit?: number) => {
        return await ipcRenderer.invoke('db:reviews:getRecent', userId, limit)
      }
    },
    gamification: {
      getStats: async (userId: string) => {
        return await ipcRenderer.invoke('db:gamification:getStats', userId)
      },
      updateStats: async (userId: string, updates: any) => {
        return await ipcRenderer.invoke('db:gamification:updateStats', userId, updates)
      },
      getAchievements: async (userId: string) => {
        return await ipcRenderer.invoke('db:gamification:getAchievements', userId)
      },
      unlockAchievement: async (userId: string, achievementId: string, points: number) => {
        return await ipcRenderer.invoke('db:gamification:unlockAchievement', userId, achievementId, points)
      }
    },
    daily: {
      getStats: async (userId: string, date: string) => {
        return await ipcRenderer.invoke('db:daily:getStats', userId, date)
      },
      updateStats: async (userId: string, date: string, updates: any) => {
        return await ipcRenderer.invoke('db:daily:updateStats', userId, date, updates)
      }
    },
    user: {
      get: async (userId: string) => {
        return await ipcRenderer.invoke('db:user:get', userId)
      },
      upsert: async (user: any) => {
        return await ipcRenderer.invoke('db:user:upsert', user)
      }
    },
    sync: {
      all: async (userId: string) => {
        return await ipcRenderer.invoke('db:sync:all', userId)
      },
      status: async (userId: string) => {
        return await ipcRenderer.invoke('db:sync:status', userId)
      },
      onStatusChange: (callback: (status: any) => void) => {
        ipcRenderer.on('sync:status', (_event, status) => callback(status))
      }
    },
    offline: {
      stats: async (userId: string) => {
        return await ipcRenderer.invoke('db:offline:stats', userId)
      }
    }
  }
})

// Type definitions for TypeScript
export interface IElectronAPI {
  send: (channel: string, data?: any) => void
  receive: (channel: string, func: (...args: any[]) => void) => void
  invoke: (channel: string, data?: any) => Promise<any>
  removeAllListeners: (channel: string) => void
  secureStorage: {
    get: (key: string) => Promise<string | null>
    set: (key: string, value: string) => Promise<boolean>
    remove: (key: string) => Promise<boolean>
    clear: () => Promise<boolean>
  }
  notifications: {
    schedule: (type: string, data: any) => Promise<boolean>
    cancel: (type: string, userId: string) => Promise<boolean>
    test: () => Promise<boolean>
  }
  database: {
    topics: {
      getAll: (userId: string) => Promise<any[]>
      get: (id: string, userId: string) => Promise<any>
      create: (topic: any) => Promise<any>
      update: (id: string, updates: any, userId: string) => Promise<any>
      delete: (id: string, userId: string) => Promise<void>
    }
    items: {
      getAll: (userId: string, topicId?: string) => Promise<any[]>
      get: (id: string, userId: string) => Promise<any>
      create: (item: any) => Promise<any>
      update: (id: string, updates: any, userId: string) => Promise<any>
      delete: (id: string, userId: string) => Promise<void>
    }
    reviews: {
      create: (session: any) => Promise<any>
      getRecent: (userId: string, limit?: number) => Promise<any[]>
    }
    gamification: {
      getStats: (userId: string) => Promise<any>
      updateStats: (userId: string, updates: any) => Promise<any>
      getAchievements: (userId: string) => Promise<any[]>
      unlockAchievement: (userId: string, achievementId: string, points: number) => Promise<boolean>
    }
    daily: {
      getStats: (userId: string, date: string) => Promise<any>
      updateStats: (userId: string, date: string, updates: any) => Promise<void>
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
  }
}

declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}
