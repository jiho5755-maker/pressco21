-- OM-SLA-01
-- 목적:
-- 1) NocoDB에서 바로 관리 가능한 오픈마켓 문의 SLA 테이블 기초 구조를 만든다.
-- 2) 문의 중복 방지, SLA 단계 계산, 담당자 라우팅, 알림 이력 중복 방지를 위한 운영 필드를 포함한다.
-- 3) Phase 1 상세 설계의 om_channel_policy / om_agent_routing / om_inquiry_queue를 실제 생성 가능한 Postgres DDL로 내린다.

begin;

create or replace function om_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new."UpdatedAt" = now();
  return new;
end;
$$;

create table if not exists om_channel_policy (
  id bigserial primary key,
  channel_name text not null unique,
  inquiry_sla_hours integer not null check (inquiry_sla_hours > 0),
  warn_50_enabled boolean not null default true,
  warn_80_enabled boolean not null default true,
  breach_enabled boolean not null default true,
  business_hour_start time,
  business_hour_end time,
  holiday_policy text not null default 'CALENDAR_HOURS'
    check (holiday_policy in ('CALENDAR_HOURS', 'BUSINESS_HOURS', 'WEEKDAY_BUSINESS_HOURS')),
  timezone_name text not null default 'Asia/Seoul',
  default_assignee_name text,
  default_assignee_chat_id text,
  default_escalation_name text,
  default_escalation_chat_id text,
  active boolean not null default true,
  memo text,
  "CreatedAt" timestamptz not null default now(),
  "UpdatedAt" timestamptz not null default now()
);

create table if not exists om_agent_routing (
  id bigserial primary key,
  channel_name text not null,
  inquiry_type text not null,
  keyword_rule text,
  priority_rank integer not null default 100,
  assignee_name text not null,
  assignee_telegram_chat_id text,
  escalation_name text,
  escalation_telegram_chat_id text,
  active boolean not null default true,
  memo text,
  "CreatedAt" timestamptz not null default now(),
  "UpdatedAt" timestamptz not null default now(),
  constraint om_agent_routing_unique_rule unique (channel_name, inquiry_type, priority_rank)
);

create table if not exists om_inquiry_queue (
  id bigserial primary key,
  inquiry_uid text not null unique,
  external_inquiry_id text not null,
  thread_key text not null,
  channel_name text not null,
  external_status text not null default 'OPEN',
  order_id text,
  sku_id text,
  product_name text,
  customer_name text,
  customer_masked_phone text,
  inquiry_type text not null default 'etc',
  subject text,
  body text not null,
  received_at timestamptz not null,
  due_at timestamptz not null,
  first_response_at timestamptz,
  closed_at timestamptz,
  sla_status text not null default 'OK'
    check (sla_status in ('OK', 'WARNING_50', 'WARNING_80', 'BREACH', 'CLOSED')),
  sla_progress_rate numeric(5,2) not null default 0,
  last_alert_stage text not null default 'NEW'
    check (last_alert_stage in ('NEW', 'WARNING_50', 'WARNING_80', 'BREACH', 'CLOSED')),
  assigned_to text,
  assignee_telegram_chat_id text,
  escalation_name text,
  escalation_telegram_chat_id text,
  channel_url text,
  first_warning_sent_at timestamptz,
  final_warning_sent_at timestamptz,
  breach_notified_at timestamptz,
  last_polled_at timestamptz,
  routing_version text,
  error_message text,
  source_payload_json jsonb not null default '{}'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb,
  "CreatedAt" timestamptz not null default now(),
  "UpdatedAt" timestamptz not null default now()
);

create index if not exists om_agent_routing_lookup_idx
  on om_agent_routing (channel_name, inquiry_type, active, priority_rank);

create index if not exists om_inquiry_queue_status_due_idx
  on om_inquiry_queue (sla_status, due_at);

create index if not exists om_inquiry_queue_channel_received_idx
  on om_inquiry_queue (channel_name, received_at desc);

create index if not exists om_inquiry_queue_assignee_status_idx
  on om_inquiry_queue (assigned_to, sla_status, due_at);

create index if not exists om_inquiry_queue_thread_idx
  on om_inquiry_queue (thread_key);

create index if not exists om_inquiry_queue_last_polled_idx
  on om_inquiry_queue (last_polled_at desc);

drop trigger if exists om_channel_policy_set_updated_at on om_channel_policy;
create trigger om_channel_policy_set_updated_at
before update on om_channel_policy
for each row
execute function om_set_updated_at();

drop trigger if exists om_agent_routing_set_updated_at on om_agent_routing;
create trigger om_agent_routing_set_updated_at
before update on om_agent_routing
for each row
execute function om_set_updated_at();

drop trigger if exists om_inquiry_queue_set_updated_at on om_inquiry_queue;
create trigger om_inquiry_queue_set_updated_at
before update on om_inquiry_queue
for each row
execute function om_set_updated_at();

comment on table om_channel_policy is '오픈마켓 채널별 문의 SLA 정책';
comment on table om_agent_routing is '문의 유형별 담당자/에스컬레이션 라우팅';
comment on table om_inquiry_queue is '문의 수집, SLA 단계, 담당자, 알림 시각을 관리하는 운영 큐';

comment on column om_channel_policy.holiday_policy is 'CALENDAR_HOURS, BUSINESS_HOURS, WEEKDAY_BUSINESS_HOURS';
comment on column om_agent_routing.keyword_rule is '정규식 또는 contains 키워드 문자열. 비어 있으면 inquiry_type만으로 매칭';
comment on column om_inquiry_queue.last_alert_stage is '중복 알림 방지용 마지막 알림 단계';
comment on column om_inquiry_queue.source_payload_json is '채널 원본 응답 보관';
comment on column om_inquiry_queue.metadata_json is '보조 메타데이터. adapter_version, channel flags, link info 등';

insert into om_channel_policy (
  channel_name,
  inquiry_sla_hours,
  warn_50_enabled,
  warn_80_enabled,
  breach_enabled,
  business_hour_start,
  business_hour_end,
  holiday_policy,
  timezone_name,
  default_assignee_name,
  default_assignee_chat_id,
  default_escalation_name,
  default_escalation_chat_id,
  active,
  memo
) values
  ('smartstore', 24, true, true, true, '09:00', '18:00', 'CALENDAR_HOURS', 'Asia/Seoul', '이재혁', null, '장지호', null, true, '문의 SLA 우선 감시 채널'),
  ('coupang',    24, true, true, true, '09:00', '18:00', 'CALENDAR_HOURS', 'Asia/Seoul', '이재혁', null, '장지호', null, true, '문의 SLA 우선 감시 채널'),
  ('11st',       24, true, true, true, '09:00', '18:00', 'CALENDAR_HOURS', 'Asia/Seoul', '이재혁', null, '장지호', null, true, '보완 채널'),
  ('makeshop',   24, true, true, true, '09:00', '18:00', 'CALENDAR_HOURS', 'Asia/Seoul', '이재혁', null, '장지호', null, true, '자사몰 문의')
on conflict (channel_name) do update
set
  inquiry_sla_hours = excluded.inquiry_sla_hours,
  warn_50_enabled = excluded.warn_50_enabled,
  warn_80_enabled = excluded.warn_80_enabled,
  breach_enabled = excluded.breach_enabled,
  business_hour_start = excluded.business_hour_start,
  business_hour_end = excluded.business_hour_end,
  holiday_policy = excluded.holiday_policy,
  timezone_name = excluded.timezone_name,
  default_assignee_name = excluded.default_assignee_name,
  default_assignee_chat_id = excluded.default_assignee_chat_id,
  default_escalation_name = excluded.default_escalation_name,
  default_escalation_chat_id = excluded.default_escalation_chat_id,
  active = excluded.active,
  memo = excluded.memo;

insert into om_agent_routing (
  channel_name,
  inquiry_type,
  keyword_rule,
  priority_rank,
  assignee_name,
  assignee_telegram_chat_id,
  escalation_name,
  escalation_telegram_chat_id,
  active,
  memo
) values
  ('smartstore', 'delivery', null, 10, '이재혁', null, '장지호', null, true, '배송 기본 라우팅'),
  ('smartstore', 'stock', null, 20, '이재혁', null, '장지호', null, true, '재고/입고 문의'),
  ('smartstore', 'usage', null, 30, '이재혁', null, '대표', null, true, '사용법 문의는 2차 에스컬레이션이 강함'),
  ('smartstore', 'return', null, 40, '이재혁', null, '장지호', null, true, '반품/교환'),
  ('smartstore', 'etc', null, 99, '이재혁', null, '장지호', null, true, '기본 fallback'),
  ('coupang', 'delivery', null, 10, '이재혁', null, '장지호', null, true, '배송 기본 라우팅'),
  ('coupang', 'stock', null, 20, '이재혁', null, '장지호', null, true, '재고/입고 문의'),
  ('coupang', 'usage', null, 30, '이재혁', null, '대표', null, true, '사용법 문의'),
  ('coupang', 'return', null, 40, '이재혁', null, '장지호', null, true, '반품/교환'),
  ('coupang', 'etc', null, 99, '이재혁', null, '장지호', null, true, '기본 fallback'),
  ('11st', 'etc', null, 99, '이재혁', null, '장지호', null, true, '초기 단순 라우팅'),
  ('makeshop', 'etc', null, 99, '이재혁', null, '장지호', null, true, '초기 단순 라우팅')
on conflict (channel_name, inquiry_type, priority_rank) do update
set
  keyword_rule = excluded.keyword_rule,
  assignee_name = excluded.assignee_name,
  assignee_telegram_chat_id = excluded.assignee_telegram_chat_id,
  escalation_name = excluded.escalation_name,
  escalation_telegram_chat_id = excluded.escalation_telegram_chat_id,
  active = excluded.active,
  memo = excluded.memo;

commit;
