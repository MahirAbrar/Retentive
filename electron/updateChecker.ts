import { autoUpdater, dialog, shell } from 'electron'
import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

const isDev = process.env.NODE_ENV === 'development'

interface UpdateInfo {
  version: string
  releaseNotes?: string
  releaseDate?: string
}

class UpdateChecker {
  private currentVersion: string
  private updateCheckInterval: NodeJS.Timeout | null = null
  private mainWindow: Electron.BrowserWindow | null = null

  constructor() {
    this.currentVersion = app.getVersion()
  }

  setMainWindow(window: Electron.BrowserWindow) {
    this.mainWindow = window
  }

  // For GitHub Releases (Manual Check)
  async checkForUpdatesManually() {
    if (isDev) {
      console.log('Skipping update check in development')
      return
    }

    try {
      // Public releases repository (no source code)
      const GITHUB_REPO = 'MahirAbrar/Retentive-Releases'
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
        {
          headers: {
            'User-Agent': 'Retentive-App'
          }
        }
      )

      if (!response.ok) {
        console.error('Failed to check for updates')
        return
      }

      const release = await response.json()
      const latestVersion = release.tag_name.replace('v', '')

      if (this.isNewerVersion(latestVersion)) {
        this.notifyUserOfUpdate({
          version: latestVersion,
          releaseNotes: release.body,
          releaseDate: release.published_at,
          downloadUrl: release.html_url
        })
      }
    } catch (error) {
      console.error('Error checking for updates:', error)
    }
  }

  // Using electron-updater (Automatic Updates)
  setupAutoUpdater() {
    if (isDev) {
      console.log('Auto-updater disabled in development')
      return
    }

    // Set the feed URL for your update server
    // For GitHub Releases (public releases repo):
    const feedURL = `https://github.com/MahirAbrar/Retentive-Releases/releases/download/latest`

    try {
      autoUpdater.setFeedURL({
        url: feedURL,
        headers: {
          'User-Agent': 'Retentive-App'
        }
      })

      // Check for updates on startup
      autoUpdater.checkForUpdates()

      // Check every 4 hours
      this.updateCheckInterval = setInterval(() => {
        autoUpdater.checkForUpdates()
      }, 4 * 60 * 60 * 1000)

      // Event handlers
      autoUpdater.on('error', (error) => {
        console.error('Auto-updater error:', error)
        this.sendStatusToWindow('Update error: ' + error)
      })

      autoUpdater.on('checking-for-update', () => {
        console.log('Checking for updates...')
        this.sendStatusToWindow('Checking for updates...')
      })

      autoUpdater.on('update-available', () => {
        console.log('Update available')
        this.sendStatusToWindow('Update available, downloading...')
      })

      autoUpdater.on('update-not-available', () => {
        console.log('No updates available')
      })

      autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
        const dialogOpts: Electron.MessageBoxOptions = {
          type: 'info',
          buttons: ['Install & Restart', 'Later'],
          title: 'Update Available',
          message: process.platform === 'win32' ? releaseNotes : releaseName,
          detail: 'A new version has been downloaded. Restart the application to apply the updates.'
        }

        dialog.showMessageBox(dialogOpts).then((returnValue) => {
          if (returnValue.response === 0) {
            autoUpdater.quitAndInstall()
          }
        })
      })
    } catch (error) {
      console.error('Failed to setup auto-updater:', error)
    }
  }

  // Simple version check
  private isNewerVersion(latestVersion: string): boolean {
    const current = this.currentVersion.split('.').map(Number)
    const latest = latestVersion.split('.').map(Number)

    for (let i = 0; i < latest.length; i++) {
      if (latest[i] > (current[i] || 0)) return true
      if (latest[i] < (current[i] || 0)) return false
    }
    return false
  }

  // Notify user of available update
  private notifyUserOfUpdate(info: UpdateInfo & { downloadUrl?: string }) {
    const dialogOpts: Electron.MessageBoxOptions = {
      type: 'info',
      buttons: ['Download Update', 'Later'],
      title: 'Update Available',
      message: `Version ${info.version} is available!`,
      detail: info.releaseNotes || 'A new version of Retentive is available for download.'
    }

    dialog.showMessageBox(dialogOpts).then((returnValue) => {
      if (returnValue.response === 0 && info.downloadUrl) {
        // Open download page in browser
        shell.openExternal(info.downloadUrl)
      }
    })
  }

  // Send update status to renderer
  private sendStatusToWindow(text: string) {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('update-status', text)
    }
  }

  // In-app notification (non-intrusive)
  notifyInApp(message: string, type: 'info' | 'success' | 'error' = 'info') {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('update-notification', {
        message,
        type
      })
    }
  }

  // Clean up
  dispose() {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval)
    }
  }
}

export const updateChecker = new UpdateChecker()