create table if not exists responses (
  id text primary key,
  submitted_at timestamptz not null,
  name text not null,
  email text not null,
  test_type text not null check (test_type in ('turing', 'ranking')),
  is_final boolean not null default false,
  data jsonb not null
);

-- Migration: add is_final to existing tables
-- alter table responses add column if not exists is_final boolean not null default false;
