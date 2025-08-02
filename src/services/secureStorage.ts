// Secure storage adapter for Electron
// Uses IPC to communicate with main process electron-store

interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
  removeItem: (key: string) => Promise<void>
}

class SecureStorageAdapter implements StorageAdapter {
  private isElectron: boolean

  constructor() {
    // Check if we're running in Electron
    this.isElectron = !!(window.electronAPI && window.electronAPI.secureStorage)
  }

  async getItem(key: string): Promise<string | null> {
    if (this.isElectron) {
      try {
        const value = await window.electronAPI.secureStorage.get(key)
        return value || null
      } catch (error) {
        console.error('Error getting from secure storage:', error)
        return null
      }
    } else {
      // Fallback to localStorage for web/development
      return localStorage.getItem(key)
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (this.isElectron) {
      try {
        await window.electronAPI.secureStorage.set(key, value)
      } catch (error) {
        console.error('Error setting secure storage:', error)
        throw error
      }
    } else {
      // Fallback to localStorage for web/development
      localStorage.setItem(key, value)
    }
  }

  async removeItem(key: string): Promise<void> {
    if (this.isElectron) {
      try {
        await window.electronAPI.secureStorage.remove(key)
      } catch (error) {
        console.error('Error removing from secure storage:', error)
        throw error
      }
    } else {
      // Fallback to localStorage for web/development
      localStorage.removeItem(key)
    }
  }

  async clear(): Promise<void> {
    if (this.isElectron) {
      try {
        await window.electronAPI.secureStorage.clear()
      } catch (error) {
        console.error('Error clearing secure storage:', error)
        throw error
      }
    } else {
      // Fallback to localStorage for web/development
      localStorage.clear()
    }
  }
}

export const secureStorage = new SecureStorageAdapter()