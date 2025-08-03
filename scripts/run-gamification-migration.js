import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Load environment variables
config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Initialize Supabase client with service role key
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please check your .env file.')
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  try {
    console.log('Running gamification migration...')
    
    // Read the migration file
    const migrationPath = join(__dirname, '..', 'supabase-migrations', 'add_gamification.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      console.log(`Executing statement ${i + 1}/${statements.length}...`)
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      
      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error)
        throw error
      }
    }
    
    console.log('✅ Migration completed successfully!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Note: This approach requires creating a stored procedure in Supabase first.
// Alternatively, you can use Supabase CLI or run the migration directly in the Supabase dashboard.

console.log(`
⚠️  Important: This script requires either:

1. Supabase CLI (recommended):
   supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

2. Manual execution:
   - Go to the Supabase Dashboard
   - Navigate to SQL Editor
   - Copy the contents of supabase-migrations/add_gamification.sql
   - Execute the query

3. Service role key in .env as SUPABASE_SERVICE_KEY (for this script)

For security reasons, option 1 or 2 is recommended.
`)

// Uncomment to run with service key (not recommended for production)
// runMigration()