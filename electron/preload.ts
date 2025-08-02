import { contextBridge, ipcRenderer } from 'electron'

const validChannels = {
  send: ['toMain', 'app:quit', 'app:minimize', 'app:maximize'],
  receive: ['fromMain', 'app:update-available', 'app:update-downloaded'],
  invoke: [
    'dialog:openFile', 
    'dialog:saveFile', 
    'app:version',
    'secureStorage:get',
    'secureStorage:set',
    'secureStorage:remove',
    'secureStorage:clear'
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
}

declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}
