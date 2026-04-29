create table if not exists videos (
  id text primary key,
  url text not null,
  label text not null check (lower(trim(label)) in ('human', 'robot')),
  method text not null,
  environment text not null
);

create table if not exists responses (
  id text primary key,
  selected_video_id text not null references videos(id),
  human_video_id text not null references videos(id),
  robot_video_id text not null references videos(id),
  selected_label text not null check (selected_label in ('human', 'robot'))
);
