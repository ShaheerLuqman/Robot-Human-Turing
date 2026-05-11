create table if not exists responses (
  id text primary key,
  submitted_at timestamptz not null,
  name text not null,
  email text not null,
  test_type text not null check (test_type in ('turing', 'ranking')),
  data jsonb not null
);
