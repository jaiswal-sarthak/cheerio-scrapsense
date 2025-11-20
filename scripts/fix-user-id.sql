-- Fix user_id mismatch for existing sites and instructions
-- This script updates all sites to use the current user's ID

-- Replace 'YOUR_CURRENT_USER_ID' with your actual user ID from the session
-- Current session user ID: 7b968f90-e807-4bb7-8b48-f1ebe2ad7117

-- Update all sites to use the correct user_id
UPDATE sites
SET user_id = '7b968f90-e807-4bb7-8b48-f1ebe2ad7117'
WHERE user_id = '1731c814-2747-416e-b5f0-6ba325496261';

-- Verify the update
SELECT id, url, title, user_id FROM sites;
