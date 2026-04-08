#!/usr/bin/env node

const { spawn } = require("node:child_process");
const { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { delimiter, dirname, join, resolve } = require("node:path");
const { randomUUID } = require("node:crypto");
const process = require("node:process");

const DEFAULT_CONFIG_PATH = resolve(process.cwd(), "04_reference_json/flora-telegram-room-router.config.json");
const DEFAULT_CHUNK_SIZE = 3500;
const DEFAULT_LONG_POLL_SECONDS = 20;
const DEFAULT_POLL_INTERVAL_MS = 1500;
const DEFAULT_TIMEOUT_MS = 20 * 60 * 1000;

function usage() {
  process.stdout.write(
    [
      "Usage: node 06_scripts/run-flora-telegram-room-router.js [options]",
      "",
      "Options:",
      "  --config <path>     Router config JSON path",
      "  --once              Read pending Telegram updates once and exit",
      "  --healthcheck       Validate config and probe Telegram bot token",
      "  --help              Show this message",
      "",
      "Telegram commands:",
      "  /help",
      "  /rooms",
      "  /register <room> <code>",
      "  /status",
      "  /session",
      "  /new",
      "  /run <prompt>",
      "  <plain text>",
      ""
    ].join("\n"),
  );
}

function parseArgs(argv) {
  const options = {
    configPath: DEFAULT_CONFIG_PATH,
    once: false,
    healthcheck: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--config") {
      options.configPath = resolve(argv[index + 1]);
      index += 1;
    } else if (arg === "--once") {
      options.once = true;
    } else if (arg === "--healthcheck") {
      options.healthcheck = true;
    } else if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function ensureDir(targetPath) {
  mkdirSync(dirname(targetPath), { recursive: true });
}

function readJsonFile(targetPath, fallbackValue) {
  if (!existsSync(targetPath)) {
    return fallbackValue;
  }
  return JSON.parse(readFileSync(targetPath, "utf-8"));
}

function writeJsonFile(targetPath, payload) {
  ensureDir(targetPath);
  writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}

function appendLog(config, message, extra = null) {
  if (!config.logPath) {
    return;
  }
  const line = {
    at: new Date().toISOString(),
    message
  };
  if (extra) {
    line.extra = extra;
  }
  ensureDir(config.logPath);
  appendFileSync(config.logPath, `${JSON.stringify(line)}\n`, "utf-8");
}

function resolveEnvOrLiteral(literalValue, envName, allowEmpty = false) {
  if (literalValue) {
    return String(literalValue);
  }
  if (envName) {
    const envValue = process.env[envName];
    if (envValue) {
      return String(envValue);
    }
  }
  if (allowEmpty) {
    return "";
  }
  throw new Error(`Missing required value. Set ${envName || "the configured literal value"}.`);
}

function resolvePathFrom(baseDir, targetPath) {
  return resolve(baseDir, targetPath || ".");
}

function expandHomePath(targetPath) {
  const value = String(targetPath || "").trim();
  if (!value) {
    return value;
  }
  if (value === "~") {
    return process.env.HOME || value;
  }
  if (value.startsWith("~/")) {
    return join(process.env.HOME || "~", value.slice(2));
  }
  return value;
}

function resolveBinaryPath(binaryPath, fallbackCandidates = []) {
  const requested = expandHomePath(binaryPath);
  if (!requested) {
    throw new Error("Binary path is required.");
  }

  if (requested.includes("/")) {
    return resolve(requested);
  }

  const pathEntries = String(process.env.PATH || "")
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const entry of pathEntries) {
    const candidate = join(entry, requested);
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  for (const fallbackCandidate of fallbackCandidates) {
    const expanded = expandHomePath(fallbackCandidate);
    if (expanded && existsSync(expanded)) {
      return expanded;
    }
  }

  return requested;
}

function toStringArray(values) {
  return Array.isArray(values) ? values.map((value) => String(value)) : [];
}

function loadConfig(configPath) {
  const rawConfig = readJsonFile(configPath, null);
  if (!rawConfig) {
    throw new Error(`Config not found: ${configPath}`);
  }

  const configDir = dirname(configPath);
  const config = {
    bridgeName: rawConfig.bridgeName || "flora-telegram-room-router",
    botUsername: rawConfig.botUsername || "",
    botToken: resolveEnvOrLiteral(rawConfig.botToken, rawConfig.botTokenEnv),
    registrationCode: resolveEnvOrLiteral(rawConfig.registrationCode, rawConfig.registrationCodeEnv),
    statePath: resolvePathFrom(configDir, rawConfig.statePath || "../07_openclaw_workspace/flora-room-router/state.json"),
    logPath: resolvePathFrom(configDir, rawConfig.logPath || "../07_openclaw_workspace/flora-room-router/router.log"),
    chunkSize: Number(rawConfig.chunkSize || DEFAULT_CHUNK_SIZE),
    pollIntervalMs: Number(rawConfig.pollIntervalMs || DEFAULT_POLL_INTERVAL_MS),
    longPollSeconds: Number(rawConfig.longPollSeconds || DEFAULT_LONG_POLL_SECONDS),
    allowPrimaryBotReuse: rawConfig.allowPrimaryBotReuse === true,
    rooms: {}
  };

  const rooms = rawConfig.rooms || {};
  for (const [roomKey, roomValue] of Object.entries(rooms)) {
    config.rooms[roomKey] = normalizeRoomConfig(configDir, roomKey, roomValue);
  }

  validateConfig(config);
  return config;
}

function normalizeRoomConfig(configDir, roomKey, roomValue) {
  const runner = String(roomValue.runner || "").trim();
  const roomConfig = {
    roomKey,
    displayName: roomValue.displayName || roomKey,
    runner,
    workingDirectory: resolvePathFrom(configDir, roomValue.workingDirectory || process.cwd()),
    promptPreamble: roomValue.promptPreamble || "",
    codex: {
      binaryPath: resolveBinaryPath(roomValue.codex?.binaryPath || "codex", [
        "/Applications/Codex.app/Contents/Resources/codex"
      ]),
      executionMode: roomValue.codex?.executionMode || "full-auto",
      model: roomValue.codex?.model || "",
      profile: roomValue.codex?.profile || "",
      timeoutMs: Number(roomValue.codex?.timeoutMs || DEFAULT_TIMEOUT_MS),
      extraArgs: toStringArray(roomValue.codex?.extraArgs || [])
    },
    claude: {
      binaryPath: resolveBinaryPath(roomValue.claude?.binaryPath || "claude", [
        "~/.local/bin/claude"
      ]),
      model: roomValue.claude?.model || "",
      permissionMode: roomValue.claude?.permissionMode || "bypassPermissions",
      sessionMode: roomValue.claude?.sessionMode || "router",
      timeoutMs: Number(roomValue.claude?.timeoutMs || DEFAULT_TIMEOUT_MS),
      appendSystemPrompt: roomValue.claude?.appendSystemPrompt || "",
      extraArgs: toStringArray(roomValue.claude?.extraArgs || [])
    }
  };

  return roomConfig;
}

function validateConfig(config) {
  if (!config.botToken) {
    throw new Error("Missing Telegram bot token.");
  }
  if (!config.registrationCode) {
    throw new Error("Missing registration code.");
  }
  if (config.botUsername === "pressco21_openclaw_bot" && !config.allowPrimaryBotReuse) {
    throw new Error(
      "The primary bot 'pressco21_openclaw_bot' is reserved for server flora-frontdoor. " +
      "Use a dedicated dev bot for the local room router, or set allowPrimaryBotReuse=true only for temporary recovery work.",
    );
  }
  if (config.chunkSize < 1000 || config.chunkSize > 4096) {
    throw new Error("chunkSize must be between 1000 and 4096.");
  }
  if (!Object.keys(config.rooms).length) {
    throw new Error("At least one room definition is required.");
  }

  for (const roomConfig of Object.values(config.rooms)) {
    if (!["codex", "claude"].includes(roomConfig.runner)) {
      throw new Error(`Unsupported runner '${roomConfig.runner}' for room '${roomConfig.roomKey}'.`);
    }
    if (!existsSync(roomConfig.workingDirectory)) {
      throw new Error(`Working directory missing for room '${roomConfig.roomKey}': ${roomConfig.workingDirectory}`);
    }
  }
}

function loadState(config) {
  const state = readJsonFile(config.statePath, {
    offset: 0,
    chats: {},
    currentTask: null
  });
  state.chats = state.chats || {};
  return state;
}

function saveState(config, state) {
  writeJsonFile(config.statePath, state);
}

function getChatState(state, chatId) {
  const key = String(chatId);
  if (!state.chats[key]) {
    state.chats[key] = {
      roomKey: "",
      sessionId: "",
      lastTaskAt: "",
      lastSummary: ""
    };
  }
  return state.chats[key];
}

async function telegramRequest(config, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${config.botToken}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });

  if (!response.ok) {
    throw new Error(`Telegram API ${method} failed with HTTP ${response.status}`);
  }

  const body = await response.json();
  if (!body.ok) {
    throw new Error(`Telegram API ${method} error: ${body.description || "unknown error"}`);
  }

  return body.result;
}

function splitMessage(text, chunkSize) {
  const normalized = String(text || "").trim();
  if (!normalized) {
    return ["(빈 응답)"];
  }

  const chunks = [];
  let cursor = 0;
  while (cursor < normalized.length) {
    let nextCursor = Math.min(cursor + chunkSize, normalized.length);
    if (nextCursor < normalized.length) {
      const breakIndex = normalized.lastIndexOf("\n", nextCursor);
      if (breakIndex > cursor + 500) {
        nextCursor = breakIndex;
      }
    }
    chunks.push(normalized.slice(cursor, nextCursor).trim());
    cursor = nextCursor;
  }

  return chunks.filter(Boolean);
}

async function sendText(config, chatId, text, replyToMessageId = null) {
  const chunks = splitMessage(text, config.chunkSize);
  for (const chunk of chunks) {
    const payload = {
      chat_id: chatId,
      text: chunk,
      disable_web_page_preview: true
    };
    if (replyToMessageId) {
      payload.reply_to_message_id = replyToMessageId;
    }
    await telegramRequest(config, "sendMessage", payload);
  }
}

function extractMessage(update) {
  return update.message || update.edited_message || null;
}

function parseMessageText(update) {
  return update.message?.text || update.edited_message?.text || "";
}

function formatRoomList(config) {
  return Object.values(config.rooms)
    .map((room) => `- ${room.roomKey}: ${room.displayName} (${room.runner})`)
    .join("\n");
}

function buildHelpText(config, chatState = null) {
  const currentRoom = chatState?.roomKey ? `현재 연결 방: ${chatState.roomKey}` : "현재 연결 방: 없음";
  return [
    `${config.bridgeName}`,
    currentRoom,
    "",
    "명령:",
    "/rooms",
    "/register <room> <code>",
    "/status",
    "/session",
    "/new",
    "/run <요청>",
    "",
    "사용 가능한 room:",
    formatRoomList(config),
    "",
    "등록 후 일반 텍스트를 보내면 해당 room runner로 실행됩니다."
  ].join("\n");
}

function summarizeText(text, length = 120) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= length) {
    return normalized;
  }
  return `${normalized.slice(0, length - 1)}…`;
}

function buildPrompt(roomConfig, prompt) {
  const trimmed = String(prompt || "").trim();
  if (!roomConfig.promptPreamble) {
    return trimmed;
  }
  return `${roomConfig.promptPreamble.trim()}\n\n[Telegram User Request]\n${trimmed}`;
}

function extractCodexSessionId(stdoutText) {
  const matched = String(stdoutText || "").match(/session id:\s+([a-z0-9-]+)/i);
  return matched ? matched[1].trim() : "";
}

function runProcess(command, args, cwd, timeoutMs) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdoutText = "";
    let stderrText = "";
    let didTimeout = false;

    const timeout = setTimeout(() => {
      didTimeout = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdoutText += chunk.toString("utf-8");
    });

    child.stderr.on("data", (chunk) => {
      stderrText += chunk.toString("utf-8");
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      rejectPromise(error);
    });

    child.on("close", (exitCode, signal) => {
      clearTimeout(timeout);
      resolvePromise({
        exitCode,
        signal,
        didTimeout,
        stdoutText,
        stderrText
      });
    });
  });
}

async function runCodexRoom(roomConfig, prompt, existingSessionId) {
  const tempDir = mkdtempSync(join(tmpdir(), "flora-codex-room-"));
  const outputPath = join(tempDir, "last-message.txt");

  const args = ["exec"];
  if (existingSessionId) {
    args.push("resume");
  }
  if (roomConfig.codex.executionMode === "danger-full-access") {
    args.push("--dangerously-bypass-approvals-and-sandbox");
  } else {
    args.push("--full-auto");
  }

  args.push("--skip-git-repo-check", "--color", "never", "-o", outputPath);

  if (roomConfig.codex.model) {
    args.push("-m", roomConfig.codex.model);
  }
  if (roomConfig.codex.profile) {
    args.push("-p", roomConfig.codex.profile);
  }
  if (roomConfig.codex.extraArgs.length) {
    args.push(...roomConfig.codex.extraArgs);
  }

  if (existingSessionId) {
    args.push(existingSessionId, prompt);
  } else {
    args.push(prompt);
  }

  try {
    const result = await runProcess(
      roomConfig.codex.binaryPath,
      args,
      roomConfig.workingDirectory,
      roomConfig.codex.timeoutMs,
    );

    const lastMessage = existsSync(outputPath) ? readFileSync(outputPath, "utf-8").trim() : "";
    const sessionId = extractCodexSessionId(result.stdoutText) || existingSessionId || "";

    return {
      ...result,
      sessionId,
      text: lastMessage || summarizeText(result.stdoutText || result.stderrText || "응답을 가져오지 못했습니다.", 3000)
    };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function runClaudeRoom(roomConfig, prompt, existingSessionId) {
  const args = ["-p", "--output-format", "text"];
  let sessionId = existingSessionId || "";

  if (roomConfig.claude.sessionMode === "continue") {
    args.push("-c");
    sessionId = "continue-latest";
  } else if (existingSessionId) {
    args.push("-r", existingSessionId);
  } else {
    sessionId = randomUUID();
    args.push("--session-id", sessionId);
  }

  if (roomConfig.claude.model) {
    args.push("--model", roomConfig.claude.model);
  }
  if (roomConfig.claude.permissionMode) {
    args.push("--permission-mode", roomConfig.claude.permissionMode);
  }
  if (roomConfig.claude.appendSystemPrompt) {
    args.push("--append-system-prompt", roomConfig.claude.appendSystemPrompt);
  }
  if (roomConfig.claude.extraArgs.length) {
    args.push(...roomConfig.claude.extraArgs);
  }

  args.push(prompt);

  const result = await runProcess(
    roomConfig.claude.binaryPath,
    args,
    roomConfig.workingDirectory,
    roomConfig.claude.timeoutMs,
  );

  return {
    ...result,
    sessionId,
    text: String(result.stdoutText || "").trim() || summarizeText(result.stderrText || "응답을 가져오지 못했습니다.", 3000)
  };
}

async function runRoom(roomConfig, prompt, existingSessionId) {
  if (roomConfig.runner === "codex") {
    return runCodexRoom(roomConfig, prompt, existingSessionId);
  }
  if (roomConfig.runner === "claude") {
    return runClaudeRoom(roomConfig, prompt, existingSessionId);
  }
  throw new Error(`Unsupported runner: ${roomConfig.runner}`);
}

async function handleRegisteredPrompt(config, state, message, prompt, roomConfig) {
  const chatId = String(message.chat.id);
  const messageId = message.message_id;
  const chatState = getChatState(state, chatId);
  const summary = summarizeText(prompt, 80);

  state.currentTask = {
    chatId,
    roomKey: roomConfig.roomKey,
    startedAt: new Date().toISOString(),
    summary
  };
  saveState(config, state);

  appendLog(config, "room-run-start", {
    chatId,
    roomKey: roomConfig.roomKey,
    summary,
    sessionId: chatState.sessionId || null
  });

  await sendText(
    config,
    chatId,
    [
      `${roomConfig.displayName} 실행 시작`,
      `runner: ${roomConfig.runner}`,
      `작업 폴더: ${roomConfig.workingDirectory}`,
      `요청: ${summary}`
    ].join("\n"),
    messageId,
  );

  try {
    const result = await runRoom(roomConfig, buildPrompt(roomConfig, prompt), chatState.sessionId);
    chatState.sessionId = result.sessionId || chatState.sessionId || "";
    chatState.lastSummary = summary;
    chatState.lastTaskAt = new Date().toISOString();
    state.currentTask = null;
    saveState(config, state);

    appendLog(config, "room-run-finish", {
      chatId,
      roomKey: roomConfig.roomKey,
      summary,
      exitCode: result.exitCode,
      didTimeout: result.didTimeout,
      sessionId: chatState.sessionId || null
    });

    const header = result.exitCode === 0 && !result.didTimeout
      ? `${roomConfig.displayName} 응답`
      : `${roomConfig.displayName} 경고 (exit=${result.exitCode}, timeout=${result.didTimeout ? "yes" : "no"})`;
    await sendText(config, chatId, `${header}\n\n${result.text}`, messageId);
  } catch (error) {
    state.currentTask = null;
    saveState(config, state);
    appendLog(config, "room-run-error", {
      chatId,
      roomKey: roomConfig.roomKey,
      summary,
      error: error.message
    });
    await sendText(config, chatId, `${roomConfig.displayName} 실행 실패\n${error.message}`, messageId);
  }
}

async function handleUpdate(config, state, update) {
  const message = extractMessage(update);
  if (!message) {
    return;
  }

  const chatId = String(message.chat.id);
  const chatState = getChatState(state, chatId);
  const messageId = message.message_id;
  const text = parseMessageText(update).trim();

  appendLog(config, "telegram-update", {
    chatId,
    messageId,
    text: summarizeText(text, 120)
  });

  if (!text) {
    await sendText(config, chatId, "현재는 텍스트 메시지만 지원합니다.", messageId);
    return;
  }

  if (text === "/help" || text === "/start") {
    await sendText(config, chatId, buildHelpText(config, chatState), messageId);
    return;
  }

  if (text === "/rooms") {
    await sendText(config, chatId, formatRoomList(config), messageId);
    return;
  }

  const registerMatch = text.match(/^\/register(?:@\S+)?\s+(\S+)\s+(.+)$/i);
  if (registerMatch) {
    const roomKey = registerMatch[1].trim();
    const code = registerMatch[2].trim();

    if (!config.rooms[roomKey]) {
      await sendText(config, chatId, `알 수 없는 room 입니다: ${roomKey}\n\n${formatRoomList(config)}`, messageId);
      return;
    }
    if (code !== config.registrationCode) {
      await sendText(config, chatId, "등록 코드가 맞지 않습니다.", messageId);
      return;
    }

    chatState.roomKey = roomKey;
    chatState.sessionId = "";
    saveState(config, state);
    await sendText(config, chatId, `이 방을 '${config.rooms[roomKey].displayName}'로 등록했습니다.`, messageId);
    return;
  }

  if (!chatState.roomKey || !config.rooms[chatState.roomKey]) {
    // DM(private chat)이면 flora-route로 포워딩
    const chatType = message.chat?.type || "";
    const AUTHORIZED_DM = ["7713811206", "8606163783"];
    if (chatType === "private" && AUTHORIZED_DM.includes(chatId)) {
      appendLog(config, "dm-forward-to-flora-route", { chatId, text: summarizeText(text, 80) });
      try {
        const routeResp = await fetch("https://n8n.pressco21.com/webhook/flora-route", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text, chatId }),
          signal: AbortSignal.timeout(30000),
        });
        const routeData = await routeResp.json();
        appendLog(config, "dm-forward-result", { route: routeData.route, needsMac: routeData.needsMac });
      } catch (err) {
        appendLog(config, "dm-forward-error", { error: err.message });
        await sendText(config, chatId, "요청을 처리하는 중 오류가 발생했습니다.", messageId);
      }
      return;
    }
    await sendText(config, chatId, buildHelpText(config, chatState), messageId);
    return;
  }

  const roomConfig = config.rooms[chatState.roomKey];

  if (text === "/status") {
    const taskText = state.currentTask && state.currentTask.chatId === chatId
      ? `실행 중: ${state.currentTask.summary}`
      : "현재 이 방에서 실행 중인 작업은 없습니다.";
    const sessionText = chatState.sessionId ? `세션: ${chatState.sessionId}` : "세션: 새로 시작 예정";
    await sendText(config, chatId, `${roomConfig.displayName}\n${taskText}\n${sessionText}`, messageId);
    return;
  }

  if (text === "/session") {
    await sendText(
      config,
      chatId,
      chatState.sessionId ? `현재 세션 ID\n${chatState.sessionId}` : "현재 저장된 세션이 없습니다.",
      messageId,
    );
    return;
  }

  if (text === "/new") {
    chatState.sessionId = "";
    chatState.lastSummary = "";
    saveState(config, state);
    await sendText(config, chatId, `${roomConfig.displayName} 세션을 초기화했습니다.`, messageId);
    return;
  }

  const prompt = text.startsWith("/run ") ? text.slice(5).trim() : text;
  if (!prompt) {
    await sendText(config, chatId, "실행할 요청이 없습니다.", messageId);
    return;
  }

  await handleRegisteredPrompt(config, state, message, prompt, roomConfig);
}

async function processUpdates(config, state, once = false) {
  const updates = await telegramRequest(config, "getUpdates", {
    offset: Number(state.offset || 0),
    timeout: once ? 0 : config.longPollSeconds,
    allowed_updates: ["message", "edited_message"]
  });

  if (!updates.length) {
    return 0;
  }

  for (const update of updates) {
    state.offset = Number(update.update_id) + 1;
    saveState(config, state);
    await handleUpdate(config, state, update);
  }

  return updates.length;
}

async function healthcheck(config) {
  const me = await telegramRequest(config, "getMe", {});
  process.stdout.write(
    [
      "Flora Telegram Room Router healthcheck",
      `bridgeName: ${config.bridgeName}`,
      `botUsername: @${me.username || "unknown"}`,
      `statePath: ${config.statePath}`,
      `logPath: ${config.logPath}`,
      "rooms:"
    ].concat(
      Object.values(config.rooms).map(
        (room) => `- ${room.roomKey}: ${room.displayName} (${room.runner}) -> ${room.workingDirectory}`,
      ),
    ).join("\n") + "\n",
  );
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const config = loadConfig(options.configPath);
  const state = loadState(config);

  if (options.healthcheck) {
    await healthcheck(config);
    return;
  }

  if (options.once) {
    const processed = await processUpdates(config, state, true);
    process.stdout.write(`processed_updates=${processed}\n`);
    return;
  }

  process.stdout.write(
    `${config.bridgeName} started\n` +
    `statePath=${config.statePath}\n` +
    `rooms=${Object.keys(config.rooms).join(",")}\n`,
  );

  while (true) {
    try {
      await processUpdates(config, state, false);
    } catch (error) {
      appendLog(config, "loop-error", { error: error.message });
      process.stderr.write(`loop-error: ${error.message}\n`);
      await new Promise((resolvePromise) => setTimeout(resolvePromise, config.pollIntervalMs));
    }
  }
}

run().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
