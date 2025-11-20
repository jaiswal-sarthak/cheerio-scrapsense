-- Run this in Supabase SQL Editor to check if pending_tasks table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'pending_tasks'
) as table_exists;

-- If the result is 'false', you need to run the migration!
-- If the result is 'true', the table exists and you're good to go.
