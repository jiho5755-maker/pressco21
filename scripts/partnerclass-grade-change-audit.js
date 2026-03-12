#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const roots = [
  path.join(repoRoot, '파트너클래스'),
  path.join(repoRoot, 'scripts'),
  path.join(repoRoot, 'docs', '파트너클래스')
];

const allowedExts = new Set(['.js', '.json', '.md', '.html', '.css']);
const ignoredDirs = new Set([
  'archive',
  'output',
  'node_modules',
  '.git'
]);

const patterns = [
  {
    key: 'storage',
    label: 'Storage Grades',
    regex: /\bSILVER\b|\bGOLD\b|\bPLATINUM\b/
  },
  {
    key: 'display',
    label: 'Display Grades',
    regex: /\bBLOOM\b|\bGARDEN\b|\bATELIER\b|\bAMBASSADOR\b/
  },
  {
    key: 'mapping',
    label: 'Mapping And Rates',
    regex: /\bgrade\b|\bcommission_rate\b|\breserve_rate\b|GRADE_ORDER|COMMISSION_RATES|STORAGE_GRADE_MAP|GRADE_ALIAS|RATE_ALIAS|normalizePartnerGrade|gradeMeta/
  },
  {
    key: 'education',
    label: 'Education Coupling',
    regex: /CORRECT_ANSWERS|PASS_THRESHOLD|education-complete|퀴즈|quiz|교육 이수/
  }
];

function walk(dir, files) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        walk(fullPath, files);
      }
      return;
    }
    if (allowedExts.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  });
}

function toRelative(filePath) {
  return path.relative(repoRoot, filePath) || filePath;
}

function scanFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  const hits = [];

  lines.forEach((line, index) => {
    const categories = patterns
      .filter((pattern) => pattern.regex.test(line))
      .map((pattern) => pattern.key);

    if (categories.length) {
      hits.push({
        line: index + 1,
        categories,
        text: line.trim()
      });
    }
  });

  return hits;
}

const files = [];
roots.forEach((root) => walk(root, files));

const results = files
  .map((filePath) => {
    return {
      filePath,
      relativePath: toRelative(filePath),
      hits: scanFile(filePath)
    };
  })
  .filter((entry) => entry.hits.length > 0)
  .sort((a, b) => a.relativePath.localeCompare(b.relativePath, 'ko'));

const totals = patterns.reduce((acc, pattern) => {
  acc[pattern.key] = 0;
  return acc;
}, {});

results.forEach((entry) => {
  entry.hits.forEach((hit) => {
    hit.categories.forEach((category) => {
      totals[category] += 1;
    });
  });
});

console.log('Partner Grade Change Audit');
console.log('Root:', repoRoot);
console.log('Files scanned:', files.length);
console.log('Files with hits:', results.length);
console.log('');

patterns.forEach((pattern) => {
  console.log(pattern.label + ': ' + totals[pattern.key]);
});

console.log('');

results.forEach((entry) => {
  console.log('[' + entry.relativePath + ']');
  entry.hits.forEach((hit) => {
    console.log(
      '  L' +
        hit.line +
        ' [' +
        hit.categories.join(',') +
        '] ' +
        hit.text
    );
  });
  console.log('');
});
