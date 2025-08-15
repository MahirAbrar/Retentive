import { logger } from '../../utils/logger'
import { useState } from 'react'
import { Button, Card, CardHeader, CardContent, useToast, ConfirmDialog } from '../ui'
import { useAuth } from '../../hooks/useAuthFixed'
import { exportUserData, downloadJSON, validateImportData, type ExportData } from '../../utils/dataExport'
import { importUserData, readJSONFile } from '../../utils/dataImport'

export function DataManagement() {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const [importData, setImportData] = useState<ExportData | null>(null)
  const [mergeStrategy, setMergeStrategy] = useState<'merge' | 'replace'>('merge')
  const { user } = useAuth()
  const { addToast } = useToast()

  const handleExport = async () => {
    if (!user) return

    setExporting(true)
    try {
      const data = await exportUserData(user.id)
      const filename = `retentive-export-${new Date().toISOString().split('T')[0]}.json`
      downloadJSON(data, filename)
      addToast('success', `Exported ${data.topics.length} topics and ${data.learningItems.length} items`)
    } catch (error) {
      addToast('error', 'Failed to export data')
      logger.error('Export error:', error)
    } finally {
      setExporting(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const data = await readJSONFile(file)
      
      if (!validateImportData(data)) {
        addToast('error', 'Invalid import file format')
        return
      }

      setImportData(data)
      setShowImportConfirm(true)
    } catch {
      addToast('error', 'Failed to read import file')
    }
  }

  const handleImport = async () => {
    if (!user || !importData) return

    setImporting(true)
    setShowImportConfirm(false)

    try {
      const result = await importUserData(importData, user.id, mergeStrategy)
      
      if (result.success) {
        addToast('success', `Imported ${result.topicsImported} topics and ${result.itemsImported} items`)
        // Reload the page to show new data
        window.location.reload()
      } else {
        addToast('warning', `Import completed with ${result.errors.length} errors`)
        result.errors.forEach(error => logger.error(error))
      }
    } catch (error) {
      addToast('error', 'Import failed')
      logger.error('Import error:', error)
    } finally {
      setImporting(false)
      setImportData(null)
    }
  }

  return (
    <Card variant="bordered">
      <CardHeader>
        <h3 className="h4">Data Management</h3>
      </CardHeader>
      <CardContent>
        <div style={{ display: 'grid', gap: '2rem' }}>
          {/* Export Section */}
          <div>
            <h4 className="h5" style={{ marginBottom: '0.5rem' }}>Export Data</h4>
            <p className="body-small text-secondary" style={{ marginBottom: '1rem' }}>
              Download all your topics and learning items as a JSON file
            </p>
            <Button
              variant="secondary"
              onClick={handleExport}
              loading={exporting}
              disabled={exporting}
            >
              Export Data
            </Button>
          </div>

          {/* Import Section */}
          <div>
            <h4 className="h5" style={{ marginBottom: '0.5rem' }}>Import Data</h4>
            <p className="body-small text-secondary" style={{ marginBottom: '1rem' }}>
              Import topics and learning items from a JSON file
            </p>
            
            <div style={{ marginBottom: '1rem' }}>
              <fieldset style={{ border: 'none', padding: 0 }}>
                <legend className="body-small" style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Import Strategy:
                </legend>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="radio"
                      name="mergeStrategy"
                      value="merge"
                      checked={mergeStrategy === 'merge'}
                      onChange={(e) => setMergeStrategy(e.target.value as 'merge' | 'replace')}
                  />
                  <span className="body-small">Merge with existing data</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    name="mergeStrategy"
                    value="replace"
                    checked={mergeStrategy === 'replace'}
                    onChange={(e) => setMergeStrategy(e.target.value as 'merge' | 'replace')}
                  />
                  <span className="body-small">Replace all data</span>
                  </label>
                </div>
              </fieldset>
            </div>

            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="import-file-input"
              disabled={importing}
            />
            <label htmlFor="import-file-input">
              <Button
                variant="secondary"
                as="span"
                loading={importing}
                disabled={importing}
              >
                Choose File
              </Button>
            </label>
          </div>
        </div>
      </CardContent>

      {/* Import Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showImportConfirm}
        onClose={() => {
          setShowImportConfirm(false)
          setImportData(null)
        }}
        onConfirm={handleImport}
        title="Import Data"
        message={
          importData
            ? `Import ${importData.topics.length} topics and ${importData.learningItems.length} items? ${
                mergeStrategy === 'replace'
                  ? 'This will delete all existing data!'
                  : 'This will be merged with existing data.'
              }`
            : ''
        }
        confirmText="Import"
        variant={mergeStrategy === 'replace' ? 'danger' : 'info'}
      />
    </Card>
  )
}