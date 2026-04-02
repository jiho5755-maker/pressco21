import "dotenv/config";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { pool } from "../src/db/client";
import { TaskPriority, TaskStatus } from "../src/domain/task";
import { buildSegmentHash } from "../src/lib/fingerprint";

type LegacyProject = {
  id: string;
  created_time: string;
  title: string;
  memo: string;
  para: string | null;
};

type LegacyCalendar = {
  id: string;
  created_time: string;
  title: string;
  date_start: string | null;
  weekday: string | null;
};

type LegacyTask = {
  id: string;
  created_time: string;
  title: string;
  status: string | null;
  time_start: string | null;
  due_start: string | null;
  memo: string;
  project_ids: string[];
  projects: LegacyProject[];
};

type LegacyDataset = {
  tasks: LegacyTask[];
  projects: LegacyProject[];
  calendars: LegacyCalendar[];
};

const sourceChannel = "legacy-notion-oracle";
const syntheticChannels = [
  "api-review",
  "browser-review",
  "demo-seed-sprint2",
  "verify-dashboard-sprint3",
  "verify-dedupe",
  "verify-review",
  "verify-sprint2",
] as const;

function expandHome(value: string) {
  return value.startsWith("~/") ? join(homedir(), value.slice(2)) : value;
}

function getOracleSshHost() {
  return process.env.ORACLE_SSH_HOST || "ubuntu@158.180.77.201";
}

function getOracleSshKey() {
  return expandHome(process.env.ORACLE_SSH_KEY || "~/.ssh/oracle-n8n.key");
}

function getLegacyCredentialId() {
  return process.env.LEGACY_NOTION_CREDENTIAL_ID || "3";
}

function getTaskDatabaseId() {
  return process.env.LEGACY_NOTION_TASK_DB_ID || "30bd119f-a669-81d0-8730-d824b7bc948c";
}

function getProjectDatabaseId() {
  return process.env.LEGACY_NOTION_PROJECT_DB_ID || "30bd119f-a669-81e2-a747-f9002c0a9910";
}

function getCalendarDatabaseId() {
  return process.env.LEGACY_NOTION_CALENDAR_DB_ID || "30bd119f-a669-812c-8bf4-fe603e6a8c6b";
}

function fetchLegacyDataset() {
  const remoteScript = `
set -euo pipefail
cd ~/n8n
docker compose exec -T n8n sh -lc 'node - <<"NODE"
const fs = require("fs");
const { execFileSync } = require("child_process");

const credentialId = ${JSON.stringify(getLegacyCredentialId())};
const taskDb = ${JSON.stringify(getTaskDatabaseId())};
const projectDb = ${JSON.stringify(getProjectDatabaseId())};
const calendarDb = ${JSON.stringify(getCalendarDatabaseId())};

execFileSync("n8n", ["export:credentials", "--id=" + credentialId, "--decrypted", "--output=/tmp/notion-cred.json"], {
  stdio: "ignore",
});

let credential = JSON.parse(fs.readFileSync("/tmp/notion-cred.json", "utf8"));
if (Array.isArray(credential)) {
  credential = credential[0];
}

const value = credential?.data?.value || "";
const token = value.startsWith("Bearer ") ? value.slice(7) : value;
const headers = {
  Authorization: "Bearer " + token,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
};

async function queryAll(databaseId) {
  const url = "https://api.notion.com/v1/databases/" + databaseId + "/query";
  const results = [];
  let payload = { page_size: 100 };

  while (true) {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Notion query failed: " + response.status + " " + (await response.text()));
    }

    const body = await response.json();
    results.push(...(body.results || []));

    if (!body.has_more) {
      break;
    }

    payload = { ...payload, start_cursor: body.next_cursor };
  }

  return results;
}

function readPlainText(items) {
  return (items || []).map((item) => item.plain_text || "").join("").trim();
}

async function main() {
  const [tasks, projects, calendars] = await Promise.all([queryAll(taskDb), queryAll(projectDb), queryAll(calendarDb)]);
  const projectMap = Object.fromEntries(
    projects.map((page) => [
      page.id,
      {
        id: page.id,
        created_time: page.created_time,
        title: readPlainText(page.properties?.["프로젝트"]?.title),
        memo: readPlainText(page.properties?.["메모"]?.rich_text),
        para: page.properties?.["PARA"]?.select?.name || null,
      },
    ]),
  );

  const rows = tasks.map((page) => {
    const properties = page.properties || {};
    const projectIds = (properties["프로젝트"]?.relation || []).map((item) => item.id);

    return {
      id: page.id,
      created_time: page.created_time,
      title: readPlainText(properties["할 일"]?.title),
      status: properties["상태"]?.status?.name || null,
      time_start: properties["시간 "]?.date?.start || null,
      due_start: properties["목표날짜"]?.date?.start || null,
      memo: readPlainText(properties["메모"]?.rich_text),
      project_ids: projectIds,
      projects: projectIds.map((id) => projectMap[id]).filter(Boolean),
    };
  });

  const projectRows = projects.map((page) => ({
    id: page.id,
    created_time: page.created_time,
    title: readPlainText(page.properties?.["프로젝트"]?.title),
    memo: readPlainText(page.properties?.["메모"]?.rich_text),
    para: page.properties?.["PARA"]?.select?.name || null,
  }));

  const calendarRows = calendars.map((page) => ({
    id: page.id,
    created_time: page.created_time,
    title: readPlainText(page.properties?.["이름"]?.title),
    date_start: page.properties?.["날짜"]?.date?.start || null,
    weekday: page.properties?.["요일"]?.formula?.string || null,
  }));

  process.stdout.write(JSON.stringify({ tasks: rows, projects: projectRows, calendars: calendarRows }));
}

main().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
NODE'
`;

  const output = execFileSync(
    "ssh",
    ["-i", getOracleSshKey(), "-o", "ConnectTimeout=10", getOracleSshHost(), "bash -s"],
    {
      input: remoteScript,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );

  return JSON.parse(output) as LegacyDataset;
}

function toTaskStatus(status: string | null): TaskStatus {
  switch (status) {
    case "진행 중":
    case "거의 완료":
    case "핀":
      return "in_progress";
    case "완료":
    case "Good":
      return "done";
    case "이후 완료":
      return "resolved";
    case "못함":
    case "Try":
    case "Problem":
      return "needs_check";
    case "취소":
      return "cancelled";
    default:
      return "todo";
  }
}

function toTaskPriority(task: LegacyTask): TaskPriority {
  if (task.status === "진행 중" || task.status === "핀") {
    return "p1";
  }

  if (task.time_start || task.due_start) {
    return "p2";
  }

  return "p3";
}

function toCatalogCategory(para: string | null | undefined) {
  const normalized = (para || "").toLowerCase();

  if (normalized.startsWith("p") || normalized.includes("project")) {
    return "project";
  }

  if (normalized.startsWith("a") || normalized.includes("area")) {
    return "area";
  }

  if (normalized.startsWith("r") || normalized.includes("resource")) {
    return "resource";
  }

  return "legacy";
}

function toTaskCategory(task: LegacyTask) {
  return toCatalogCategory(task.projects[0]?.para);
}

function toDueAt(task: LegacyTask) {
  const raw = task.time_start || task.due_start;
  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toCreatedAt(task: LegacyTask) {
  const parsed = new Date(task.created_time);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function buildSourceText(task: LegacyTask) {
  const lines = [
    `[legacy-notion-oracle] ${task.title}`,
    task.projects[0]?.title ? `project: ${task.projects[0].title}` : null,
    task.status ? `legacy_status: ${task.status}` : null,
    task.time_start ? `time_start: ${task.time_start}` : null,
    task.due_start ? `due_start: ${task.due_start}` : null,
    task.memo ? `memo: ${task.memo}` : null,
  ].filter((value): value is string => Boolean(value));

  return lines.join("\n");
}

async function cleanupSyntheticTasks() {
  const result = await pool.query("delete from tasks where source_channel = any($1::text[])", [syntheticChannels]);
  return result.rowCount ?? 0;
}

async function deleteStaleProjectCatalogs(activeIds: string[]) {
  const result = await pool.query(
    `
      delete from project_catalogs
      where source_channel = $1
        and not (source_message_id = any($2::text[]))
    `,
    [sourceChannel, activeIds],
  );

  return result.rowCount ?? 0;
}

async function deleteStaleCalendarCatalogs(activeIds: string[]) {
  const result = await pool.query(
    `
      delete from calendar_catalogs
      where source_channel = $1
        and not (source_message_id = any($2::text[]))
    `,
    [sourceChannel, activeIds],
  );

  return result.rowCount ?? 0;
}

async function deleteStaleLegacyTasks(activeIds: string[]) {
  const result = await pool.query(
    `
      delete from tasks
      where source_channel = $1
        and not (source_message_id = any($2::text[]))
    `,
    [sourceChannel, activeIds],
  );

  return result.rowCount ?? 0;
}

async function upsertLegacyProject(project: LegacyProject) {
  const createdAt = toCreatedAt({ created_time: project.created_time } as LegacyTask);

  await pool.query(
    `
      insert into project_catalogs (
        id,
        title,
        category,
        memo,
        source_channel,
        source_message_id,
        metadata,
        created_at,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, now())
      on conflict (source_channel, source_message_id)
      do update set
        title = excluded.title,
        category = excluded.category,
        memo = excluded.memo,
        metadata = excluded.metadata,
        updated_at = now()
    `,
    [
      project.id,
      project.title || "(제목 없음)",
      toCatalogCategory(project.para),
      project.memo || null,
      sourceChannel,
      project.id,
      JSON.stringify({
        importedFrom: "oracle-notion",
        importedAt: new Date().toISOString(),
        para: project.para,
      }),
      createdAt,
    ],
  );
}

async function upsertLegacyCalendar(calendar: LegacyCalendar) {
  const createdAt = toCreatedAt({ created_time: calendar.created_time } as LegacyTask);

  await pool.query(
    `
      insert into calendar_catalogs (
        id,
        title,
        calendar_date,
        weekday,
        source_channel,
        source_message_id,
        metadata,
        created_at,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, now())
      on conflict (source_channel, source_message_id)
      do update set
        title = excluded.title,
        calendar_date = excluded.calendar_date,
        weekday = excluded.weekday,
        metadata = excluded.metadata,
        updated_at = now()
    `,
    [
      calendar.id,
      calendar.title || "",
      calendar.date_start,
      calendar.weekday,
      sourceChannel,
      calendar.id,
      JSON.stringify({
        importedFrom: "oracle-notion",
        importedAt: new Date().toISOString(),
      }),
      createdAt,
    ],
  );
}

async function upsertLegacyTask(task: LegacyTask) {
  const project = task.projects[0] || null;
  const createdAt = toCreatedAt(task);
  const sourceText = buildSourceText(task);
  const segmentHash = buildSegmentHash(sourceChannel, task.id, "legacy-notion-page");

  await pool.query(
    `
      insert into tasks (
        id,
        title,
        details_json,
        status,
        priority,
        category,
        due_at,
        time_bucket,
        waiting_for,
        related_project,
        source_text,
        source_channel,
        source_message_id,
        segment_hash,
        segment_index,
        created_at,
        updated_at,
        ignored_at
      )
      values (
        $1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 0, $15, now(), null
      )
      on conflict (source_channel, source_message_id, segment_hash)
      do update set
        title = excluded.title,
        details_json = excluded.details_json,
        status = excluded.status,
        priority = excluded.priority,
        category = excluded.category,
        due_at = excluded.due_at,
        time_bucket = excluded.time_bucket,
        waiting_for = excluded.waiting_for,
        related_project = excluded.related_project,
        source_text = excluded.source_text,
        segment_index = excluded.segment_index,
        ignored_at = null,
        updated_at = now()
    `,
    [
      task.id,
      task.title,
      JSON.stringify({
        importedFrom: "oracle-notion",
        importedAt: new Date().toISOString(),
        legacyStatus: task.status,
        legacyProjectIds: task.project_ids,
        legacyProjects: task.projects,
        timeStart: task.time_start,
        dueStart: task.due_start,
      }),
      toTaskStatus(task.status),
      toTaskPriority(task),
      toTaskCategory(task),
      toDueAt(task),
      null,
      null,
      project?.title ?? null,
      sourceText,
      sourceChannel,
      task.id,
      segmentHash,
      createdAt,
    ],
  );
}

async function main() {
  const dataset = fetchLegacyDataset();
  const legacyTasks = dataset.tasks;

  if (legacyTasks.length === 0) {
    throw new Error("No legacy tasks found in Oracle Notion database");
  }

  const deletedSynthetic = await cleanupSyntheticTasks();

  for (const task of legacyTasks) {
    await upsertLegacyTask(task);
  }

  for (const project of dataset.projects) {
    await upsertLegacyProject(project);
  }

  for (const calendar of dataset.calendars) {
    await upsertLegacyCalendar(calendar);
  }

  const deletedStaleLegacy = await deleteStaleLegacyTasks(legacyTasks.map((task) => task.id));
  const deletedStaleProjects = await deleteStaleProjectCatalogs(dataset.projects.map((project) => project.id));
  const deletedStaleCalendars = await deleteStaleCalendarCatalogs(dataset.calendars.map((calendar) => calendar.id));

  const summary = await pool.query(
    `
      select bucket, count(*)::int as count
      from (
        select 'tasks'::text as bucket, source_channel, source_message_id
        from tasks
        where ignored_at is null
        union all
        select 'projects'::text as bucket, source_channel, source_message_id
        from project_catalogs
        union all
        select 'calendars'::text as bucket, source_channel, source_message_id
        from calendar_catalogs
      ) aggregated
      where source_channel = $1
      group by bucket
      order by bucket asc
    `,
    [sourceChannel],
  );

  console.log(
    JSON.stringify(
      {
        imported: legacyTasks.length,
        importedProjects: dataset.projects.length,
        importedCalendars: dataset.calendars.length,
        deletedSynthetic,
        deletedStaleLegacy,
        deletedStaleProjects,
        deletedStaleCalendars,
        sources: summary.rows,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("legacy-import-failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
