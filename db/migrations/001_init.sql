create table if not exists projects (
  id uuid primary key,
  public_slug varchar(16) not null unique,
  status varchar(16) not null check (status in ('draft', 'published', 'archived')),
  edit_secret_hash char(64) not null unique,
  recovery_code_hash char(64) not null unique,
  draft_config jsonb not null,
  draft_version integer not null default 1,
  published_revision_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_revisions (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  revision_number integer not null,
  config jsonb not null,
  created_at timestamptz not null default now(),
  unique (project_id, revision_number)
);

create table if not exists assets (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  kind varchar(16) not null check (kind in ('photo', 'music')),
  object_key text not null unique,
  mime_type varchar(96) not null,
  byte_size integer not null,
  width integer,
  height integer,
  sha256 char(64) not null,
  status varchar(16) not null check (status in ('ready', 'deleted')),
  created_at timestamptz not null default now()
);

create index if not exists assets_project_status_idx
  on assets(project_id, status, created_at);

create table if not exists edit_sessions (
  token_hash char(64) primary key,
  project_id uuid not null references projects(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create index if not exists edit_sessions_project_idx on edit_sessions(project_id);
create index if not exists edit_sessions_expiry_idx on edit_sessions(expires_at);
