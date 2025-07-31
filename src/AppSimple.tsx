import './App.css'

export default function AppSimple() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1 className="h1">Retentive</h1>
      <p className="body-large">App is working! The import issue is being fixed.</p>
      
      <div style={{ marginTop: '2rem' }}>
        <h2 className="h3">Next Steps:</h2>
        <ul>
          <li>Fix the module import issues</li>
          <li>Get authentication working</li>
          <li>Start learning!</li>
        </ul>
      </div>
    </div>
  )
}