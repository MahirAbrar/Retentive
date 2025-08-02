# Row Level Security (RLS) Documentation for Retentive App

## What is Row Level Security?

Row Level Security (RLS) is a powerful feature in Supabase (PostgreSQL) that allows you to control access to rows in your database tables based on user context. Think of it as adding "WHERE" clauses automatically to every query based on who's making the request.

## Why Do We Need RLS?

Without RLS, any authenticated user could potentially:
- View other users' topics and learning items
- Modify or delete other users' data
- Access sensitive information from other accounts

RLS ensures that users can only access their own data, providing security at the database level.

## How RLS Works

1. **Policies as Guards**: Each policy acts as a guard that checks if a user can perform an action (SELECT, INSERT, UPDATE, DELETE) on specific rows.

2. **Automatic Enforcement**: Once enabled, RLS automatically applies to all queries - from your app, Supabase dashboard, or any direct database connection.

3. **User Context**: Policies have access to `auth.uid()` which identifies the current user making the request.

## Proposed RLS Policies for Retentive App

### 1. Topics Table

```sql
-- Enable RLS
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own topics
CREATE POLICY "Users can view own topics" ON topics
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can only insert topics for themselves
CREATE POLICY "Users can insert own topics" ON topics
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own topics
CREATE POLICY "Users can update own topics" ON topics
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own topics
CREATE POLICY "Users can delete own topics" ON topics
    FOR DELETE
    USING (auth.uid() = user_id);
```

**What this means**: 
- When a user queries topics, they'll only see topics where `user_id` matches their auth ID
- Users can't create topics for other users
- Users can't modify or delete other users' topics

### 2. Learning Items Table

```sql
-- Enable RLS
ALTER TABLE learning_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view learning items that belong to their topics
CREATE POLICY "Users can view own learning items" ON learning_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM topics 
            WHERE topics.id = learning_items.topic_id 
            AND topics.user_id = auth.uid()
        )
    );

-- Policy: Users can insert learning items only for their own topics
CREATE POLICY "Users can insert own learning items" ON learning_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM topics 
            WHERE topics.id = learning_items.topic_id 
            AND topics.user_id = auth.uid()
        )
    );

-- Policy: Users can update only their own learning items
CREATE POLICY "Users can update own learning items" ON learning_items
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM topics 
            WHERE topics.id = learning_items.topic_id 
            AND topics.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM topics 
            WHERE topics.id = learning_items.topic_id 
            AND topics.user_id = auth.uid()
        )
    );

-- Policy: Users can delete only their own learning items
CREATE POLICY "Users can delete own learning items" ON learning_items
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM topics 
            WHERE topics.id = learning_items.topic_id 
            AND topics.user_id = auth.uid()
        )
    );
```

**What this means**:
- Learning items don't have a direct `user_id` field
- We check ownership through the parent topic
- This maintains data integrity - if a user owns a topic, they own all its learning items

## Example Scenarios

### Scenario 1: User A tries to view all topics
```sql
-- Without RLS: Returns all topics from all users
SELECT * FROM topics;

-- With RLS: Automatically adds WHERE user_id = 'user-a-id'
-- Only returns User A's topics
```

### Scenario 2: User B tries to delete User A's topic
```sql
-- Without RLS: Would succeed
DELETE FROM topics WHERE id = 'user-a-topic-id';

-- With RLS: Fails silently (no rows affected)
-- The policy blocks the operation
```

### Scenario 3: User creates a learning item
```sql
-- The INSERT will only succeed if the topic_id belongs to a topic owned by the user
INSERT INTO learning_items (topic_id, content, ...) 
VALUES ('topic-123', 'Learn this', ...);
```

## Benefits of This Approach

1. **Database-Level Security**: Even if your application code has bugs, the database won't leak data
2. **Consistent Enforcement**: Works across all access methods (app, API, direct SQL)
3. **Performance**: PostgreSQL optimizes RLS policies efficiently
4. **Auditability**: All security rules are in one place

## Testing RLS Policies

After implementing RLS, you should test:

1. **Positive Tests**: Ensure users CAN access their own data
2. **Negative Tests**: Ensure users CANNOT access others' data
3. **Edge Cases**: Test with deleted users, null values, etc.

## Important Considerations

1. **Admin Access**: You might want to create special policies for admin users
2. **Performance**: Complex policies can impact query performance
3. **Debugging**: RLS can make debugging harder since queries silently filter results
4. **Migrations**: Always test RLS policies in a development environment first

## Implementation Steps

1. **Backup your data** before enabling RLS
2. **Enable RLS** on each table
3. **Create policies** for each operation (SELECT, INSERT, UPDATE, DELETE)
4. **Test thoroughly** with different user contexts
5. **Monitor performance** after deployment

## Troubleshooting

If users report missing data after enabling RLS:
1. Check if the policies are too restrictive
2. Verify the user's auth token is valid
3. Test the queries with the user's ID in Supabase SQL editor
4. Check for any NULL user_id values in existing data

## Next Steps

Once you understand these policies, we can:
1. Implement them in your Supabase project
2. Add more sophisticated policies (e.g., sharing features)
3. Create admin-only policies if needed
4. Add performance indexes to support the RLS queries