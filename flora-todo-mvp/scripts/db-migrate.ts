import "dotenv/config";
import { pool } from "../src/db/client";

const statements = [
  `
    create table if not exists tasks (
      id text primary key,
      title text not null,
      details_json jsonb not null default '{}'::jsonb,
      status text not null default 'todo',
      priority text not null default 'p3',
      category text not null default 'inbox',
      due_at timestamp with time zone,
      time_bucket text,
      waiting_for text,
      related_project text,
      source_text text not null,
      source_channel text not null,
      source_message_id text not null,
      segment_hash text not null default '',
      segment_index integer not null default 0,
      reviewed_at timestamp with time zone,
      ignored_at timestamp with time zone,
      created_at timestamp with time zone not null default now(),
      updated_at timestamp with time zone not null default now()
    )
  `,
  `
    create table if not exists reminders (
      id text primary key,
      task_id text not null references tasks(id) on delete cascade,
      signature text not null default '',
      title text not null,
      remind_at timestamp with time zone not null,
      kind text not null default 'manual',
      message text,
      status text not null default 'pending',
      created_at timestamp with time zone not null default now(),
      updated_at timestamp with time zone not null default now()
    )
  `,
  `
    create table if not exists followups (
      id text primary key,
      task_id text not null references tasks(id) on delete cascade,
      signature text not null default '',
      subject text not null,
      followup_type text not null default 'manual',
      waiting_for text,
      next_check_at timestamp with time zone,
      status text not null default 'open',
      last_note text,
      created_at timestamp with time zone not null default now(),
      updated_at timestamp with time zone not null default now()
    )
  `,
  `
    create table if not exists project_catalogs (
      id text primary key,
      title text not null,
      category text not null default 'legacy',
      memo text,
      source_channel text not null,
      source_message_id text not null,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamp with time zone not null default now(),
      updated_at timestamp with time zone not null default now()
    )
  `,
  `
    create table if not exists calendar_catalogs (
      id text primary key,
      title text not null default '',
      calendar_date text,
      weekday text,
      source_channel text not null,
      source_message_id text not null,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamp with time zone not null default now(),
      updated_at timestamp with time zone not null default now()
    )
  `,
  `
    create table if not exists source_messages (
      id text primary key,
      source_channel text not null,
      source_message_id text not null,
      user_chat_id text,
      user_name text not null default '',
      agent_id text not null default 'owner',
      message_text text not null,
      response_summary text,
      model_used text not null default 'unknown',
      skill_triggered text not null default 'general',
      tokens_used integer not null default 0,
      response_time_ms integer not null default 0,
      source_created_at timestamp with time zone,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamp with time zone not null default now(),
      updated_at timestamp with time zone not null default now()
    )
  `,
  `alter table tasks alter column priority set default 'p3'`,
  `alter table tasks add column if not exists segment_hash text not null default ''`,
  `alter table tasks add column if not exists segment_index integer not null default 0`,
  `alter table tasks add column if not exists reviewed_at timestamp with time zone`,
  `alter table tasks add column if not exists ignored_at timestamp with time zone`,
  `alter table reminders add column if not exists signature text not null default ''`,
  `alter table followups add column if not exists signature text not null default ''`,
  `alter table source_messages add column if not exists user_chat_id text`,
  `alter table source_messages add column if not exists user_name text not null default ''`,
  `alter table source_messages add column if not exists agent_id text not null default 'owner'`,
  `alter table source_messages add column if not exists response_summary text`,
  `alter table source_messages add column if not exists model_used text not null default 'unknown'`,
  `alter table source_messages add column if not exists skill_triggered text not null default 'general'`,
  `alter table source_messages add column if not exists tokens_used integer not null default 0`,
  `alter table source_messages add column if not exists response_time_ms integer not null default 0`,
  `alter table source_messages add column if not exists source_created_at timestamp with time zone`,
  `alter table source_messages add column if not exists metadata jsonb not null default '{}'::jsonb`,
  `
    update tasks
    set priority = 'p3'
    where priority is null or priority in ('', 'normal')
  `,
  `
    with ranked as (
      select
        id,
        row_number() over (
          partition by source_channel, source_message_id
          order by created_at, id
        ) - 1 as next_segment_index
      from tasks
    )
    update tasks
    set segment_index = ranked.next_segment_index
    from ranked
    where tasks.id = ranked.id
      and (tasks.segment_index is null or tasks.segment_index = 0)
  `,
  `
    update tasks
    set segment_hash = md5(
      concat_ws(
        '|',
        coalesce(source_channel, ''),
        coalesce(source_message_id, ''),
        coalesce(source_text, title, ''),
        coalesce(segment_index::text, '0'),
        id
      )
    )
    where segment_hash is null or segment_hash = ''
  `,
  `
    update reminders
    set signature = md5(
      concat_ws(
        '|',
        coalesce(title, ''),
        coalesce(remind_at::text, ''),
        coalesce(kind, ''),
        coalesce(message, ''),
        id
      )
    )
    where signature is null or signature = ''
  `,
  `
    update followups
    set signature = md5(
      concat_ws(
        '|',
        coalesce(subject, ''),
        coalesce(followup_type, ''),
        coalesce(waiting_for, ''),
        coalesce(next_check_at::text, ''),
        coalesce(status, ''),
        id
      )
    )
    where signature is null or signature = ''
  `,
  `
    create unique index if not exists tasks_source_message_segment_unique
    on tasks (source_channel, source_message_id, segment_hash)
  `,
  `
    create unique index if not exists reminders_task_signature_unique
    on reminders (task_id, signature)
  `,
  `
    create unique index if not exists followups_task_signature_unique
    on followups (task_id, signature)
  `,
  `
    create unique index if not exists project_catalogs_source_unique
    on project_catalogs (source_channel, source_message_id)
  `,
  `
    create unique index if not exists calendar_catalogs_source_unique
    on calendar_catalogs (source_channel, source_message_id)
  `,
  `
    create unique index if not exists source_messages_source_unique
    on source_messages (source_channel, source_message_id)
  `,
  `alter table tasks add column if not exists assignee text`,
  `
    create table if not exists staff (
      id text primary key,
      name text not null unique,
      telegram_user_id text unique,
      role text not null default 'staff',
      created_at timestamp with time zone not null default now(),
      updated_at timestamp with time zone not null default now()
    )
  `,
  `
    create table if not exists comments (
      id text primary key,
      task_id text not null references tasks(id) on delete cascade,
      author_name text not null,
      content text not null,
      created_at timestamp with time zone not null default now()
    )
  `,
  `
    create index if not exists comments_task_id_created_at_idx
    on comments (task_id, created_at)
  `,
  `
    insert into staff (id, name, role) values
      ('staff-jiho', '장지호', 'admin'),
      ('staff-jaehyuk', '이재혁', 'staff'),
      ('staff-seunghae', '조승해', 'staff'),
      ('staff-wj', '원장님', 'admin'),
      ('staff-dagyeong', '장다경', 'staff')
    on conflict (id) do nothing
  `,
];

async function main() {
  const client = await pool.connect();

  try {
    await client.query("begin");

    for (const statement of statements) {
      await client.query(statement);
    }

    await client.query("commit");
    console.log("db-migrated", statements.length);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error("db-migrate-failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
