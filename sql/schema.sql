create table if not exists videos (
  id text primary key,
  url text not null,
  label text not null check (label in ('human', 'robot'))
);

create table if not exists responses (
  id text primary key,
  video_id text not null references videos(id),
  selected_label text not null check (selected_label in ('human', 'robot'))
);
