#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

var repoRoot = path.resolve(__dirname, '..');
var outputDir = path.join(repoRoot, 'output', 'playwright', 'fixtures', 'partnerclass');

var pages = [
    {
        key: 'list',
        html: path.join(repoRoot, '파트너클래스', '목록', 'Index.html'),
        css: path.join(repoRoot, '파트너클래스', '목록', 'css.css'),
        js: path.join(repoRoot, '파트너클래스', '목록', 'js.js'),
        output: path.join(outputDir, 'list.html'),
        replacements: []
    },
    {
        key: 'detail',
        html: path.join(repoRoot, '파트너클래스', '상세', 'Index.html'),
        css: path.join(repoRoot, '파트너클래스', '상세', 'css.css'),
        js: path.join(repoRoot, '파트너클래스', '상세', 'js.js'),
        output: path.join(outputDir, 'detail.html'),
        replacements: []
    },
    {
        key: 'mypage',
        html: path.join(repoRoot, '파트너클래스', '마이페이지', 'Index.html'),
        css: path.join(repoRoot, '파트너클래스', '마이페이지', 'css.css'),
        js: path.join(repoRoot, '파트너클래스', '마이페이지', 'js.js'),
        output: path.join(outputDir, 'mypage.html'),
        replacements: [
            { from: '<!--/user_id/-->', to: 'member-test-001' }
        ]
    },
    {
        key: 'partner',
        html: path.join(repoRoot, '파트너클래스', '파트너', 'Index.html'),
        css: path.join(repoRoot, '파트너클래스', '파트너', 'css.css'),
        js: path.join(repoRoot, '파트너클래스', '파트너', 'js.js'),
        output: path.join(outputDir, 'partner.html'),
        replacements: [
            { from: '<!--/user_id/-->', to: 'partner-test-001' }
        ]
    },
    {
        key: 'apply',
        html: path.join(repoRoot, '파트너클래스', '파트너신청', 'Index.html'),
        css: path.join(repoRoot, '파트너클래스', '파트너신청', 'css.css'),
        js: path.join(repoRoot, '파트너클래스', '파트너신청', 'js.js'),
        output: path.join(outputDir, 'apply.html'),
        replacements: [
            { from: '<!--/user_id/-->', to: 'partner-applicant-001' }
        ]
    },
    {
        key: 'admin',
        html: path.join(repoRoot, '파트너클래스', '어드민', 'Index.html'),
        css: path.join(repoRoot, '파트너클래스', '어드민', 'css.css'),
        js: path.join(repoRoot, '파트너클래스', '어드민', 'js.js'),
        output: path.join(outputDir, 'admin.html'),
        replacements: [
            { from: '<!--/user_id/-->', to: 'admin01' },
            { from: '<!--/group_name/-->', to: '관리자' },
            { from: '<!--/group_level/-->', to: '10' }
        ]
    }
];

function readFile(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function applyReplacements(content, replacements) {
    var result = content;
    var i;

    for (i = 0; i < replacements.length; i++) {
        result = result.split(replacements[i].from).join(replacements[i].to);
    }

    return result;
}

function buildFixture(page) {
    var html = readFile(page.html);
    var css = readFile(page.css);
    var js = readFile(page.js);
    var finalHtml = applyReplacements(html, page.replacements || []);
    var styleTag = '\n<style>\n' + css + '\n</style>\n';
    var scriptTag = '\n<script>\n' + js + '\n</script>\n';

    if (finalHtml.indexOf('</head>') !== -1) {
        finalHtml = finalHtml.replace('</head>', styleTag + '</head>');
    } else {
        finalHtml = styleTag + finalHtml;
    }

    if (finalHtml.indexOf('</body>') !== -1) {
        finalHtml = finalHtml.replace('</body>', scriptTag + '</body>');
    } else {
        finalHtml += scriptTag;
    }

    return finalHtml;
}

function main() {
    var i;

    ensureDir(outputDir);

    for (i = 0; i < pages.length; i++) {
        fs.writeFileSync(pages[i].output, buildFixture(pages[i]), 'utf8');
        console.log('built', path.relative(repoRoot, pages[i].output));
    }
}

main();
