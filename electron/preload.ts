import { contextBridge, ipcRenderer } from 'electron';

const validChannels = {
  send: ['toMain', 'app:quit', 'app:minimize', 'app:maximize'],
  receive: ['fromMain', 'app:update-available', 'app:update-downloaded'],
  invoke: ['dialog:openFile', 'dialog:saveFile', 'app:version']
};

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel: string, data?: any) => {
    if (validChannels.send.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel: string, func: (...args: any[]) => void) => {
    if (validChannels.receive.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  invoke: async (channel: string, data?: any) => {
    if (validChannels.invoke.includes(channel)) {
      return await ipcRenderer.invoke(channel, data);
    }
  },
  removeAllListeners: (channel: string) => {
    if (validChannels.receive.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  }
});

// Type definitions for TypeScript
export interface IElectronAPI {
  send: (channel: string, data?: any) => void;
  receive: (channel: string, func: (...args: any[]) => void) => void;
  invoke: (channel: string, data?: any) => Promise<any>;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}