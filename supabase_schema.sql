-- BabyStock Supabase Schema
-- Supabase 대시보드 > SQL Editor에서 실행하세요

create table if not exists cubes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  category text not null default '기타',
  color_tag text not null default '#E8734A',
  quantity int not null default 0,
  warning_threshold int not null default 5,
  danger_threshold int not null default 2,
  grams_per_cube int not null default 30,
  expiry_date date,
  photo_url text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists consumption_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  cube_id uuid references cubes(id) on delete set null,
  cube_name text not null,
  quantity int not null,
  meal_time text not null check (meal_time in ('breakfast', 'lunch', 'dinner', 'snack')),
  logged_at timestamptz not null default now(),
  notes text,
  created_at timestamptz default now()
);

-- RLS 활성화
alter table cubes enable row level security;
alter table consumption_logs enable row level security;

-- 본인 데이터만 접근 가능
create policy "cubes_self" on cubes for all using (auth.uid() = user_id);
create policy "logs_self" on consumption_logs for all using (auth.uid() = user_id);

-- 재고 자동 갱신 트리거
create or replace function deduct_stock_on_log()
returns trigger language plpgsql as $$
begin
  update cubes
  set quantity = greatest(0, quantity - NEW.quantity),
      updated_at = now()
  where id = NEW.cube_id;
  return NEW;
end;
$$;

create trigger after_log_insert
  after insert on consumption_logs
  for each row execute function deduct_stock_on_log();
