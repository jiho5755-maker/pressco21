#!/usr/bin/env node

const { spawn } = require("node:child_process");
const { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { delimiter, dirname, join, resolve } = require("node:path");
const { randomUUID } = require("node:crypto");
const process = require("node:process");

const DEFAULT_CONFIG_PATH = resolve(process.cwd(), "04_reference_json/flora-local-dev-worker.config.json");
const DEFAULT_TIMEOUT_MS = 20 * 60 * 1000;
const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_CODEX_CAPACITY_RETRY_COUNT = 3;
const DEFAULT_CODEX_CAPACITY_RETRY_DELAY_MS = 15000;

function usage() {
  process.stdout.write(
    [
      "Usage: node 06_scripts/run-flora-local-dev-worker.js [options]",
      "",
      "Options:",
      "  --config <path>     Worker config JSON path",
      "  --once              Poll the queue once and exit",
      "  --healthcheck       Validate config, bot token, ssh, and local binaries",
      "  --help              Show this message",
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

function resolveEnvOrLiteral(literalValue, envName) {
  if (literalValue) {
    return String(literalValue);
  }
  if (envName && process.env[envName]) {
    return String(process.env[envName]);
  }
  throw new Error(`Missing required value. Set ${envName || "configured literal value"}.`);
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

  for (const candidate of fallbackCandidates) {
    const expanded = expandHomePath(candidate);
    if (expanded && existsSync(expanded)) {
      return expanded;
    }
  }

  return requested;
}

function resolvePathFrom(baseDir, targetPath) {
  return resolve(baseDir, expandHomePath(targetPath || "."));
}

function toStringArray(values) {
  return Array.isArray(values) ? values.map((value) => String(value)) : [];
}

function summarizeText(text, limit = 80) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  if (normalized.length <= limit) {
    return normalized;
  }
  return `${normalized.slice(0, limit - 1)}…`;
}

function sleep(delayMs) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, delayMs);
  });
}

function loadConfig(configPath) {
  const rawConfig = readJsonFile(configPath, null);
  if (!rawConfig) {
    throw new Error(`Config not found: ${configPath}`);
  }

  const configDir = dirname(configPath);
  const config = {
    workerName: rawConfig.workerName || "flora-local-dev-worker",
    botToken: resolveEnvOrLiteral(rawConfig.botToken, rawConfig.botTokenEnv),
    statePath: resolvePathFrom(configDir, rawConfig.statePath || "../07_openclaw_workspace/flora-local-dev-worker/state.json"),
    logPath: resolvePathFrom(configDir, rawConfig.logPath || "../07_openclaw_workspace/flora-local-dev-worker/worker.log"),
    pollIntervalMs: Number(rawConfig.pollIntervalMs || DEFAULT_POLL_INTERVAL_MS),
    server: {
      host: String(rawConfig.server?.host || "").trim(),
      sshKeyPath: resolvePathFrom(configDir, rawConfig.server?.sshKeyPath || "~/.ssh/oracle-openclaw.key"),
      queueRoot: String(rawConfig.server?.queueRoot || "/home/ubuntu/.openclaw/dev-worker-queue").trim()
    },
    workers: {}
  };

  for (const [workerKey, workerValue] of Object.entries(rawConfig.workers || {})) {
    config.workers[workerKey] = {
      workerKey,
      enabled: workerValue.enabled !== false,
      chatId: String(workerValue.chatId || "").trim(),
      displayName: workerValue.displayName || workerKey,
      runner: String(workerValue.runner || "").trim(),
      workingDirectory: resolvePathFrom(configDir, workerValue.workingDirectory || process.cwd()),
      promptPreamble: workerValue.promptPreamble || "",
      codex: {
        binaryPath: resolveBinaryPath(workerValue.codex?.binaryPath || "codex", [
          "/Applications/Codex.app/Contents/Resources/codex"
        ]),
        executionMode: workerValue.codex?.executionMode || "full-auto",
        model: workerValue.codex?.model || "",
        profile: workerValue.codex?.profile || "",
        timeoutMs: Number(workerValue.codex?.timeoutMs || DEFAULT_TIMEOUT_MS),
        extraArgs: toStringArray(workerValue.codex?.extraArgs || []),
        fallbackModels: toStringArray(workerValue.codex?.fallbackModels || []),
        capacityRetryCount: Number(workerValue.codex?.capacityRetryCount || DEFAULT_CODEX_CAPACITY_RETRY_COUNT),
        capacityRetryDelayMs: Number(workerValue.codex?.capacityRetryDelayMs || DEFAULT_CODEX_CAPACITY_RETRY_DELAY_MS)
      },
      claude: {
        binaryPath: resolveBinaryPath(workerValue.claude?.binaryPath || "claude", [
          "~/.local/bin/claude"
        ]),
        model: workerValue.claude?.model || "",
        permissionMode: workerValue.claude?.permissionMode || "bypassPermissions",
        sessionMode: workerValue.claude?.sessionMode || "router",
        timeoutMs: Number(workerValue.claude?.timeoutMs || DEFAULT_TIMEOUT_MS),
        appendSystemPrompt: workerValue.claude?.appendSystemPrompt || "",
        extraArgs: toStringArray(workerValue.claude?.extraArgs || [])
      }
    };
  }

  validateConfig(config);
  return config;
}

function validateConfig(config) {
  if (!config.botToken) {
    throw new Error("Missing bot token.");
  }
  if (!config.server.host) {
    throw new Error("Missing server.host.");
  }
  if (!existsSync(config.server.sshKeyPath)) {
    throw new Error(`SSH key not found: ${config.server.sshKeyPath}`);
  }
  if (!Object.keys(config.workers).length) {
    throw new Error("At least one worker must be configured.");
  }

  for (const workerConfig of Object.values(config.workers)) {
    if (!workerConfig.enabled) {
      continue;
    }
    if (!["codex", "claude"].includes(workerConfig.runner)) {
      throw new Error(`Unsupported runner '${workerConfig.runner}' for worker '${workerConfig.workerKey}'.`);
    }
    if (!workerConfig.chatId) {
      throw new Error(`chatId missing for worker '${workerConfig.workerKey}'.`);
    }
    if (!existsSync(workerConfig.workingDirectory)) {
      throw new Error(`Working directory missing for worker '${workerConfig.workerKey}': ${workerConfig.workingDirectory}`);
    }
  }
}

function loadState(config) {
  const state = readJsonFile(config.statePath, {
    sessions: {},
    currentTask: null
  });
  state.sessions = state.sessions || {};
  return state;
}

function saveState(config, state) {
  writeJsonFile(config.statePath, state);
}

function getWorkerSession(state, workerKey) {
  if (!state.sessions[workerKey]) {
    state.sessions[workerKey] = {
      sessionId: "",
      lastTaskAt: "",
      lastSummary: ""
    };
  }
  return state.sessions[workerKey];
}

function runProcess(binaryPath, args, cwd, timeoutMs) {
  return new Promise((resolvePromise, rejectPromise) => {
    let didTimeout = false;
    let stdoutText = "";
    let stderrText = "";
    const child = spawn(binaryPath, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env
    });

    const timeoutHandle = setTimeout(() => {
      didTimeout = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdoutText += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderrText += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timeoutHandle);
      rejectPromise(error);
    });
    child.on("close", (exitCode, signal) => {
      clearTimeout(timeoutHandle);
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

function buildPrompt(workerConfig, prompt) {
  const parts = [];
  if (workerConfig.promptPreamble) {
    parts.push(workerConfig.promptPreamble.trim());
  }
  parts.push(String(prompt || "").trim());
  return parts.filter(Boolean).join("\n\n");
}

function extractCodexSessionId(text) {
  const source = String(text || "");
  const jsonMatches = source.matchAll(/"thread_id":"([0-9a-f-]{36})"/gi);
  for (const match of jsonMatches) {
    if (match[1]) {
      return match[1];
    }
  }

  const labelledMatch = source.match(/session id:\s*([0-9a-f-]{36})/i);
  if (labelledMatch) {
    return labelledMatch[1];
  }

  const genericMatch = source.match(/\b([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\b/i);
  return genericMatch ? genericMatch[1] : "";
}

function isCodexCapacityError(text) {
  const source = String(text || "");
  return /selected model is at capacity/i.test(source) || /model is at capacity/i.test(source);
}

function buildCodexArgs(workerConfig, prompt, existingSessionId, outputPath, modelOverride) {
  const args = ["exec"];
  const isResume = Boolean(existingSessionId);

  if (isResume) {
    args.push("resume");
  }
  if (workerConfig.codex.executionMode === "danger-full-access") {
    args.push("--dangerously-bypass-approvals-and-sandbox");
  } else {
    args.push("--full-auto");
  }
  args.push("--skip-git-repo-check", "-o", outputPath);

  if (!isResume) {
    args.push("--color", "never");
  }

  const effectiveModel = String(modelOverride || workerConfig.codex.model || "").trim();
  if (effectiveModel) {
    args.push("-m", effectiveModel);
  }
  if (!isResume && workerConfig.codex.profile) {
    args.push("-p", workerConfig.codex.profile);
  }
  if (workerConfig.codex.extraArgs.length) {
    args.push(...workerConfig.codex.extraArgs);
  }
  if (existingSessionId) {
    args.push(existingSessionId, prompt);
  } else {
    args.push(prompt);
  }

  return args;
}

function formatCodexText(result, attemptCount) {
  const mergedOutput = `${result.stdoutText || ""}\n${result.stderrText || ""}`.trim();
  const lastMessage = String(result.lastMessage || "").trim();
  const baseText = lastMessage || summarizeText(mergedOutput || "응답을 가져오지 못했습니다.", 3000);
  if (attemptCount <= 1 || result.exitCode === 0 || result.didTimeout || !isCodexCapacityError(mergedOutput)) {
    return baseText;
  }
  return `${baseText}\n\n모델 수용량 문제를 감지해 ${attemptCount}회까지 자동 재시도했습니다.`;
}

async function runCodexWorker(config, workerConfig, prompt, existingSessionId) {
  const tempDir = mkdtempSync(join(tmpdir(), "flora-local-codex-"));
  const outputPath = join(tempDir, "last-message.txt");
  const maxAttempts = Math.max(1, Number(workerConfig.codex.capacityRetryCount || DEFAULT_CODEX_CAPACITY_RETRY_COUNT));
  const retryDelayMs = Math.max(1000, Number(workerConfig.codex.capacityRetryDelayMs || DEFAULT_CODEX_CAPACITY_RETRY_DELAY_MS));
  const modelAttempts = [String(workerConfig.codex.model || "").trim(), ...workerConfig.codex.fallbackModels]
    .map((value) => String(value || "").trim());
  let finalResult = null;
  let attemptCount = 0;

  try {
    for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex += 1) {
      attemptCount = attemptIndex + 1;
      const modelOverride = modelAttempts[Math.min(attemptIndex, Math.max(modelAttempts.length - 1, 0))] || "";
      const args = buildCodexArgs(workerConfig, prompt, existingSessionId, outputPath, modelOverride);
      const result = await runProcess(
        workerConfig.codex.binaryPath,
        args,
        workerConfig.workingDirectory,
        workerConfig.codex.timeoutMs,
      );
      const lastMessage = existsSync(outputPath) ? readFileSync(outputPath, "utf-8").trim() : "";
      finalResult = {
        ...result,
        lastMessage,
        sessionId: extractCodexSessionId(`${result.stdoutText}\n${result.stderrText}`) || existingSessionId || ""
      };

      const mergedOutput = `${result.stdoutText || ""}\n${result.stderrText || ""}`;
      if (!isCodexCapacityError(mergedOutput) || attemptCount >= maxAttempts) {
        break;
      }

      appendLog(config, "worker-run-retry", {
        workerKey: workerConfig.workerKey,
        runner: "codex",
        attempt: attemptCount,
        maxAttempts,
        reason: "model-capacity",
        model: modelOverride || "(default)",
        retryDelayMs
      });
      writeFileSync(outputPath, "", "utf-8");
      await sleep(retryDelayMs);
    }

    return {
      ...finalResult,
      text: formatCodexText(finalResult, attemptCount)
    };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function runClaudeWorker(workerConfig, prompt, existingSessionId) {
  const args = ["-p", "--output-format", "text"];
  let sessionId = existingSessionId || "";

  if (workerConfig.claude.sessionMode === "continue") {
    args.push("-c");
    sessionId = "continue-latest";
  } else if (existingSessionId) {
    args.push("-r", existingSessionId);
  } else {
    sessionId = randomUUID();
    args.push("--session-id", sessionId);
  }

  if (workerConfig.claude.model) {
    args.push("--model", workerConfig.claude.model);
  }
  if (workerConfig.claude.permissionMode) {
    args.push("--permission-mode", workerConfig.claude.permissionMode);
  }
  if (workerConfig.claude.appendSystemPrompt) {
    args.push("--append-system-prompt", workerConfig.claude.appendSystemPrompt);
  }
  if (workerConfig.claude.extraArgs.length) {
    args.push(...workerConfig.claude.extraArgs);
  }
  args.push(prompt);

  const result = await runProcess(
    workerConfig.claude.binaryPath,
    args,
    workerConfig.workingDirectory,
    workerConfig.claude.timeoutMs,
  );

  return {
    ...result,
    sessionId,
    text: String(result.stdoutText || "").trim() || summarizeText(result.stderrText || "응답을 가져오지 못했습니다.", 3000)
  };
}

async function runWorker(config, workerConfig, prompt, existingSessionId) {
  if (workerConfig.runner === "codex") {
    return runCodexWorker(config, workerConfig, prompt, existingSessionId);
  }
  return runClaudeWorker(workerConfig, prompt, existingSessionId);
}

async function telegramRequest(config, method, payload) {
  const url = `https://api.telegram.org/bot${config.botToken}/${method}`;
  const result = await runProcess(
    "/usr/bin/curl",
    [
      "-4",
      "-sS",
      "--max-time",
      "30",
      "-H",
      "Content-Type: application/json",
      "-X",
      "POST",
      url,
      "-d",
      JSON.stringify(payload || {})
    ],
    process.cwd(),
    35 * 1000,
  );

  if (result.exitCode !== 0 || result.didTimeout) {
    throw new Error(`Telegram API ${method} transport failed (exit=${result.exitCode}, timeout=${result.didTimeout ? "yes" : "no"}): ${summarizeText(result.stderrText || result.stdoutText, 300)}`);
  }

  let body;
  try {
    body = JSON.parse(String(result.stdoutText || "").trim() || "{}");
  } catch (error) {
    throw new Error(`Telegram API ${method} returned invalid JSON: ${summarizeText(result.stdoutText, 300)}`);
  }

  if (!body.ok) {
    throw new Error(`Telegram API ${method} error: ${body.description || "unknown error"}`);
  }

  return body.result;
}

async function sendText(config, chatId, text, replyToMessageId = null) {
  return telegramRequest(config, "sendMessage", {
    chat_id: chatId,
    text,
    reply_parameters: replyToMessageId ? { message_id: Number(replyToMessageId) } : undefined
  });
}

function runSsh(config, remoteCommand) {
  const args = ["-i", config.server.sshKeyPath, "-o", "ConnectTimeout=10", config.server.host, remoteCommand];
  return runProcess("ssh", args, process.cwd(), 60 * 1000);
}

async function claimRemoteTask(config, workerKey) {
  const queueDir = `${config.server.queueRoot}/${workerKey}`;
  const remoteCommand = `
python3 - <<'PY'
from pathlib import Path
import json
import time

queue_dir = Path(${JSON.stringify(queueDir)})
pending_dir = queue_dir / "pending"
running_dir = queue_dir / "running"
done_dir = queue_dir / "done"
pending_dir.mkdir(parents=True, exist_ok=True)
running_dir.mkdir(parents=True, exist_ok=True)
done_dir.mkdir(parents=True, exist_ok=True)

files = sorted([path for path in pending_dir.glob("*.json") if path.is_file()], key=lambda p: (p.stat().st_mtime, p.name))
if not files:
    print("")
    raise SystemExit(0)

task_path = files[0]
running_path = running_dir / task_path.name
task_path.rename(running_path)
payload = json.loads(running_path.read_text())
payload["_remote_path"] = str(running_path)
print(json.dumps(payload, ensure_ascii=False))
PY
`.trim();

  const result = await runSsh(config, remoteCommand);
  const payload = String(result.stdoutText || "").trim();
  if (!payload) {
    return null;
  }
  return JSON.parse(payload);
}

async function completeRemoteTask(config, task, status, resultPayload) {
  const remotePath = String(task._remote_path || "").trim();
  if (!remotePath) {
    return;
  }
  const localTempDir = mkdtempSync(join(tmpdir(), "flora-worker-done-"));
  const fileName = remotePath.split("/").pop();
  const localResultPath = join(localTempDir, fileName);
  const remoteDonePath = remotePath.replace("/running/", "/done/");
  const payload = {
    ...resultPayload,
    id: task.id,
    worker: task.worker,
    chatId: task.chatId,
    status,
    finishedAt: new Date().toISOString()
  };
  writeJsonFile(localResultPath, payload);

  const scpArgs = ["-i", config.server.sshKeyPath, "-o", "ConnectTimeout=10", localResultPath, `${config.server.host}:${remoteDonePath}`];
  await runProcess("scp", scpArgs, process.cwd(), 60 * 1000);
  await runSsh(config, `rm -f ${JSON.stringify(remotePath)}`);
  rmSync(localTempDir, { recursive: true, force: true });
}

async function handleControlTask(config, state, workerConfig, task) {
  const sessionState = getWorkerSession(state, workerConfig.workerKey);
  const prompt = String(task.prompt || "").trim();

  if (prompt === "/new") {
    sessionState.sessionId = "";
    sessionState.lastTaskAt = new Date().toISOString();
    sessionState.lastSummary = "새 세션 요청";
    saveState(config, state);
    const text = workerConfig.runner === "claude" && workerConfig.claude.sessionMode === "continue"
      ? `${workerConfig.displayName}\n현재는 Claude continue 모드라 /new가 별도 세션을 만들지 않습니다.\n다음 요청부터 현재 작업 디렉토리의 최신 Claude 대화를 계속 사용합니다.`
      : `${workerConfig.displayName}\n새 세션으로 초기화했습니다.`;
    await sendText(config, task.chatId, text, task.replyToMessageId);
    await completeRemoteTask(config, task, "done", { mode: "control", text });
    return true;
  }

  if (prompt === "/status") {
    const sessionLabel = workerConfig.runner === "claude" && workerConfig.claude.sessionMode === "continue"
      ? "continue-latest"
      : (sessionState.sessionId || "없음");
    const text = [
      workerConfig.displayName,
      `runner: ${workerConfig.runner}`,
      `작업 폴더: ${workerConfig.workingDirectory}`,
      `세션: ${sessionLabel}`,
      `마지막 작업: ${sessionState.lastTaskAt || "없음"}`,
      `마지막 요약: ${sessionState.lastSummary || "없음"}`
    ].join("\n");
    await sendText(config, task.chatId, text, task.replyToMessageId);
    await completeRemoteTask(config, task, "done", { mode: "control", text });
    return true;
  }

  return false;
}

async function handleTask(config, state, workerConfig, task) {
  const sessionState = getWorkerSession(state, workerConfig.workerKey);
  const prompt = String(task.prompt || "").trim();
  const summary = summarizeText(prompt, 80);

  if (!prompt) {
    await completeRemoteTask(config, task, "skipped", { error: "empty prompt" });
    return;
  }

  if (await handleControlTask(config, state, workerConfig, task)) {
    return;
  }

  state.currentTask = {
    workerKey: workerConfig.workerKey,
    taskId: task.id,
    chatId: task.chatId,
    summary,
    startedAt: new Date().toISOString()
  };
  saveState(config, state);

  appendLog(config, "worker-run-start", {
    workerKey: workerConfig.workerKey,
    taskId: task.id,
    summary,
    sessionId: sessionState.sessionId || null
  });

  try {
    await sendText(
      config,
      task.chatId,
      [
        `${workerConfig.displayName} 실행 시작`,
        `runner: ${workerConfig.runner}`,
        `작업 폴더: ${workerConfig.workingDirectory}`,
        `요청: ${summary}`
      ].join("\n"),
      task.replyToMessageId || null,
    );
  } catch (error) {
    appendLog(config, "worker-start-notify-error", {
      workerKey: workerConfig.workerKey,
      taskId: task.id,
      error: error.message
    });
  }

  try {
    const result = await runWorker(config, workerConfig, buildPrompt(workerConfig, prompt), sessionState.sessionId);
    sessionState.sessionId = result.sessionId || sessionState.sessionId || "";
    sessionState.lastTaskAt = new Date().toISOString();
    sessionState.lastSummary = summary;
    state.currentTask = null;
    saveState(config, state);

    appendLog(config, "worker-run-finish", {
      workerKey: workerConfig.workerKey,
      taskId: task.id,
      exitCode: result.exitCode,
      didTimeout: result.didTimeout,
      sessionId: sessionState.sessionId || null
    });

    const header = result.exitCode === 0 && !result.didTimeout
      ? `${workerConfig.displayName} 응답`
      : `${workerConfig.displayName} 경고 (exit=${result.exitCode}, timeout=${result.didTimeout ? "yes" : "no"})`;
    const text = `${header}\n\n${result.text}`;
    await sendText(config, task.chatId, text, task.replyToMessageId || null);
    await completeRemoteTask(config, task, "done", {
      exitCode: result.exitCode,
      didTimeout: result.didTimeout,
      sessionId: sessionState.sessionId || "",
      text: result.text
    });
  } catch (error) {
    state.currentTask = null;
    saveState(config, state);
    appendLog(config, "worker-run-error", {
      workerKey: workerConfig.workerKey,
      taskId: task.id,
      error: error.message
    });
    const text = `${workerConfig.displayName} 실행 실패\n${error.message}`;
    await sendText(config, task.chatId, text, task.replyToMessageId || null);
    await completeRemoteTask(config, task, "error", { error: error.message });
  }
}

async function pollOnce(config, state) {
  for (const workerConfig of Object.values(config.workers)) {
    if (!workerConfig.enabled) {
      continue;
    }
    const task = await claimRemoteTask(config, workerConfig.workerKey);
    if (!task) {
      continue;
    }
    await handleTask(config, state, workerConfig, task);
    return true;
  }
  return false;
}

async function healthcheck(config) {
  await telegramRequest(config, "getMe", {});

  for (const workerConfig of Object.values(config.workers)) {
    if (!workerConfig.enabled) {
      continue;
    }
    const binaryPath = workerConfig.runner === "codex"
      ? workerConfig.codex.binaryPath
      : workerConfig.claude.binaryPath;
    if (!existsSync(binaryPath)) {
      throw new Error(`Binary not found for ${workerConfig.workerKey}: ${binaryPath}`);
    }
  }

  const sshResult = await runSsh(config, "echo flora-local-dev-worker-ok");
  if (!String(sshResult.stdoutText || "").includes("flora-local-dev-worker-ok")) {
    throw new Error("SSH connectivity check failed.");
  }

  process.stdout.write(
    [
      "Flora Local Dev Worker healthcheck",
      `server: ${config.server.host}`,
      ...Object.values(config.workers)
        .filter((worker) => worker.enabled)
        .map((worker) => `- ${worker.workerKey}: ${worker.runner} -> ${worker.workingDirectory}`)
    ].join("\n") + "\n",
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const config = loadConfig(options.configPath);
  const state = loadState(config);

  if (options.healthcheck) {
    await healthcheck(config);
    return;
  }

  appendLog(config, "worker-start", {
    configPath: options.configPath
  });

  if (options.once) {
    await pollOnce(config, state);
    return;
  }

  while (true) {
    try {
      await pollOnce(config, state);
    } catch (error) {
      appendLog(config, "worker-loop-error", { error: error.message });
    }
    await new Promise((resolvePromise) => {
      setTimeout(resolvePromise, config.pollIntervalMs);
    });
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
