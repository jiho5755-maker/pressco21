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
        replacements: [
            { from: '<!--/user_id/-->', to: 'member-test-001' }
        ]
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
        key: 'affiliation-proposal',
        html: path.join(repoRoot, '파트너클래스', '협회제안서', 'Index.html'),
        css: path.join(repoRoot, '파트너클래스', '협회제안서', 'css.css'),
        js: path.join(repoRoot, '파트너클래스', '협회제안서', 'js.js'),
        output: path.join(outputDir, 'affiliation-proposal.html'),
        replacements: []
    },
    {
        key: 'content-hub',
        html: path.join(repoRoot, '파트너클래스', '콘텐츠허브', 'Index.html'),
        css: path.join(repoRoot, '파트너클래스', '콘텐츠허브', 'css.css'),
        js: path.join(repoRoot, '파트너클래스', '콘텐츠허브', 'js.js'),
        output: path.join(outputDir, 'content-hub.html'),
        replacements: []
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

function buildPartnerMapShell() {
    return [
        '<!DOCTYPE html>',
        '<html lang="ko">',
        '<head>',
        '<meta charset="UTF-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '<title>파트너맵 통합 셸</title>',
        '<style>',
        'body{margin:0;font-family:Pretendard,system-ui,sans-serif;background:linear-gradient(135deg,#eef4eb 0%,#f7f1ea 100%);color:#1f2c22;}',
        '.shell{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;}',
        '.panel{width:min(720px,100%);padding:28px;border-radius:24px;background:rgba(255,255,255,.88);box-shadow:0 18px 40px rgba(44,62,48,.14);border:1px solid rgba(44,62,48,.08);}',
        '.eyebrow{margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5d7a57;}',
        'h1{margin:0 0 10px;font-size:28px;line-height:1.35;letter-spacing:-.03em;}',
        'p{margin:0;font-size:14px;line-height:1.8;color:#56635b;}',
        '.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px;}',
        '.chip{display:inline-flex;align-items:center;min-height:28px;padding:0 12px;border-radius:999px;background:#f4eee7;color:#6B4C3B;font-size:12px;font-weight:700;}',
        '</style>',
        '</head>',
        '<body>',
        '<div class="shell">',
        '<div class="panel">',
        '<p class="eyebrow">Local Partner Map Shell</p>',
        '<h1>실서비스에서는 이 영역이 기존 파트너맵으로 대체됩니다.</h1>',
        '<p>Playwright 로컬 검증에서는 오프라인 클래스 탐색 플로우만 확인할 수 있도록 가벼운 셸 페이지를 사용합니다.</p>',
        '<div class="chips" id="chips"></div>',
        '</div>',
        '</div>',
        '<script>',
        "(function(){'use strict';var params=new URLSearchParams(window.location.search);var chips=document.getElementById('chips');var keys=[['region','지역'],['category','카테고리'],['keyword','검색어'],['partner','파트너']];var html='';var i;for(i=0;i<keys.length;i++){var value=params.get(keys[i][0]);if(value){html+='<span class=\"chip\">'+keys[i][1]+': '+String(value).replace(/[&<>\"']/g,'')+'</span>';}}chips.innerHTML=html||'<span class=\"chip\">필터 없음</span>';})();",
        '</script>',
        '</body>',
        '</html>'
    ].join('\n');
}

function main() {
    var i;

    ensureDir(outputDir);

    for (i = 0; i < pages.length; i++) {
        fs.writeFileSync(pages[i].output, buildFixture(pages[i]), 'utf8');
        console.log('built', path.relative(repoRoot, pages[i].output));
    }

    fs.writeFileSync(path.join(outputDir, 'partnermap-shell.html'), buildPartnerMapShell(), 'utf8');
    console.log('built', path.relative(repoRoot, path.join(outputDir, 'partnermap-shell.html')));
}

main();
