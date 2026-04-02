#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { exec as execCallback } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execCallback);
const DEFAULT_CONFIG = join(homedir(), ".codex", ".omx-config.json");
const DEFAULT_PLAYBOOK = "executive-assistant";

function usage() {
  process.stderr.write(
    [
      "Usage: node scripts/run-pressco21-playbook.js <workflow> [options]",
      "",
      "Options:",
      "  --input <path>         JSON input file path",
      "  --json <string>        Inline JSON input",
      "  --playbook <name>      Playbook name (default: executive-assistant)",
      "  --config <path>        OMX config path (default: ~/.codex/.omx-config.json)",
      "  --dry-run              Print resolved instruction and command without executing",
      "  --print-instruction    Print resolved instruction only",
      "  --help                 Show help",
      "",
      "Examples:",
      "  node scripts/run-pressco21-playbook.js meeting-brief \\",
      "    --input docs/reference/openclaw-pressco21-executive-assistant-meeting-brief.example.json",
      "",
      "  node scripts/run-pressco21-playbook.js weekly-action-tracker --dry-run \\",
      "    --input docs/reference/openclaw-pressco21-weekly-action-tracker.template.json",
      "",
      "Required env for command execution:",
      "  OMX_OPENCLAW=1",
      "  OMX_OPENCLAW_COMMAND=1",
    ].join("\n") + "\n",
  );
}

function parseArgs(argv) {
  const options = {
    workflow: "",
    inputPath: "",
    inlineJson: "",
    playbook: DEFAULT_PLAYBOOK,
    configPath: process.env.OMX_OPENCLAW_CONFIG || DEFAULT_CONFIG,
    dryRun: false,
    printInstruction: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!options.workflow && !arg.startsWith("--")) {
      options.workflow = arg;
    } else if (arg === "--input") {
      options.inputPath = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--json") {
      options.inlineJson = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--playbook") {
      options.playbook = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--config") {
      options.configPath = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--print-instruction") {
      options.printInstruction = true;
    } else if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.workflow) {
    throw new Error("Missing workflow name.");
  }
  if (!options.inputPath && !options.inlineJson) {
    throw new Error("Provide --input or --json.");
  }
  return options;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function loadInput(options) {
  const raw = options.inlineJson
    ? JSON.parse(options.inlineJson)
    : readJson(resolve(options.inputPath));
  if (raw && typeof raw === "object" && raw.input && typeof raw.input === "object") {
    return raw.input;
  }
  return raw;
}

function loadConfig(configPath) {
  const resolved = resolve(configPath);
  if (!existsSync(resolved)) {
    throw new Error(`Config file not found: ${resolved}`);
  }
  const config = readJson(resolved);
  const openclaw = config?.notifications?.openclaw;
  if (!openclaw) {
    throw new Error("notifications.openclaw not found in config.");
  }
  return openclaw;
}

function toTemplateValue(value) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map((entry) => toTemplateValue(entry)).join("\n");
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function interpolate(template, variables) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => variables[key] ?? "");
}

function shellEscapeArg(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function interpolateCommand(template, variables) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    if (!(key in variables)) return "";
    return shellEscapeArg(variables[key]);
  });
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const openclaw = loadConfig(options.configPath);
  const playbook = openclaw?.playbooks?.[options.playbook];
  if (!playbook) {
    throw new Error(`Playbook not found: ${options.playbook}`);
  }

  const workflow = playbook?.workflows?.[options.workflow];
  if (!workflow) {
    throw new Error(`Workflow not found: ${options.playbook}.${options.workflow}`);
  }

  const gateway = openclaw?.gateways?.[workflow.gateway];
  if (!gateway) {
    throw new Error(`Gateway not found for workflow: ${workflow.gateway}`);
  }

  const input = loadInput(options);
  const variables = Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, toTemplateValue(value)]),
  );
  const instruction = interpolate(workflow.instruction, variables);

  if (options.printInstruction) {
    process.stdout.write(instruction + "\n");
    return;
  }

  if (gateway.type !== "command") {
    throw new Error("This helper currently supports command gateways only.");
  }

  const command = interpolateCommand(gateway.command, { ...variables, instruction });

  if (options.dryRun) {
    process.stdout.write(
      JSON.stringify(
        {
          playbook: options.playbook,
          workflow: options.workflow,
          gateway: workflow.gateway,
          instruction,
          command,
          outputContract: workflow.outputContract || [],
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  if (process.env.OMX_OPENCLAW !== "1") {
    throw new Error("Set OMX_OPENCLAW=1 before executing playbooks.");
  }
  if (process.env.OMX_OPENCLAW_COMMAND !== "1") {
    throw new Error("Set OMX_OPENCLAW_COMMAND=1 before executing command playbooks.");
  }

  const result = await exec(command, {
    timeout: gateway.timeout || 120000,
    env: { ...process.env },
    shell: "/bin/sh",
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
