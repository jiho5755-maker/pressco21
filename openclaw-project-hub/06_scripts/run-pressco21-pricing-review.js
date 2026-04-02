#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import { delimiter, dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const RUNNER_PATH = join(REPO_ROOT, "scripts", "run-pressco21-playbook.js");
const BENCHMARKS_PATH = join(REPO_ROOT, "docs", "reference", "openclaw-pressco21-pricing-benchmarks.json");
const LOOKUP_SCRIPT_PATH = join(REPO_ROOT, "scripts", "lookup-pressco21-pricing-catalog.py");
const EXCHANGE_RATE_SCRIPT_PATH = join(REPO_ROOT, "scripts", "fetch-pressco21-latest-cny-rate.py");
const COST_PROFILES_PATH = join(REPO_ROOT, "docs", "reference", "openclaw-pressco21-product-cost-profiles.seed.json");
const REVIEWED_COST_PROFILES_PATH = join(
  REPO_ROOT,
  "docs",
  "reference",
  "openclaw-pressco21-product-cost-profiles.reviewed.json",
);
const DEFAULT_CONFIG = join(homedir(), ".codex", ".omx-config.json");
const DEFAULT_CATALOG_PATHS = [
  join(homedir(), "Downloads", "1688-SKU-메이크샵_연계마스터.xlsx"),
  join(homedir(), "Downloads", "1688-SKU_연계마스터.xlsx"),
  join(homedir(), "Desktop", "프레스코21", "1688-SKU-메이크샵_연계마스터.xlsx"),
];

function usage() {
  process.stderr.write(
    [
      "Usage: node scripts/run-pressco21-pricing-review.js [options]",
      "",
      "Options:",
      "  --product-name <name>       Product name",
      "  --sku <code>                Optional SKU code",
      "  --branduid <id>             Optional MakeShop branduid",
      "  --channel <name>            Channel name",
      "  --selling-price <value>     Selling price (VAT included). If omitted, catalog lookup is attempted",
      "  --source-cost <value>       COGS or purchase cost. If omitted, catalog lookup is attempted",
      "  --cost-type <type>          cogs | purchase_krw | purchase_cny",
      "  --base-profile <id>         Optional base cost profile for new products",
      "  --cost-profiles <path>      Override product cost profile JSON path",
      "  --exchange-rate <value>     CNY/KRW exchange rate when cost-type=purchase_cny",
      "  --extra-cost-rate <value>   Additional cost rate, default 0.2",
      "  --vat-rate <value>          VAT rate, default 0.1",
      "  --shipping-cost <value>     Shipping cost to subtract in model",
      "  --allocation-quantity <n>   Quantity used to allocate per-shipment import costs",
      "  --unit-cbm <value>          Unit volume in CBM",
      "  --length-cm <value>         Package length in cm",
      "  --width-cm <value>          Package width in cm",
      "  --height-cm <value>         Package height in cm",
      "  --domestic-inbound-shipping <value>  Domestic inbound shipping per unit",
      "  --origin-certificate-applied <value> y|n",
      "  --fee-notes <text>          Optional fee notes",
      "  --target-margin <value>     Optional target margin override",
      "  --constraints <csv>         Price constraints separated by commas",
      "  --approval-owner <name>     Approval owner, default 장지호",
      "  --input <path>              JSON input file",
      "  --json <string>             Inline JSON input",
      "  --catalog <path>            Override pricing catalog workbook path",
      "  --config <path>             OMX config path",
      "  --dry-run                   Print resolved input and runner command",
      "  --print-json                Print enriched input JSON only",
      "  --help                      Show help",
    ].join("\n") + "\n",
  );
}

function parseArgs(argv) {
  const options = {
    productName: "",
    skuCode: "",
    branduid: "",
    channel: "",
    sellingPrice: "",
    sourceCost: "",
    costType: "",
    baseProfileId: "",
    exchangeRate: "",
    extraCostRate: "",
    vatRate: "",
    shippingCost: "",
    allocationQuantity: "",
    unitCbm: "",
    packageLengthCm: "",
    packageWidthCm: "",
    packageHeightCm: "",
    domesticInboundShippingPerUnit: "",
    originCertificateApplied: "",
    feeNotes: "",
    targetMargin: "",
    constraints: "",
    approvalOwner: "장지호",
    inputPath: "",
    inlineJson: "",
    catalogPath: process.env.PRESSCO21_PRICING_CATALOG || "",
    costProfilesPath: process.env.PRESSCO21_COST_PROFILES || "",
    configPath: process.env.OMX_OPENCLAW_CONFIG || DEFAULT_CONFIG,
    dryRun: false,
    printJson: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--product-name") {
      options.productName = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--sku") {
      options.skuCode = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--branduid") {
      options.branduid = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--channel") {
      options.channel = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--selling-price") {
      options.sellingPrice = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--source-cost") {
      options.sourceCost = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--cost-type") {
      options.costType = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--base-profile") {
      options.baseProfileId = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--cost-profiles") {
      options.costProfilesPath = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--exchange-rate") {
      options.exchangeRate = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--extra-cost-rate") {
      options.extraCostRate = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--vat-rate") {
      options.vatRate = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--shipping-cost") {
      options.shippingCost = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--allocation-quantity") {
      options.allocationQuantity = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--unit-cbm") {
      options.unitCbm = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--length-cm") {
      options.packageLengthCm = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--width-cm") {
      options.packageWidthCm = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--height-cm") {
      options.packageHeightCm = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--domestic-inbound-shipping") {
      options.domesticInboundShippingPerUnit = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--origin-certificate-applied") {
      options.originCertificateApplied = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--fee-notes") {
      options.feeNotes = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--target-margin") {
      options.targetMargin = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--constraints") {
      options.constraints = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--approval-owner") {
      options.approvalOwner = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--input") {
      options.inputPath = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--json") {
      options.inlineJson = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--catalog") {
      options.catalogPath = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--config") {
      options.configPath = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--print-json") {
      options.printJson = true;
    } else if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function readOptionalJson(path) {
  try {
    return readJson(path);
  } catch {
    return null;
  }
}

function loadBaseInput(options) {
  if (options.inlineJson) {
    const parsed = JSON.parse(options.inlineJson);
    return parsed?.input && typeof parsed.input === "object" ? parsed.input : parsed;
  }
  if (options.inputPath) {
    const parsed = readJson(resolve(options.inputPath));
    return parsed?.input && typeof parsed.input === "object" ? parsed.input : parsed;
  }
  return {
    productName: options.productName,
    skuCode: options.skuCode,
    branduid: options.branduid,
    channel: options.channel,
    sellingPrice: options.sellingPrice,
    sourceCost: options.sourceCost,
    costType: options.costType || "",
    baseProfileId: options.baseProfileId || "",
    exchangeRate: options.exchangeRate,
    extraCostRate: options.extraCostRate,
    vatRate: options.vatRate,
    shippingCost: options.shippingCost,
    allocationQuantity: options.allocationQuantity,
    unitVolumeCbm: options.unitCbm,
    packageLengthCm: options.packageLengthCm,
    packageWidthCm: options.packageWidthCm,
    packageHeightCm: options.packageHeightCm,
    domesticInboundShippingPerUnit: options.domesticInboundShippingPerUnit,
    originCertificateApplied: options.originCertificateApplied,
    feeNotes: options.feeNotes,
    targetMargin: options.targetMargin,
    priceConstraints: splitCsv(options.constraints),
    approvalOwner: options.approvalOwner || "장지호",
  };
}

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumber(raw) {
  const match = String(raw || "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number.parseFloat(match[0]) : null;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^0-9a-z가-힣]+/g, "");
}

function normalizeProfileList(values) {
  return Array.isArray(values)
    ? values.map((value) => String(value || "").trim()).filter(Boolean)
    : [];
}

function round(value) {
  return Math.round(value);
}

function parseBoolean(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["y", "yes", "true", "1"].includes(normalized);
}

function rateToPercentLabel(value) {
  return `${Math.round(value * 1000) / 10}%`;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function computeUnitVolumeCbm(input, defaults = {}) {
  const explicit = parseNumber(input.unitVolumeCbm ?? defaults.unitVolumeCbm);
  if (explicit !== null) {
    return explicit;
  }
  const lengthCm = parseNumber(input.packageLengthCm ?? defaults.packageLengthCm);
  const widthCm = parseNumber(input.packageWidthCm ?? defaults.packageWidthCm);
  const heightCm = parseNumber(input.packageHeightCm ?? defaults.packageHeightCm);
  if (lengthCm === null || widthCm === null || heightCm === null) {
    return null;
  }
  return Number(((lengthCm * widthCm * heightCm) / 1000000).toFixed(6));
}

function splitPathList(value) {
  return String(value || "")
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function resolveCatalogPaths(options) {
  const explicit = options.catalogPath ? [resolve(options.catalogPath)] : [];
  const envList = splitPathList(process.env.PRESSCO21_PRICING_CATALOG_PATHS).map((entry) => resolve(entry));
  const defaults = DEFAULT_CATALOG_PATHS.map((entry) => resolve(entry));
  return unique([...explicit, ...envList, ...defaults]);
}

function loadCostProfiles(options) {
  const explicitPath = options.costProfilesPath ? resolve(options.costProfilesPath) : "";
  const path = explicitPath || (existsSync(REVIEWED_COST_PROFILES_PATH) ? REVIEWED_COST_PROFILES_PATH : COST_PROFILES_PATH);
  const payload = readOptionalJson(path);
  return payload ? { ...payload, resolvedPath: path } : { baseProfiles: {}, products: [], resolvedPath: path };
}

function profileMatchScore(product, baseInput) {
  const skuTarget = normalizeText(baseInput.skuCode);
  const branduidTarget = normalizeText(baseInput.branduid);
  const productTarget = normalizeText(baseInput.productName);
  let score = 0;

  for (const sku of normalizeProfileList(product.skuCodes)) {
    const candidate = normalizeText(sku);
    if (!candidate || !skuTarget) continue;
    if (candidate === skuTarget) score += 1000;
  }
  for (const branduid of normalizeProfileList(product.branduids)) {
    const candidate = normalizeText(branduid);
    if (!candidate || !branduidTarget) continue;
    if (candidate === branduidTarget) score += 900;
  }
  for (const text of [product.productName, ...(product.aliases || [])]) {
    const candidate = normalizeText(text);
    if (!candidate || !productTarget) continue;
    if (candidate === productTarget) score += 320;
    else if (candidate.includes(productTarget) || productTarget.includes(candidate)) score += 180;
  }
  return score;
}

function lookupCostProfile(baseInput, profiles) {
  const candidates = Array.isArray(profiles.products) ? profiles.products : [];
  const scored = candidates
    .map((product) => ({ product, score: profileMatchScore(product, baseInput) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  if (scored.length === 0) {
    return null;
  }

  const top = scored[0];
  const second = scored[1];
  if (second && top.score === second.score) {
    return null;
  }
  return top.product;
}

function mergeCostProfile(baseInput, profile, profiles) {
  const resolved = { ...baseInput };
  if (!profile && !baseInput.baseProfileId) {
    return resolved;
  }

  const baseProfileId = baseInput.baseProfileId || profile?.baseProfileId || "";
  const baseProfile = profiles.baseProfiles?.[baseProfileId] || null;
  const mergedDefaults = {
    ...(baseProfile?.fixedDefaults || {}),
    ...(profile?.fixedOverrides || {}),
  };
  const latest = profile?.latestSourceSnapshot || {};
  resolved.costProfileId = profile?.productId || "";
  resolved.costProfileStatus = profile?.status || "";
  resolved.costProfileSummary = profile
    ? `${profile.productName} / ${profile.baseProfileId} / status=${profile.status}`
    : baseProfileId
      ? `신규 상품용 기본 프로필 ${baseProfileId}`
      : "";
  resolved.baseProfileId = baseProfileId;
  resolved.costProfileRecord = profile ? JSON.stringify(profile, null, 2) : "";
  resolved.costProfileNotes = Array.isArray(profile?.notes) ? [...profile.notes] : [];
  resolved.costProfileDefaults = mergedDefaults;
  resolved.blockCatalogCostAutofill = profile?.status === "draft_conflict_from_master";

  if (profile) {
    if (!String(resolved.productName || "").trim()) {
      resolved.productName = profile.productName || "";
    }
    if (!String(resolved.category || "").trim()) {
      resolved.category = profile.category || "";
    }
    if (!String(resolved.skuCode || "").trim() && Array.isArray(profile.skuCodes) && profile.skuCodes.length > 0) {
      resolved.skuCode = profile.skuCodes[0];
    }
    if (!String(resolved.branduid || "").trim() && Array.isArray(profile.branduids) && profile.branduids.length > 0) {
      resolved.branduid = profile.branduids[0];
    }
    if (
      profile?.status !== "draft_conflict_from_master"
      && !String(resolved.sourceCost || "").trim()
    ) {
      const sourceCostType = profile?.sourceCostType || baseProfile?.sourceCostType || "purchase_cny";
      if (sourceCostType === "purchase_cny" && latest.latestPurchaseCny != null) {
        resolved.sourceCost = `${latest.latestPurchaseCny} CNY`;
        resolved.costType = "purchase_cny";
      } else if (sourceCostType === "purchase_krw" && latest.latestPurchaseKrw != null) {
        resolved.sourceCost = `${latest.latestPurchaseKrw}원`;
        resolved.costType = "purchase_krw";
      } else if (sourceCostType === "cogs" && latest.latestCogsKrw != null) {
        resolved.sourceCost = `${latest.latestCogsKrw}원`;
        resolved.costType = "cogs";
      }
    }
    if (!String(resolved.sellingPrice || "").trim() && latest.latestSellingPriceKrw != null) {
      resolved.sellingPrice = `${latest.latestSellingPriceKrw}원`;
    }
  }

  if (!String(resolved.costType || "").trim() && baseProfile?.sourceCostType) {
    resolved.costType = baseProfile.sourceCostType;
  }

  return resolved;
}

function normalizeChannelName(channel, benchmarks) {
  const target = String(channel || "").trim().toLowerCase();
  for (const entry of benchmarks.channels) {
    if (entry.name.toLowerCase() === target) return entry;
    for (const alias of entry.aliases || []) {
      if (String(alias).trim().toLowerCase() === target) return entry;
    }
  }
  return null;
}

function normalizeCategoryProfile(category, benchmarks) {
  const target = normalizeText(category);
  if (!target) return null;
  for (const profile of benchmarks.categoryProfiles || []) {
    const aliases = [profile.name, ...(profile.aliases || [])];
    if (aliases.some((alias) => normalizeText(alias) === target)) {
      return profile;
    }
  }
  return null;
}

function fetchLatestExchangeRate(benchmarks) {
  const defaults = benchmarks.defaults || {};
  if (defaults.exchangeRateMode !== "latest_public_daily_close") {
    return null;
  }
  try {
    const raw = execFileSync("python3", [EXCHANGE_RATE_SCRIPT_PATH], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    });
    const parsed = JSON.parse(raw);
    if (parsed?.status === "ok" && parsed.rateCnyKrw != null) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function resolveMarginGrade(rate, benchmarks) {
  if (rate == null) return null;
  for (const grade of benchmarks.marginGrades || []) {
    const minimum = Number(grade.minimumRate ?? -1);
    if (rate >= minimum) {
      return grade;
    }
  }
  return null;
}

function lookupCatalog(baseInput, options) {
  const lookupArgs = [];
  for (const catalogPath of resolveCatalogPaths(options)) {
    lookupArgs.push("--catalog", catalogPath);
  }
  if (lookupArgs.length === 0) {
    return null;
  }

  if (baseInput.productName) {
    lookupArgs.push("--product-name", baseInput.productName);
  }
  if (baseInput.skuCode) {
    lookupArgs.push("--sku", baseInput.skuCode);
  }
  if (baseInput.branduid) {
    lookupArgs.push("--branduid", baseInput.branduid);
  }

  try {
    const raw = execFileSync("python3", [LOOKUP_SCRIPT_PATH, ...lookupArgs], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    });
    return JSON.parse(raw);
  } catch (error) {
    return {
      status: "lookup_error",
      summary: error instanceof Error ? error.message : String(error),
      candidates: [],
    };
  }
}

function applyCatalogLookup(baseInput, lookupResult) {
  const resolved = {
    ...baseInput,
    catalogLookupStatus: lookupResult?.status || "not_attempted",
    catalogMatchSummary: lookupResult?.summary || "",
    catalogSource: lookupResult?.catalogPath || "",
    catalogRecord: "",
    catalogCandidates: lookupResult?.candidates || [],
    catalogTrustStatus: lookupResult?.trustStatus || "",
    catalogTrustSummary: lookupResult?.trustSummary || "",
    catalogLookupNotes: Array.isArray(baseInput.catalogLookupNotes) ? baseInput.catalogLookupNotes : [],
  };

  if (!lookupResult || lookupResult.status !== "matched" || !lookupResult.record) {
    return resolved;
  }

  const record = lookupResult.record;
  resolved.catalogRecord = JSON.stringify(record, null, 2);

  if (!String(resolved.productName || "").trim()) {
    resolved.productName =
      record.makeshopProductName || record.skuProductName || record.sourceProductName || "";
  }
  if (!String(resolved.skuCode || "").trim() && record.skuCode) {
    resolved.skuCode = record.skuCode;
  }
  if (!String(resolved.branduid || "").trim() && record.makeshopBranduid) {
    resolved.branduid = record.makeshopBranduid;
  }
  if (!String(resolved.category || "").trim() && record.makeshopCategory) {
    resolved.category = record.makeshopCategory;
  }
  if (!resolved.blockCatalogCostAutofill && !String(resolved.sourceCost || "").trim() && record.recentCostCny != null) {
    resolved.sourceCost = `${record.recentCostCny} CNY`;
    resolved.costType = "purchase_cny";
    resolved.catalogLookupNotes = [
      ...resolved.catalogLookupNotes,
      "원가는 연계마스터 최근단가(CNY)를 기준으로 자동 조회",
    ];
  }
  if (!String(resolved.sellingPrice || "").trim() && record.makeshopSellingPrice != null) {
    resolved.sellingPrice = `${record.makeshopSellingPrice}원`;
    resolved.catalogLookupNotes = [
      ...resolved.catalogLookupNotes,
      `판매가는 연계마스터 메이크샵 판매가 ${record.makeshopSellingPrice}원을 기준가로 사용`,
    ];
  }
  if (lookupResult.trustStatus === "conflict" && Array.isArray(lookupResult.sameIdentityCostHistory)) {
    resolved.catalogLookupNotes = [
      ...resolved.catalogLookupNotes,
      `동일 식별자 이력 원가가 ${lookupResult.sameIdentityCostHistory.join(", ")} CNY로 흔들려 연계마스터를 확정 원가 원장으로 보기는 어려움`,
    ];
  }

  return resolved;
}

function buildProfileBasedCost(input) {
  const defaults = input.costProfileDefaults || {};
  const baseProfileId = input.baseProfileId || "";
  if (!baseProfileId) {
    return null;
  }

  const costType = input.costType || "";
  const sourceCost = parseNumber(input.sourceCost);
  if (sourceCost == null) {
    return null;
  }

  if (costType === "purchase_cny") {
    const exchangeRate = parseNumber(input.exchangeRate) ?? 190;
    const purchaseKrw = round(sourceCost * exchangeRate);
    const branchManagementRate = Number(defaults.branchManagementRate ?? 0.1);
    const unitVolumeCbm = computeUnitVolumeCbm(input, defaults);
    const allocationQuantity = parseNumber(input.allocationQuantity ?? defaults.allocationQuantity);
    const oceanFreightRatePerCbmKrw = Number(defaults.oceanFreightRatePerCbmKrw ?? 0);
    const warehouseHandlingRatePerCbmKrw = Number(defaults.warehouseHandlingRatePerCbmKrw ?? 0);
    const customsBrokerFeePerShipmentKrw = Number(defaults.customsBrokerFeePerShipmentKrw ?? 0);
    const originCertificateFeeCny = parseNumber(defaults.originCertificateFeeCny);
    const originCertificateFeePerShipmentKrw = Number(defaults.originCertificateFeePerShipmentKrw ?? 0);
    const originCertificateApplied = parseBoolean(
      input.originCertificateApplied ?? defaults.originCertificateApplied ?? defaults.useOriginCertificate,
    );
    const domesticInboundShippingPerUnit = Number(
      parseNumber(input.domesticInboundShippingPerUnit) ?? defaults.domesticInboundShippingPerUnit ?? 0,
    );
    const oceanFreight =
      unitVolumeCbm !== null ? round(unitVolumeCbm * oceanFreightRatePerCbmKrw) : 0;
    const warehouseHandling =
      unitVolumeCbm !== null ? round(unitVolumeCbm * warehouseHandlingRatePerCbmKrw) : 0;
    const customsBroker =
      allocationQuantity !== null && allocationQuantity > 0
        ? round(customsBrokerFeePerShipmentKrw / allocationQuantity)
        : 0;
    const originCertificate =
      originCertificateApplied && allocationQuantity !== null && allocationQuantity > 0
        ? originCertificateFeeCny !== null
          ? round((originCertificateFeeCny * exchangeRate) / allocationQuantity)
          : round(originCertificateFeePerShipmentKrw / allocationQuantity)
        : 0;
    const detailedFreight = oceanFreight + warehouseHandling + customsBroker + originCertificate + domesticInboundShippingPerUnit;
    const freightPerUnit =
      detailedFreight > 0 ? detailedFreight : Number(defaults.freightPerUnit ?? 0);
    const tariffRate = Number(defaults.tariffRate ?? 0);
    const packagingCost = Number(defaults.packagingCost ?? 0);
    const inspectionCost = Number(defaults.inspectionCost ?? 0);
    const lossRate = Number(defaults.lossRate ?? 0);
    const vatRate = Number(defaults.vatRate ?? 0.1);
    const includeVatInCogs = Boolean(defaults.includeVatInCogs ?? false);
    const branchManagement = round(purchaseKrw * branchManagementRate);
    const tariffBase =
      unitVolumeCbm !== null
        ? purchaseKrw + oceanFreight + warehouseHandling
        : purchaseKrw + freightPerUnit;
    const tariff = round(tariffBase * tariffRate);
    const subtotal = purchaseKrw + branchManagement + freightPerUnit + tariff + packagingCost + inspectionCost;
    const lossReserve = round(subtotal * lossRate);
    const importVatCashFlow = round((tariffBase + tariff) * vatRate);
    const vatAmount = includeVatInCogs ? importVatCashFlow : 0;
    const normalizedCogs = subtotal + lossReserve + vatAmount;

    return {
      costType,
      normalizedCogs,
      detail: {
        purchaseKrw,
        branchManagement,
        unitVolumeCbm,
        allocationQuantity,
        oceanFreight,
        warehouseHandling,
        customsBroker,
        originCertificate,
        domesticInboundShippingPerUnit,
        freightPerUnit,
        tariff,
        packagingCost,
        inspectionCost,
        lossReserve,
        vatAmount,
        importVatCashFlow,
      },
      assumptions: [
        `기본 프로필 ${baseProfileId} 적용`,
        `중국 사입 단가 ${sourceCost} CNY`,
        `환율 ${exchangeRate} 적용`,
        `지사관리비 ${rateToPercentLabel(branchManagementRate)} 적용`,
        unitVolumeCbm !== null
          ? `개당 CBM ${unitVolumeCbm} 기준으로 국제운임/창고료 배분`
          : `개당 운임 ${freightPerUnit}원 기준 적용`,
        allocationQuantity !== null && allocationQuantity > 0
          ? `건당 비용 배분수량 ${allocationQuantity}개 기준`
          : "건당 비용 배분수량 미입력",
        `관세율 ${rateToPercentLabel(tariffRate)} 적용`,
        `포장비 ${packagingCost}원, 검품비 ${inspectionCost}원 적용`,
        `손실충당 ${rateToPercentLabel(lossRate)} 적용`,
        includeVatInCogs
          ? `수입부가세 ${rateToPercentLabel(vatRate)}를 COGS에 포함`
          : `수입부가세 ${rateToPercentLabel(vatRate)}는 매입세액 공제 대상으로 COGS 미포함`,
      ],
    };
  }

  if (costType === "purchase_krw") {
    const purchaseKrw = sourceCost;
    const shippingPerUnit = Number(defaults.shippingPerUnit ?? 0);
    const packagingCost = Number(defaults.packagingCost ?? 0);
    const inspectionCost = Number(defaults.inspectionCost ?? 0);
    const lossRate = Number(defaults.lossRate ?? 0);
    const subtotal = purchaseKrw + shippingPerUnit + packagingCost + inspectionCost;
    const lossReserve = round(subtotal * lossRate);
    const normalizedCogs = round(subtotal + lossReserve);

    return {
      costType,
      normalizedCogs,
      detail: {
        purchaseKrw,
        shippingPerUnit,
        packagingCost,
        inspectionCost,
        lossReserve,
      },
      assumptions: [
        `기본 프로필 ${baseProfileId} 적용`,
        `국내 매입가 ${purchaseKrw}원 기준`,
        `배송비 ${shippingPerUnit}원, 포장비 ${packagingCost}원, 검품비 ${inspectionCost}원 적용`,
        `손실충당 ${rateToPercentLabel(lossRate)} 적용`,
      ],
    };
  }

  return null;
}

function buildModeledSnapshot(input, benchmarks) {
  const defaults = benchmarks.defaults || {};
  const costType = input.costType || "cogs";
  const exchangeRate = parseNumber(input.exchangeRate) ?? defaults.exchangeRateCnyKrw;
  const extraCostRate = parseNumber(input.extraCostRate) ?? defaults.extraCostRate;
  const vatRate = parseNumber(input.vatRate) ?? defaults.vatRate;
  const shippingCost = parseNumber(input.shippingCost) ?? defaults.shippingCost;
  const includeImportVatInCogs = Boolean(defaults.includeImportVatInCogs ?? false);
  const includeDomesticPurchaseVatInCogs = Boolean(defaults.includeDomesticPurchaseVatInCogs ?? false);
  const sourceCost = parseNumber(input.sourceCost);
  const sellingPrice = parseNumber(input.sellingPrice);
  const channelBenchmark = normalizeChannelName(input.channel, benchmarks);
  const categoryProfile = normalizeCategoryProfile(input.category, benchmarks);

  let normalizedCogs = null;
  const assumptions = [
    ...(Array.isArray(input.catalogLookupNotes) ? input.catalogLookupNotes : []),
    ...(Array.isArray(input.costProfileNotes) ? input.costProfileNotes : []),
  ];
  const profileCost = buildProfileBasedCost(input);
  let costBreakdown = null;
  if (profileCost) {
    normalizedCogs = profileCost.normalizedCogs;
    assumptions.push(...profileCost.assumptions);
    costBreakdown = profileCost.detail;
  } else if (sourceCost !== null) {
    if (costType === "purchase_cny") {
      normalizedCogs = round(sourceCost * exchangeRate * (1 + extraCostRate) * (includeImportVatInCogs ? 1 + vatRate : 1));
      assumptions.push(
        `CNY 단가에 환율 ${exchangeRate}와 부대비용 ${rateToPercentLabel(extraCostRate)}를 반영`
          + (includeImportVatInCogs
            ? `, 수입부가세 ${rateToPercentLabel(vatRate)} 포함`
            : ", 수입부가세는 매입세액 공제 대상으로 COGS 미포함"),
      );
    } else if (costType === "purchase_krw") {
      normalizedCogs = round(sourceCost * (1 + extraCostRate) * (includeDomesticPurchaseVatInCogs ? 1 + vatRate : 1));
      assumptions.push(
        `KRW 매입가에 부대비용 ${rateToPercentLabel(extraCostRate)}를 반영`
          + (includeDomesticPurchaseVatInCogs
            ? `, VAT ${rateToPercentLabel(vatRate)} 포함`
            : ", 매입 VAT는 별도 관리"),
      );
    } else {
      normalizedCogs = round(sourceCost);
      assumptions.push("입력 원가를 확정 COGS로 그대로 사용");
    }
  }
  if (baseInputExchangeNote(input)) {
    assumptions.unshift(baseInputExchangeNote(input));
  }

  let supplyPrice = null;
  let feeAmount = null;
  let adReserveAmount = null;
  let estimatedMarginWon = null;
  let estimatedMarginRate = null;
  let marginAfterAdReserveWon = null;
  let marginAfterAdReserveRate = null;
  let thresholdStatus = "insufficient_data";
  let marginGrade = null;
  let gapToMinimumRate = null;
  let gapToTargetRate = null;

  if (sellingPrice !== null) {
    supplyPrice = defaults.vatIncludedInSellingPrice ? round(sellingPrice / 1.1) : round(sellingPrice);
  }

  if (supplyPrice !== null && channelBenchmark?.feeRate != null) {
    feeAmount = round(supplyPrice * channelBenchmark.feeRate);
  }
  if (supplyPrice !== null && channelBenchmark?.adReserveRate != null) {
    adReserveAmount = round(supplyPrice * channelBenchmark.adReserveRate);
  }

  if (supplyPrice !== null && normalizedCogs !== null) {
    estimatedMarginWon = supplyPrice - normalizedCogs - (feeAmount || 0) - shippingCost;
    estimatedMarginRate = supplyPrice > 0 ? Number((estimatedMarginWon / supplyPrice).toFixed(3)) : null;
    marginAfterAdReserveWon = estimatedMarginWon - (adReserveAmount || 0);
    marginAfterAdReserveRate =
      supplyPrice > 0 ? Number((marginAfterAdReserveWon / supplyPrice).toFixed(3)) : null;
  }

  if (estimatedMarginRate != null && channelBenchmark) {
    gapToMinimumRate = Number((estimatedMarginRate - channelBenchmark.minimumMarginRate).toFixed(3));
    gapToTargetRate = Number((estimatedMarginRate - channelBenchmark.targetMarginRate).toFixed(3));
    if (estimatedMarginRate < channelBenchmark.minimumMarginRate) {
      thresholdStatus = "below_minimum";
    } else if (estimatedMarginRate < channelBenchmark.targetMarginRate) {
      thresholdStatus = "below_target";
    } else {
      thresholdStatus = "meets_target";
    }
  }

  marginGrade = resolveMarginGrade(estimatedMarginRate, benchmarks);

  return {
    costType,
    normalizedCogs,
    exchangeRateUsed: exchangeRate,
    extraCostRateUsed: extraCostRate,
    vatRateUsed: vatRate,
    shippingCostUsed: shippingCost,
    supplyPrice,
    feeAmount,
    adReserveAmount,
    estimatedMarginWon,
    estimatedMarginRate,
    marginAfterAdReserveWon,
    marginAfterAdReserveRate,
    thresholdStatus,
    marginGrade,
    gapToMinimumRate,
    gapToTargetRate,
    assumptions,
    channelBenchmark,
    categoryProfile,
    costBreakdown,
  };
}

function baseInputExchangeNote(input) {
  if (!String(input.exchangeRateReferenceDate || "").trim()) {
    return "";
  }
  return `최신 환율 기준 ${input.exchangeRateReferenceDate} / ${input.exchangeRate}`;
}

function buildCatalogSummary(input) {
  const parts = [];
  if (input.catalogMatchSummary) parts.push(input.catalogMatchSummary);
  if (Array.isArray(input.catalogCandidates) && input.catalogCandidates.length > 0 && input.catalogLookupStatus !== "matched") {
    parts.push(`후보: ${JSON.stringify(input.catalogCandidates, null, 2)}`);
  }
  return parts.join("\n");
}

function enrichInput(baseInput, benchmarks) {
  const snapshot = buildModeledSnapshot(baseInput, benchmarks);
  const channelBenchmark = snapshot.channelBenchmark;
  const resolvedTargetMargin = baseInput.targetMargin
    || (channelBenchmark
      ? `최소 ${rateToPercentLabel(channelBenchmark.minimumMarginRate)}, 목표 ${rateToPercentLabel(channelBenchmark.targetMarginRate)}`
      : "");

  return {
    ...baseInput,
    targetMargin: resolvedTargetMargin,
    feeNotes:
      [baseInput.feeNotes,
        channelBenchmark
          ? `${channelBenchmark.feeLabel}, 광고예산기준=${channelBenchmark.adReserveLabel || "미설정"}, 역할=${channelBenchmark.role}, 가격가이드=${channelBenchmark.priceGuide}`
          : "",
        snapshot.categoryProfile ? `카테고리 전략=${snapshot.categoryProfile.priceCore}` : ""]
        .filter(Boolean)
        .join(" | "),
    normalizedCogs:
      snapshot.normalizedCogs != null ? `${snapshot.normalizedCogs}원` : "",
    channelBenchmark: channelBenchmark ? JSON.stringify(channelBenchmark, null, 2) : "",
    catalogLookupStatus: baseInput.catalogLookupStatus || "",
    catalogMatchSummary: buildCatalogSummary(baseInput),
    catalogRecord: baseInput.catalogRecord || "",
    catalogTrustStatus: baseInput.catalogTrustStatus || "",
    catalogTrustSummary: baseInput.catalogTrustSummary || "",
    costProfileId: baseInput.costProfileId || "",
    costProfileStatus: baseInput.costProfileStatus || "",
    costProfileSummary: baseInput.costProfileSummary || "",
    costProfileRecord: baseInput.costProfileRecord || "",
    baseProfileId: baseInput.baseProfileId || "",
    category: baseInput.category || "",
    categoryProfile: snapshot.categoryProfile ? JSON.stringify(snapshot.categoryProfile, null, 2) : "",
    costBreakdown: snapshot.costBreakdown ? JSON.stringify(snapshot.costBreakdown, null, 2) : "",
    computedSnapshot: JSON.stringify(
      {
        exchangeRateReferenceDate: baseInput.exchangeRateReferenceDate || "",
        exchangeRateSource: baseInput.exchangeRateSource || "",
        supplyPrice: snapshot.supplyPrice,
        feeAmount: snapshot.feeAmount,
        adReserveAmount: snapshot.adReserveAmount,
        estimatedMarginWon: snapshot.estimatedMarginWon,
        estimatedMarginRate: snapshot.estimatedMarginRate,
        marginAfterAdReserveWon: snapshot.marginAfterAdReserveWon,
        marginAfterAdReserveRate: snapshot.marginAfterAdReserveRate,
        thresholdStatus: snapshot.thresholdStatus,
        marginGrade: snapshot.marginGrade ? snapshot.marginGrade.name : null,
        gapToMinimumRate: snapshot.gapToMinimumRate,
        gapToTargetRate: snapshot.gapToTargetRate,
      },
      null,
      2,
    ),
    costRule: benchmarks.costRules?.[snapshot.costType] || "",
    hiddenCostChecklist: benchmarks.hiddenCostChecklist || [],
    costAssumptions: snapshot.assumptions,
    priceConstraints: Array.isArray(baseInput.priceConstraints) ? baseInput.priceConstraints : [],
  };
}

function validateInput(input) {
  if (!String(input.channel || "").trim()) {
    throw new Error("Missing required input: channel");
  }
  if (!String(input.productName || "").trim() && !String(input.skuCode || "").trim() && !String(input.branduid || "").trim()) {
    throw new Error("상품명, SKU코드, branduid 중 하나는 필요합니다.");
  }
}

function validateResolvedInput(input) {
  for (const key of ["sellingPrice", "sourceCost"]) {
    if (!String(input[key] || "").trim()) {
      throw new Error(`Missing required input after catalog lookup: ${key}`);
    }
  }
  if (!String(input.productName || "").trim()) {
    input.productName = input.skuCode || input.branduid || "미확인 상품";
  }
}

function shellEscape(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const benchmarks = readJson(BENCHMARKS_PATH);
  const fetchedExchangeRate = fetchLatestExchangeRate(benchmarks);
  const costProfiles = loadCostProfiles(options);
  const requestedInput = loadBaseInput(options);
  validateInput(requestedInput);
  const matchedProfile = lookupCostProfile(requestedInput, costProfiles);
  const profileMergedInput = mergeCostProfile(requestedInput, matchedProfile, costProfiles);
  const lookupResult = lookupCatalog(profileMergedInput, options);
  const resolvedInput = applyCatalogLookup(profileMergedInput, lookupResult);
  if (!String(resolvedInput.exchangeRate || "").trim()) {
    if (fetchedExchangeRate?.rateCnyKrw != null) {
      resolvedInput.exchangeRate = String(fetchedExchangeRate.rateCnyKrw);
      resolvedInput.exchangeRateReferenceDate = fetchedExchangeRate.latestPostedDate || "";
      resolvedInput.exchangeRateSource = fetchedExchangeRate.sourceUrl || "";
    } else if (benchmarks.defaults?.exchangeRateCnyKrw != null) {
      resolvedInput.exchangeRate = String(benchmarks.defaults.exchangeRateCnyKrw);
      resolvedInput.exchangeRateReferenceDate = benchmarks.defaults.exchangeRateReferenceDate || "";
      resolvedInput.exchangeRateSource = benchmarks.defaults.exchangeRateSource || "";
    }
  }
  validateResolvedInput(resolvedInput);
  const enriched = enrichInput(resolvedInput, benchmarks);

  if (options.printJson) {
    process.stdout.write(JSON.stringify(enriched, null, 2) + "\n");
    return;
  }

  const runnerArgs = [
    RUNNER_PATH,
    "price-margin-review",
    "--playbook",
    "pricing-margin-analyst",
    "--config",
    options.configPath,
    "--json",
    JSON.stringify(enriched),
  ];

  if (options.dryRun) {
    process.stdout.write(
      JSON.stringify(
        {
          workflow: "price-margin-review",
          playbook: "pricing-margin-analyst",
          input: enriched,
          runner: `${process.execPath} ${runnerArgs.map((arg) => shellEscape(arg)).join(" ")}`,
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, runnerArgs, {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        OMX_OPENCLAW: process.env.OMX_OPENCLAW || "1",
        OMX_OPENCLAW_COMMAND: process.env.OMX_OPENCLAW_COMMAND || "1",
      },
      stdio: "inherit",
    });
    child.on("error", rejectPromise);
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(new Error(`실행 실패 (exit ${code ?? "unknown"})`));
    });
  });
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
