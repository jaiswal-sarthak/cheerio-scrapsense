-- Migration: Add pending_tasks table for task validation workflow
-- This allows users to review, edit, and approve tasks before activation

create table if not exists public.pending_tasks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users (id) on delete cascade,
    
    -- Task details
    url text not null,
    title text,
    instruction_text text not null,
    schedule_interval_hours int not null default 24,
    
    -- AI-generated data
    ai_generated_schema jsonb,
    parsed_instruction jsonb, -- NLP-parsed metadata (limits, filters, etc.)
    
    -- Validation results
    validation_status text not null default 'pending', -- pending, success, warning, error
    validation_errors jsonb default '[]'::jsonb,
    validation_warnings jsonb default '[]'::jsonb,
    ai_suggestions jsonb default '[]'::jsonb,
    
    -- Test scrape results
    test_results jsonb default '[]'::jsonb,
    test_result_count int default 0,
    
    -- Metadata
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    expires_at timestamptz not null default (now() + interval '24 hours')
);

-- Indexes
create index if not exists pending_tasks_user_idx on public.pending_tasks (user_id);
create index if not exists pending_tasks_created_idx on public.pending_tasks (created_at desc);
create index if not exists pending_tasks_expires_idx on public.pending_tasks (expires_at);

-- Enable RLS
alter table public.pending_tasks enable row level security;

-- RLS Policies
drop policy if exists "Users manage own pending tasks" on public.pending_tasks;

create policy "Users manage own pending tasks"
    on public.pending_tasks
    for all
    using (auth.uid()::text = user_id::text)
    with check (auth.uid()::text = user_id::text);

-- Auto-cleanup function for expired pending tasks
create or replace function cleanup_expired_pending_tasks()
returns void
language plpgsql
security definer
as $$
begin
    delete from public.pending_tasks
    where expires_at < now();
end;
$$;

-- Optional: Create a cron job to run cleanup (if using pg_cron extension)
-- SELECT cron.schedule('cleanup-pending-tasks', '0 * * * *', 'SELECT cleanup_expired_pending_tasks()');
