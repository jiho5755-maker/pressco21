#!/usr/bin/env node

const { spawn } = require("node:child_process");
const { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { dirname, join, resolve } = require("node:path");
const process = require("node:process");

const DEFAULT_CONFIG_PATH = resolve(process.cwd(), "04_reference_json/codex-telegram-bridge.config.json");
const DEFAULT_POLL_INTERVAL_MS = 1500;
const DEFAULT_LONG_POLL_SECONDS = 20;
const DEFAULT_CHUNK_SIZE = 3500;
const DEFAULT_TIMEOUT_MS = 20 * 60 * 1000;
const DEFAULT_STATE_PATH = resolve(process.cwd(), "07_openclaw_workspace/codex-telegram-bridge/state.json");
const DEFAULT_LOG_PATH = resolve(process.cwd(), "07_openclaw_workspace/codex-telegram-bridge/bridge.log");

function usage() {
  process.stdout.write(
    [
      "Usage: node 06_scripts/run-codex-telegram-bridge.js [options]",
      "",
      "Options:",
      "  --config <path>     Bridge config JSON path",
      "  --once              Read pending Telegram updates once and exit",
      "  --healthcheck       Validate config/env/state paths and exit",
      "  --help              Show this message",
      "",
      "Environment:",
      "  Bot token and registration code are read from env vars defined in config.",
      "",
      "Commands inside Telegram:",
      "  /start, /help       Show usage",
      "  /register <code>    Authorize the current chat",
      "  /status             Show bridge/session status",
      "  /session            Show current Codex session id",
      "  /new                Reset the current chat session",
      "  /run <prompt>       Run Codex with the prompt",
      "  <plain text>        Same as /run",
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

function loadConfig(configPath) {
  const rawConfig = readJsonFile(configPath, null);
  if (!rawConfig) {
    throw new Error(`Config not found: ${configPath}`);
  }

  const configDir = dirname(configPath);
  const botToken = resolveEnvOrLiteral(rawConfig.botToken, rawConfig.botTokenEnv);
  const registrationCode = resolveEnvOrLiteral(rawConfig.registrationCode, rawConfig.registrationCodeEnv, true);
  const workingDirectory = resolvePathFrom(configDir, rawConfig.workingDirectory || process.cwd());
  const statePath = resolvePathFrom(configDir, rawConfig.statePath || DEFAULT_STATE_PATH);
  const logPath = resolvePathFrom(configDir, rawConfig.logPath || DEFAULT_LOG_PATH);
  const executionMode = rawConfig.codex?.executionMode || "full-auto";

  const config = {
    bridgeName: rawConfig.bridgeName || "codex-telegram-bridge",
    botToken,
    registrationCode,
    workingDirectory,
    statePath,
    logPath,
    pollIntervalMs: Number(rawConfig.pollIntervalMs || DEFAULT_POLL_INTERVAL_MS),
    longPollSeconds: Number(rawConfig.longPollSeconds || DEFAULT_LONG_POLL_SECONDS),
    chunkSize: Number(rawConfig.chunkSize || DEFAULT_CHUNK_SIZE),
    allowedChatIds: toStringArray(rawConfig.allowedChatIds || []),
    botUsername: rawConfig.botUsername || "",
    promptPreamble: rawConfig.promptPreamble || "",
    codex: {
      binaryPath: rawConfig.codex?.binaryPath || "codex",
      model: rawConfig.codex?.model || "",
      profile: rawConfig.codex?.profile || "",
      executionMode,
      extraArgs: Array.isArray(rawConfig.codex?.extraArgs) ? rawConfig.codex.extraArgs.map(String) : [],
      timeoutMs: Number(rawConfig.codex?.timeoutMs || DEFAULT_TIMEOUT_MS)
    }
  };

  validateConfig(config, configPath);
  return config;
}

function resolvePathFrom(baseDir, targetPath) {
  if (!targetPath) {
    return resolve(baseDir);
  }
  return resolve(baseDir, targetPath);
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

function toStringArray(values) {
  return values.map((value) => String(value));
}

function validateConfig(config, configPath) {
  if (!config.botToken) {
    throw new Error("Missing Telegram bot token.");
  }
  if (!existsSync(config.workingDirectory)) {
    throw new Error(`Working directory does not exist: ${config.workingDirectory}`);
  }
  if (!["full-auto", "danger-full-access"].includes(config.codex.executionMode)) {
    throw new Error(`Unsupported codex.executionMode: ${config.codex.executionMode}`);
  }
  if (config.chunkSize < 1000 || config.chunkSize > 4096) {
    throw new Error("chunkSize must be between 1000 and 4096.");
  }
  appendLog(
    { logPath: config.logPath },
    "config-loaded",
    {
      configPath,
      workingDirectory: config.workingDirectory,
      statePath: config.statePath
    },
  );
}

function loadState(config) {
  const state = readJsonFile(config.statePath, {
    offset: 0,
    allowedChatIds: [],
    chats: {},
    currentTask: null
  });

  state.allowedChatIds = toStringArray(state.allowedChatIds || []);
  state.chats = state.chats || {};
  state.currentTask = state.currentTask || null;
  return state;
}

function saveState(config, state) {
  writeJsonFile(config.statePath, state);
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

function getChatState(state, chatId) {
  const key = String(chatId);
  if (!state.chats[key]) {
    state.chats[key] = {
      sessionId: "",
      lastTaskAt: "",
      lastSummary: ""
    };
  }
  return state.chats[key];
}

function isAuthorizedChat(config, state, chatId) {
  const key = String(chatId);
  return config.allowedChatIds.includes(key) || state.allowedChatIds.includes(key);
}

function registerChat(config, state, chatId, code) {
  if (!config.registrationCode) {
    return false;
  }
  if (String(code || "").trim() !== config.registrationCode) {
    return false;
  }

  const key = String(chatId);
  if (!state.allowedChatIds.includes(key)) {
    state.allowedChatIds.push(key);
  }
  return true;
}

function parseMessageText(update) {
  if (update.message?.text) {
    return update.message.text;
  }
  if (update.edited_message?.text) {
    return update.edited_message.text;
  }
  return "";
}

function extractMessage(update) {
  return update.message || update.edited_message || null;
}

function buildHelpText(config, isAuthorized) {
  const registerHint = config.registrationCode
    ? "\n/register <등록코드> 로 현재 톡방을 Codex 방으로 승인할 수 있습니다."
    : "";
  const runHint = isAuthorized
    ? "\n일반 텍스트를 보내면 Codex CLI가 그대로 실행됩니다."
    : "";

  return [
    `${config.bridgeName}`,
    "",
    "명령:",
    "/help - 도움말",
    "/status - 현재 세션 상태",
    "/session - 현재 Codex 세션 ID",
    "/new - 현재 톡방 세션 초기화",
    "/run <요청> - Codex 실행",
    registerHint,
    runHint
  ].filter(Boolean).join("\n");
}

function buildPrompt(config, text) {
  const trimmed = String(text || "").trim();
  if (!config.promptPreamble) {
    return trimmed;
  }
  return `${config.promptPreamble.trim()}\n\n[Telegram User Request]\n${trimmed}`;
}

function buildCodexArgs(config, outputPath, prompt, sessionId) {
  const args = ["exec"];

  if (sessionId) {
    args.push("resume");
  }

  if (config.codex.executionMode === "danger-full-access") {
    args.push("--dangerously-bypass-approvals-and-sandbox");
  } else {
    args.push("--full-auto");
  }

  args.push("--skip-git-repo-check", "--color", "never", "-o", outputPath);

  if (config.codex.model) {
    args.push("-m", config.codex.model);
  }
  if (config.codex.profile) {
    args.push("-p", config.codex.profile);
  }
  if (config.codex.extraArgs.length > 0) {
    args.push(...config.codex.extraArgs);
  }
  if (sessionId) {
    args.push(sessionId, prompt);
  } else {
    args.push(prompt);
  }

  return args;
}

function summarizeText(text, length = 120) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= length) {
    return normalized;
  }
  return `${normalized.slice(0, length - 1)}…`;
}

function extractSessionId(stdoutText) {
  const matched = stdoutText.match(/session id:\s+([a-z0-9-]+)/i);
  return matched ? matched[1].trim() : "";
}

function runCodex(config, prompt, sessionId) {
  return new Promise((resolvePromise, rejectPromise) => {
    const tempDir = mkdtempSync(join(tmpdir(), "codex-telegram-bridge-"));
    const outputPath = join(tempDir, "last-message.txt");
    const args = buildCodexArgs(config, outputPath, prompt, sessionId);

    const child = spawn(config.codex.binaryPath, args, {
      cwd: config.workingDirectory,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdoutText = "";
    let stderrText = "";
    let didTimeout = false;

    const timeout = setTimeout(() => {
      didTimeout = true;
      child.kill("SIGTERM");
    }, config.codex.timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdoutText += chunk.toString("utf-8");
    });

    child.stderr.on("data", (chunk) => {
      stderrText += chunk.toString("utf-8");
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      rmSync(tempDir, { recursive: true, force: true });
      rejectPromise(error);
    });

    child.on("close", (exitCode, signal) => {
      clearTimeout(timeout);
      const lastMessage = existsSync(outputPath) ? readFileSync(outputPath, "utf-8").trim() : "";
      const nextSessionId = extractSessionId(stdoutText) || sessionId || "";
      rmSync(tempDir, { recursive: true, force: true });

      resolvePromise({
        exitCode,
        signal,
        didTimeout,
        stdoutText,
        stderrText,
        lastMessage,
        sessionId: nextSessionId
      });
    });
  });
}

async function handleAuthorizedCommand(config, state, message, text) {
  const chatId = String(message.chat.id);
  const messageId = message.message_id;
  const chatState = getChatState(state, chatId);
  const trimmed = String(text || "").trim();

  if (!trimmed) {
    await sendText(config, chatId, "빈 메시지는 실행하지 않습니다.", messageId);
    return;
  }

  if (trimmed === "/help" || trimmed === "/start") {
    await sendText(config, chatId, buildHelpText(config, true), messageId);
    return;
  }

  if (trimmed === "/status") {
    const runningText = state.currentTask
      ? `실행 중: ${state.currentTask.summary}`
      : "현재 실행 중인 작업은 없습니다.";
    const sessionText = chatState.sessionId ? `세션: ${chatState.sessionId}` : "세션: 새로 시작 예정";
    await sendText(config, chatId, `${runningText}\n${sessionText}`, messageId);
    return;
  }

  if (trimmed === "/session") {
    await sendText(
      config,
      chatId,
      chatState.sessionId ? `현재 세션 ID\n${chatState.sessionId}` : "현재 저장된 세션이 없습니다.",
      messageId,
    );
    return;
  }

  if (trimmed === "/new") {
    chatState.sessionId = "";
    chatState.lastSummary = "";
    saveState(config, state);
    await sendText(config, chatId, "현재 톡방의 Codex 세션을 초기화했습니다.", messageId);
    return;
  }

  const prompt = trimmed.startsWith("/run ") ? trimmed.slice(5).trim() : trimmed;
  if (!prompt) {
    await sendText(config, chatId, "실행할 요청이 없습니다. `/run 할일` 형식이나 일반 텍스트를 보내세요.", messageId);
    return;
  }

  const summary = summarizeText(prompt, 80);
  state.currentTask = {
    chatId,
    startedAt: new Date().toISOString(),
    summary
  };
  saveState(config, state);

  appendLog(config, "codex-run-start", {
    chatId,
    summary,
    sessionId: chatState.sessionId || null
  });

  const modeText = chatState.sessionId ? "기존 세션 이어서 실행" : "새 세션 시작";
  await sendText(
    config,
    chatId,
    [`Codex 작업을 시작합니다.`, `모드: ${modeText}`, `작업 폴더: ${config.workingDirectory}`, `요청: ${summary}`].join("\n"),
    messageId,
  );

  try {
    const result = await runCodex(config, buildPrompt(config, prompt), chatState.sessionId);
    if (result.sessionId) {
      chatState.sessionId = result.sessionId;
    }
    chatState.lastTaskAt = new Date().toISOString();
    chatState.lastSummary = summary;
    state.currentTask = null;
    saveState(config, state);

    const finalText = result.lastMessage || summarizeText(result.stdoutText || result.stderrText || "응답을 가져오지 못했습니다.", 2000);
    const header = result.exitCode === 0 && !result.didTimeout
      ? "Codex 응답"
      : `Codex 실행 경고 (exit=${result.exitCode}, timeout=${result.didTimeout ? "yes" : "no"})`;

    appendLog(config, "codex-run-finish", {
      chatId,
      summary,
      exitCode: result.exitCode,
      didTimeout: result.didTimeout,
      sessionId: chatState.sessionId || null
    });

    await sendText(config, chatId, `${header}\n\n${finalText}`, messageId);
  } catch (error) {
    state.currentTask = null;
    saveState(config, state);
    appendLog(config, "codex-run-error", {
      chatId,
      summary,
      error: error.message
    });
    await sendText(config, chatId, `Codex 실행 실패\n${error.message}`, messageId);
  }
}

async function handleUpdate(config, state, update) {
  const message = extractMessage(update);
  if (!message) {
    return;
  }

  const chatId = String(message.chat.id);
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

  const registerMatch = text.match(/^\/register(?:@\S+)?\s+(.+)$/i);
  if (registerMatch) {
    const ok = registerChat(config, state, chatId, registerMatch[1]);
    saveState(config, state);
    await sendText(
      config,
      chatId,
      ok ? "이 톡방을 Codex 전용 방으로 등록했습니다." : "등록코드가 맞지 않습니다.",
      messageId,
    );
    return;
  }

  const authorized = isAuthorizedChat(config, state, chatId);
  if (!authorized) {
    await sendText(config, chatId, buildHelpText(config, false), messageId);
    return;
  }

  await handleAuthorizedCommand(config, state, message, text);
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

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const config = loadConfig(options.configPath);
  const state = loadState(config);

  if (options.healthcheck) {
    process.stdout.write(
      [
        "Codex Telegram Bridge healthcheck",
        `bridgeName: ${config.bridgeName}`,
        `workingDirectory: ${config.workingDirectory}`,
        `statePath: ${config.statePath}`,
        `logPath: ${config.logPath}`,
        `allowedChatIds(config): ${config.allowedChatIds.length}`,
        `allowedChatIds(state): ${state.allowedChatIds.length}`,
        `codexBinary: ${config.codex.binaryPath}`,
        `executionMode: ${config.codex.executionMode}`
      ].join("\n") + "\n",
    );
    return;
  }

  if (options.once) {
    const processed = await processUpdates(config, state, true);
    process.stdout.write(`processed_updates=${processed}\n`);
    return;
  }

  process.stdout.write(
    `${config.bridgeName} started\n` +
    `workingDirectory=${config.workingDirectory}\n` +
    `statePath=${config.statePath}\n`,
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
