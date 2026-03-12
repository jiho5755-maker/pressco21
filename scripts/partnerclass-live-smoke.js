const fs = require('node:fs');
const path = require('node:path');

const { chromium, request } = require('playwright');

const baseUrl = 'https://www.foreverlove.co.kr';
const outputDir = path.resolve(process.cwd(), 'output/playwright/partnerclass-20260310-fix');
const resultsPath = path.join(outputDir, 'partnerclass-live-results.json');
const partnerMemberId = process.env.PARTNER_MEMBER_ID || '';
const partnerMemberPassword = process.env.PARTNER_MEMBER_PASSWORD || '';
const minFaqCount = Number(process.env.PARTNERCLASS_MIN_FAQ_COUNT || 10);
const maxFaqCount = Number(process.env.PARTNERCLASS_MAX_FAQ_COUNT || 15);

const results = [];

function ensureOutputDir() {
  fs.mkdirSync(outputDir, { recursive: true });
}

function logResult(name, passed, detail, extra) {
  const entry = {
    name,
    passed,
    detail,
    extra: extra || null,
  };
  results.push(entry);
  const label = passed ? 'PASS' : 'FAIL';
  console.log(`[${label}] ${name}: ${detail}`);
}

function logSkipped(name, detail, extra) {
  const entry = {
    name,
    passed: null,
    skipped: true,
    detail,
    extra: extra || null,
  };
  results.push(entry);
  console.log(`[SKIP] ${name}: ${detail}`);
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function captureFullPage(page, fileName) {
  ensureOutputDir();
  const fullPath = path.join(outputDir, fileName);
  await page.screenshot({ path: fullPath, fullPage: true });
  return fullPath;
}

function requirePartnerCredentials() {
  if (!partnerMemberId || !partnerMemberPassword) {
    throw new Error('PARTNER_MEMBER_ID / PARTNER_MEMBER_PASSWORD 환경변수가 필요합니다.');
  }
}

function hasPartnerCredentials() {
  return Boolean(partnerMemberId && partnerMemberPassword);
}

async function loginAsPartner(page) {
  requirePartnerCredentials();

  await page.goto(`${baseUrl}/shop/member.html?type=login`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /아이디로 로그인하기/ }).click();
  await page.getByRole('textbox', { name: '아이디' }).fill(partnerMemberId);
  await page.getByRole('textbox', { name: '비밀번호' }).fill(partnerMemberPassword);
  await Promise.all([
    page.waitForURL(/\/html\/mainm\.html/, { timeout: 15000, waitUntil: 'domcontentloaded' }),
    page.getByRole('link', { name: '로그인' }).click(),
  ]);
}

function numericValue(value) {
  return Number(String(value || '').replace(/[^\d]/g, ''));
}

function normalizePercent(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return 0;
  }
  return numberValue <= 1 ? Math.round(numberValue * 100) : Math.round(numberValue);
}

function resolvePartnerDisplayGrade(authData) {
  const rawGrade = String(authData?.grade || '').toUpperCase();
  const liveGrades = ['BLOOM', 'GARDEN', 'ATELIER', 'AMBASSADOR'];
  if (liveGrades.includes(rawGrade)) {
    return rawGrade;
  }

  const commissionRate = normalizePercent(authData?.commission_rate);
  const commissionGradeMap = {
    25: 'BLOOM',
    20: 'GARDEN',
    15: 'ATELIER',
    10: 'AMBASSADOR',
  };
  if (commissionGradeMap[commissionRate]) {
    return commissionGradeMap[commissionRate];
  }

  const legacyFallback = {
    SILVER: 'GARDEN',
    GOLD: 'BLOOM',
    PLATINUM: 'ATELIER',
  };
  return legacyFallback[rawGrade] || 'BLOOM';
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function formatFaqExpectation() {
  return `${minFaqCount}~${maxFaqCount}`;
}

async function waitForOverlayHidden(page, selector, timeout = 15000) {
  await page.waitForFunction((targetSelector) => {
    const element = document.querySelector(targetSelector);
    if (!element) return true;
    const style = window.getComputedStyle(element);
    return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
  }, selector, { timeout });
}

async function getVisibleLocator(page, selector) {
  const locator = page.locator(selector);
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible().catch(() => false)) {
      return candidate;
    }
  }
  return null;
}

async function openFirstClassDetail(page) {
  await page.goto(`${baseUrl}/shop/page.html?id=2606`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.class-card', { timeout: 15000 });

  const firstCard = page.locator('.class-card').first();
  const sourceHref = await firstCard.evaluate((node) => {
    const anchor = node.closest('a') || node.querySelector('a');
    return (anchor && anchor.getAttribute('href')) || node.getAttribute('href') || node.getAttribute('data-href') || '';
  });
  assert(sourceHref, '첫 클래스 상세 링크를 찾지 못했습니다.');
  await page.goto(new URL(sourceHref, baseUrl).toString(), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#detailContent', { timeout: 15000 });

  return {
    sourceHref,
    detailUrl: page.url(),
  };
}

async function openFirstReservableClassDetail(page) {
  await page.goto(`${baseUrl}/shop/page.html?id=2606`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.class-card', { timeout: 15000 });

  const cards = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.class-card')).map((card) => {
      const anchor = card.closest('a') || card.querySelector('a');
      const titleNode = card.querySelector('.class-card__title');
      const remainingNode = card.querySelector('.class-card__remaining');
      return {
        title: titleNode ? String(titleNode.textContent || '').trim() : '',
        href: anchor ? (anchor.getAttribute('href') || '') : '',
        remainingText: remainingNode ? String(remainingNode.textContent || '').trim() : '',
      };
    }).filter((item) => item.href);
  });
  assert(cards.length > 0, '예약 가능한 상세 링크 후보가 없습니다.');

  for (let index = 0; index < cards.length; index += 1) {
    await page.goto(new URL(cards[index].href, baseUrl).toString(), { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#detailContent', { timeout: 15000 });
    await page.waitForTimeout(500);
    const datePickerEnabled = await page.locator('#datePicker').isEnabled().catch(() => false);
    if (datePickerEnabled) {
      return {
        sourceHref: cards[index].href,
        detailUrl: page.url(),
        title: cards[index].title,
        listRemainingText: cards[index].remainingText,
      };
    }
  }

  throw new Error('예약 가능한 상세 페이지를 찾지 못했습니다. candidates=' + cards.map((item) => item.title || item.href).join(' | '));
}

async function chooseFirstSchedule(page) {
  await page.locator('#datePicker').click();
  const availableLabels = await page.locator('.flatpickr-day:not(.flatpickr-disabled):not(.prevMonthDay):not(.nextMonthDay)').evaluateAll((nodes) => {
    return nodes
      .map((node) => node.getAttribute('aria-label'))
      .filter((value) => Boolean(value));
  });
  assert(availableLabels.length > 0, '선택 가능한 날짜가 없습니다.');

  await page.getByLabel(availableLabels[0]).click();
  await page.waitForSelector('.cd-time-slot', { timeout: 10000 });

  const firstSlot = page.locator('.cd-time-slot').first();
  const slotText = String(await firstSlot.textContent() || '').trim();
  await firstSlot.click();
  await page.waitForTimeout(250);

  return {
    selectedDate: availableLabels[0],
    selectedSlot: slotText,
  };
}

async function verifyLoginRedirect(page, config) {
  const {
    pageId,
    pageName,
    selector,
    requireReturnUrl,
    setup,
  } = config;

  await page.goto(`${baseUrl}/shop/page.html?id=${pageId}`, { waitUntil: 'domcontentloaded' });

  if (typeof setup === 'function') {
    await setup(page);
  }

  const target = await getVisibleLocator(page, selector);
  assert(target, `${pageName} 로그인 버튼을 찾지 못했습니다. selector=${selector}`);

  const href = await target.getAttribute('href');
  assert(href && href.indexOf('/shop/member.html?type=login') > -1, `${pageName} href가 올바르지 않습니다: ${href}`);

  await Promise.all([
    page.waitForURL((url) => {
      return url.pathname === '/shop/member.html' && url.searchParams.get('type') === 'login';
    }, { timeout: 15000 }),
    target.click(),
  ]);

  const finalUrl = new URL(page.url());
  assert(finalUrl.pathname === '/shop/member.html', `${pageName} 이동 경로가 로그인 페이지가 아닙니다: ${page.url()}`);
  assert(finalUrl.searchParams.get('type') === 'login', `${pageName} type=login 파라미터가 없습니다: ${page.url()}`);

  const returnUrl = finalUrl.searchParams.get('returnUrl') || '';
  if (requireReturnUrl) {
    assert(returnUrl.indexOf(`/shop/page.html?id=${pageId}`) > -1, `${pageName} returnUrl이 현재 페이지를 가리키지 않습니다: ${returnUrl}`);
  }

  return {
    href,
    finalUrl: page.url(),
    returnUrl: returnUrl || null,
  };
}

async function collectVisibleDetailLinks(page) {
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.class-detail a.info-badge--link, .class-detail .detail-explore__link'))
      .map((node) => {
        const style = window.getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return {
          text: String(node.textContent || '').trim(),
          href: node.getAttribute('href') || '',
          visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
        };
      })
      .filter((item) => item.visible && item.href);
  });

  const deduped = [];
  const seen = new Set();
  for (let index = 0; index < links.length; index += 1) {
    const key = `${links[index].href}::${links[index].text}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(links[index]);
    }
  }
  return deduped;
}

async function waitForCatalogReady(page) {
  await page.waitForFunction(() => {
    const cards = document.querySelectorAll('.class-card').length;
    const empty = document.getElementById('catalogEmpty');
    const error = document.getElementById('catalogError');
    const emptyVisible = !!empty && window.getComputedStyle(empty).display !== 'none';
    const errorVisible = !!error && window.getComputedStyle(error).display !== 'none';
    return cards > 0 || emptyVisible || errorVisible;
  }, { timeout: 15000 });
}

async function validateCatalogLinkTarget(page, href) {
  const targetUrl = new URL(href, baseUrl);
  assert(targetUrl.searchParams.get('id') === '2606', `목록 페이지 링크가 아닙니다: ${targetUrl.toString()}`);

  await page.goto(targetUrl.toString(), { waitUntil: 'domcontentloaded' });
  await waitForCatalogReady(page);

  const cardCount = await page.locator('.class-card').count();
  assert(cardCount > 0, `링크 결과가 비었습니다: ${targetUrl.toString()}`);

  const expectedCategory = targetUrl.searchParams.get('category') || '';
  const expectedLevel = targetUrl.searchParams.get('level') || '';
  const expectedRegion = targetUrl.searchParams.get('region') || '';
  const expectedQuery = targetUrl.searchParams.get('q') || '';

  if (expectedCategory) {
    const categories = await page.locator('.class-card__category').evaluateAll((nodes) => {
      return nodes.map((node) => String(node.textContent || '').trim()).filter(Boolean);
    });
    assert(categories.length > 0, `카테고리 카드 배지가 없습니다: ${targetUrl.toString()}`);
    assert(categories.every((value) => value === expectedCategory), `카테고리 링크 결과가 섞였습니다: expected=${expectedCategory}, actual=${categories.join(' | ')}`);
  }

  if (expectedLevel) {
    const levels = await page.locator('.class-card__level').evaluateAll((nodes) => {
      return nodes.map((node) => String(node.textContent || '').trim()).filter(Boolean);
    });
    const checked = await page.locator(`input[name="level"][value="${expectedLevel}"]`).isChecked().catch(() => false);
    assert(checked, `난이도 체크박스가 선택되지 않았습니다: ${expectedLevel}`);
    assert(levels.length > 0, `난이도 카드 배지가 없습니다: ${targetUrl.toString()}`);
    assert(levels.every((value) => value === expectedLevel), `난이도 링크 결과가 섞였습니다: expected=${expectedLevel}, actual=${levels.join(' | ')}`);
  }

  if (expectedRegion) {
    const locations = await page.locator('.class-card__location').evaluateAll((nodes) => {
      return nodes.map((node) => String(node.textContent || '').trim()).filter(Boolean);
    });
    const checked = await page.locator(`input[name="region"][value="${expectedRegion}"]`).isChecked().catch(() => false);
    assert(checked, `지역 체크박스가 선택되지 않았습니다: ${expectedRegion}`);
    assert(locations.length > 0, `지역 카드 메타가 없습니다: ${targetUrl.toString()}`);
    assert(locations.every((value) => value.indexOf(expectedRegion) > -1), `지역 링크 결과가 섞였습니다: expected=${expectedRegion}, actual=${locations.join(' | ')}`);
  }

  if (expectedQuery) {
    const queryMatched = await page.locator('.class-card').evaluateAll((nodes, query) => {
      return nodes.every((node) => {
        const title = String(node.querySelector('.class-card__title')?.textContent || '').trim();
        const partner = String(node.querySelector('.class-card__partner')?.textContent || '').trim();
        return title.indexOf(query) > -1 || partner.indexOf(query) > -1;
      });
    }, expectedQuery);
    assert(queryMatched, `강사 검색 링크 결과가 검색어와 맞지 않습니다: q=${expectedQuery}`);
  }

  return {
    cardCount,
    expectedCategory,
    expectedLevel,
    expectedRegion,
    expectedQuery,
  };
}

async function waitForPartnerDashboardReady(page) {
  await page.waitForSelector('#pdMainArea', { timeout: 15000 });
  await page.waitForFunction(() => {
    const badge = document.getElementById('pdGradeBadge');
    return !!badge && !!String(badge.textContent || '').trim();
  }, { timeout: 15000 });
  await waitForOverlayHidden(page, '#pdLoadingOverlay', 15000);
}

async function fetchPartnerAuth() {
  const apiRequest = await request.newContext();
  try {
    const response = await apiRequest.post('https://n8n.pressco21.com/webhook/partner-auth', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        action: 'getPartnerAuth',
        member_id: partnerMemberId,
      },
    });
    assert(response.ok(), `파트너 인증 API HTTP 실패: ${response.status()}`);
    const json = await response.json();
    assert(json.success && json.data, '파트너 인증 API 데이터가 없습니다.');
    return json.data;
  } finally {
    await apiRequest.dispose();
  }
}

async function runScenario(name, callback, page) {
  try {
    const detail = await callback();
    logResult(name, true, detail);
  } catch (error) {
    let failureDetail = error.message;
    const capturePage = typeof page === 'function' ? page() : page;
    if (capturePage) {
      try {
        const shot = await captureFullPage(capturePage, `fail-${slugify(name)}.png`);
        failureDetail += `\nScreenshot: ${shot}`;
      } catch (shotError) {
        failureDetail += `\nScreenshotError: ${shotError.message}`;
      }
    }
    logResult(name, false, failureDetail);
  }
}

async function runGuestScenarios(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();

  await runScenario('목록 기본 렌더링', async () => {
    await page.goto(`${baseUrl}/shop/page.html?id=2606`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.class-card', { timeout: 15000 });

    const cardCount = await page.locator('.class-card').count();
    const remainingText = await page.locator('.class-card__remaining').first().textContent();

    assert(cardCount >= 6, `클래스 카드 수가 기대보다 적습니다. count=${cardCount}`);
    assert(remainingText && remainingText.includes('잔여'), '첫 카드에 잔여석 배지가 없습니다.');

    return `클래스 ${cardCount}건, 첫 카드 배지: ${remainingText.trim()}`;
  }, page);

  await runScenario('목록 정렬/서울 필터/찜 필터', async () => {
    await page.goto(`${baseUrl}/shop/page.html?id=2606`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.class-card', { timeout: 15000 });
    await page.evaluate(() => window.localStorage.removeItem('pressco21_wishlist'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.class-card', { timeout: 15000 });

    await page.selectOption('#sortSelect', { label: '가격 높은순' });
    await page.waitForTimeout(500);

    const sortedPrices = await page.locator('.class-card').evaluateAll((nodes) => {
      return nodes.map((node) => {
        const priceText = node.querySelector('.class-card__price')?.textContent || '';
        return Number(priceText.replace(/[^\d]/g, ''));
      });
    });
    const descending = [...sortedPrices].sort((a, b) => b - a);
    assert(JSON.stringify(sortedPrices) === JSON.stringify(descending), `가격 정렬 실패: ${sortedPrices.join(', ')}`);

    await page.locator('input[name="region"][value="서울"]').check();
    await page.waitForFunction(() => {
      const locations = Array.from(document.querySelectorAll('.class-card .class-card__location'))
        .map((node) => String(node.textContent || '').trim())
        .filter(Boolean);
      return locations.length > 0 && locations.every((location) => location.indexOf('서울') > -1);
    }, { timeout: 15000 });
    const seoulLocations = await page.locator('.class-card .class-card__location').evaluateAll((nodes) => {
      return nodes.map((node) => (node.textContent || '').trim());
    });
    assert(seoulLocations.length > 0, '서울 필터 결과가 비었습니다.');
    assert(seoulLocations.every((location) => location.includes('서울')), `서울 외 지역이 포함되었습니다: ${seoulLocations.join(' | ')}`);

    const wishedClassId = await page.locator('.wishlist-btn').first().getAttribute('data-class-id');
    await page.locator('.wishlist-btn').first().click();
    await page.waitForTimeout(300);
    await page.locator('#wishlistFilterBtn').click();
    await page.waitForTimeout(500);
    const wishedCount = await page.locator('.class-card').count();
    if (wishedCount !== 1) {
      const wishlistState = await page.evaluate(() => window.localStorage.getItem('pressco21_wishlist'));
      const renderedIds = await page.locator('.class-card').evaluateAll((nodes) => {
        return nodes.map((node) => node.getAttribute('data-class-id'));
      });
      throw new Error(`찜 필터 결과가 1건이 아닙니다. count=${wishedCount}, wishedClassId=${wishedClassId}, wishlist=${wishlistState}, rendered=${renderedIds.join(',')}`);
    }

    const shot = await captureFullPage(page, 'list-filter-sort-favorite.png');
    return `가격 정렬/서울 필터/찜 필터 확인, screenshot=${shot}`;
  }, page);

  await runScenario('협회 제휴 탭 렌더링', async () => {
    await page.goto(`${baseUrl}/shop/page.html?id=2606`, { waitUntil: 'domcontentloaded' });
    await page.locator('#tabAffiliations').click();
    await page.waitForTimeout(500);
    const affilText = await page.locator('#panelAffiliations').innerText();
    assert(affilText.includes('한국꽃공예협회'), '협회 카드가 보이지 않습니다.');
    assert(affilText.includes('인센티브'), '협회 인센티브 섹션이 보이지 않습니다.');
    return '협회 카드 및 인센티브 섹션 확인';
  }, page);

  await runScenario('비로그인 로그인 안내 링크 5페이지', async () => {
    const checks = [
      { pageId: '2609', pageName: '파트너신청', selector: '#paLoginBtn', requireReturnUrl: true },
      { pageId: '2608', pageName: '파트너 대시보드', selector: '#pdLoginBtn', requireReturnUrl: true },
      { pageId: '8009', pageName: '강의등록', selector: '#crLoginBtn', requireReturnUrl: true },
      { pageId: '8010', pageName: '마이페이지', selector: '.mb-notice__btn', requireReturnUrl: false },
      { pageId: '2610', pageName: '교육', selector: '#peLoginBtn', requireReturnUrl: true },
    ];

    const summaries = [];
    for (let index = 0; index < checks.length; index += 1) {
      const result = await verifyLoginRedirect(page, checks[index]);
      summaries.push(`${checks[index].pageName}=>${result.finalUrl}`);
    }

    return summaries.join(' | ');
  }, page);

  await runScenario('상세 비로그인 후기 로그인 경로', async () => {
    const detail = await openFirstClassDetail(page);
    await page.locator('#tab-reviews').click();

    const reviewLoginBtn = await getVisibleLocator(page, '.review-write-login__btn');
    assert(reviewLoginBtn, '상세 후기 로그인 버튼이 보이지 않습니다.');

    const href = await reviewLoginBtn.getAttribute('href');
    assert(href && href.indexOf('/shop/member.html?type=login') > -1, `상세 후기 로그인 href가 올바르지 않습니다: ${href}`);

    await Promise.all([
      page.waitForURL((url) => {
        return url.pathname === '/shop/member.html' && url.searchParams.get('type') === 'login';
      }, { timeout: 15000 }),
      reviewLoginBtn.click(),
    ]);

    const finalUrl = new URL(page.url());
    const returnUrl = finalUrl.searchParams.get('returnUrl') || '';
    assert(returnUrl.indexOf('/shop/page.html?id=2607') > -1, `상세 후기 returnUrl이 잘못되었습니다: ${returnUrl}`);

    return `detail=${detail.detailUrl} => login=${page.url()}`;
  }, page);

  await runScenario('상세 일정/수량/탭 전환', async () => {
    const detail = await openFirstReservableClassDetail(page);

    await page.locator('#datePicker').click();
    const availableLabels = await page.locator('.flatpickr-day:not(.flatpickr-disabled):not(.prevMonthDay):not(.nextMonthDay)').evaluateAll((nodes) => {
      return nodes
        .map((node) => node.getAttribute('aria-label'))
        .filter((value) => Boolean(value));
    });
    assert(availableLabels.length >= 2, `선택 가능한 날짜가 부족합니다. count=${availableLabels.length}`);

    await page.getByLabel(availableLabels[0]).click();
    await page.waitForSelector('.cd-time-slot', { timeout: 10000 });
    const timeSlotTexts = await page.locator('.cd-time-slot').allTextContents();
    assert(timeSlotTexts.length > 0, '시간 슬롯이 렌더링되지 않았습니다.');
    assert(timeSlotTexts[0].includes('잔여'), `잔여석 문구가 없습니다: ${timeSlotTexts[0]}`);

    await page.locator('.cd-time-slot').first().click();
    await page.locator('#quantityPlus').click();
    const quantity = await page.locator('#quantityValue').textContent();
    const totalPriceText = await page.locator('#bookingPrice .booking-price__total-value').textContent();
    assert(String(quantity).trim() === '2', `인원 증가가 반영되지 않았습니다. quantity=${quantity}`);
    assert(totalPriceText && totalPriceText.includes('100,000원'), `총액 계산이 기대와 다릅니다: ${totalPriceText}`);

    const tabIds = ['#tab-description', '#tab-curriculum', '#tab-instructor', '#tab-reviews', '#tab-faq'];
    for (let index = 0; index < tabIds.length; index += 1) {
      await page.locator(tabIds[index]).click();
      const selected = await page.locator(tabIds[index]).getAttribute('aria-selected');
      assert(selected === 'true', `탭 선택 상태 반영 실패: ${tabIds[index]}`);
    }

    return `detail=${detail.detailUrl}, 날짜 ${availableLabels.slice(0, 2).join(', ')}, 슬롯 ${timeSlotTexts.join(' | ')}`;
  }, page);

  await runScenario('상세 FAQ/잔여석 정합성', async () => {
    const detail = await openFirstReservableClassDetail(page);
    const listRemainingText = detail.listRemainingText;
    const listRemaining = numericValue(listRemainingText);
    assert(listRemaining > 0, `목록 잔여석 파싱 실패: ${listRemainingText}`);

    await page.locator('#datePicker').click();
    const availableDates = await page.locator('.flatpickr-day:not(.flatpickr-disabled):not(.prevMonthDay):not(.nextMonthDay)').evaluateAll((nodes) => {
      return nodes
        .map((node) => node.getAttribute('aria-label'))
        .filter((value) => Boolean(value));
    });
    assert(availableDates.length > 0, '상세에서 선택 가능한 날짜가 없습니다.');

    let totalRemaining = 0;
    for (let index = 0; index < availableDates.length; index += 1) {
      await page.locator('#datePicker').click();
      await page.getByLabel(availableDates[index]).click();
      await page.waitForTimeout(200);
      const slotRemainings = await page.locator('.cd-time-slot__remain').evaluateAll((nodes) => {
        return nodes.map((node) => Number((node.textContent || '').replace(/[^\d]/g, '')));
      });
      totalRemaining += slotRemainings.reduce((sum, value) => sum + value, 0);
    }
    assert(totalRemaining === listRemaining, `잔여석 불일치: list=${listRemaining}, detail=${totalRemaining}`);

    await page.locator('#tab-faq').click();
    await page.waitForSelector('.faq-item__question', { timeout: 10000 });
    const faqSearchVisible = await page.locator('#faqSearchInput').isVisible().catch(() => false);
    const faqCategoryCount = await page.locator('.faq-category-btn').count();
    const faqCount = await page.locator('.faq-item__question').count();
    assert(faqSearchVisible, 'FAQ 검색 입력이 보이지 않습니다.');
    assert(faqCategoryCount >= 6, `FAQ 카테고리 칩 개수가 부족합니다. count=${faqCategoryCount}`);
    assert(
      faqCount >= minFaqCount && faqCount <= maxFaqCount,
      `FAQ 개수가 기대 범위를 벗어났습니다. expected=${formatFaqExpectation()}, actual=${faqCount}`
    );
    for (let index = 0; index < faqCount; index += 1) {
      const question = page.locator('.faq-item__question').nth(index);
      await question.click();
      const expanded = await question.getAttribute('aria-expanded');
      assert(expanded === 'true', `FAQ 열기 실패 index=${index}`);
      await question.click();
      const collapsed = await question.getAttribute('aria-expanded');
      assert(collapsed === 'false', `FAQ 닫기 실패 index=${index}`);
    }

    const shot = await captureFullPage(page, 'detail-faq-remaining-consistency.png');
    return `detail=${detail.detailUrl}, 목록 ${listRemaining}석 = 상세 ${totalRemaining}석, FAQ ${faqCount}개, categories=${faqCategoryCount}, screenshot=${shot}`;
  }, page);

  await runScenario('상세 비정상 class_id 처리', async () => {
    await page.goto(`${baseUrl}/shop/page.html?id=2607&class_id=INVALID_ID`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const redirectedToList = /page\.html\?id=2606/.test(page.url());
    const hasError = await page.locator('#detailError').isVisible().catch(() => false);
    assert(redirectedToList || hasError, `비정상 class_id 처리 미확인. url=${page.url()}`);
    const shot = await captureFullPage(page, 'detail-invalid-state.png');
    return redirectedToList ? `목록 리다이렉트 확인, screenshot=${shot}` : `오류 상태 확인, screenshot=${shot}`;
  }, page);

  await runScenario('상세 분류 링크 회귀', async () => {
    await openFirstClassDetail(page);
    const links = await collectVisibleDetailLinks(page);

    const categoryLink = links.find((item) => item.href.indexOf('category=') > -1);
    const levelLink = links.find((item) => item.href.indexOf('level=') > -1);
    const regionLink = links.find((item) => item.href.indexOf('region=') > -1);
    const partnerLink = links.find((item) => item.href.indexOf('q=') > -1);

    assert(categoryLink, '카테고리 링크가 보이지 않습니다.');
    assert(levelLink, '난이도 링크가 보이지 않습니다.');
    assert(regionLink, '지역 링크가 보이지 않습니다.');

    const linksToCheck = [categoryLink, levelLink, regionLink];
    if (partnerLink) {
      linksToCheck.push(partnerLink);
    }

    const summaries = [];
    for (let index = 0; index < linksToCheck.length; index += 1) {
      const validation = await validateCatalogLinkTarget(page, linksToCheck[index].href);
      summaries.push(`${linksToCheck[index].text}=>${validation.cardCount}건`);
    }

    const shot = await captureFullPage(page, 'detail-classification-link-regression.png');
    return `${summaries.join(' | ')}, partnerLink=${partnerLink ? 'yes' : 'no'}, screenshot=${shot}`;
  }, page);

  await runScenario('마이페이지 비로그인 안내', async () => {
    await page.goto(`${baseUrl}/shop/page.html?id=8010`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const noticeVisible = await page.locator('#mbNoticeArea').isVisible().catch(() => false);
    assert(noticeVisible, '비로그인 안내 화면이 보이지 않습니다.');
    return '로그인 안내 화면 노출 확인';
  }, page);

  await context.close();
}

async function runMemberScenarios(browser) {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  await loginAsPartner(page);

  await runScenario('파트너 대시보드 탭 전환/CSV 다운로드', async () => {
    await page.goto(`${baseUrl}/shop/page.html?id=2608`, { waitUntil: 'domcontentloaded' });
    await waitForPartnerDashboardReady(page);

    const authData = await fetchPartnerAuth();
    const expectedGrade = resolvePartnerDisplayGrade(authData);
    const gradeText = await page.locator('#pdGradeBadge').textContent();
    assert(String(gradeText).includes(expectedGrade), `등급 배지가 기대값과 다릅니다. expected=${expectedGrade}, actual=${gradeText}`);

    const tabs = [
      { button: '#pdTabBtnClasses', panel: '#pdTabClasses' },
      { button: '#pdTabBtnBookings', panel: '#pdTabBookings' },
      { button: '#pdTabBtnRevenue', panel: '#pdTabRevenue' },
      { button: '#pdTabBtnReviews', panel: '#pdTabReviews' },
      { button: '#pdTabBtnSchedules', panel: '#pdTabSchedules' },
    ];

    for (let index = 0; index < tabs.length; index += 1) {
      await page.locator(tabs[index].button).click();
      const visible = await page.locator(tabs[index].panel).isVisible();
      assert(visible, `탭 패널이 보이지 않습니다: ${tabs[index].panel}`);
    }

    await page.locator('#pdTabBtnRevenue').click();

    let csvResult = '';
    try {
      const downloadPromise = page.waitForEvent('download', { timeout: 2500 });
      await page.locator('#pdBtnCsvExport').click();
      const download = await downloadPromise;
      assert(download.suggestedFilename().toLowerCase().includes('.csv'), `CSV 다운로드 파일명이 아닙니다: ${download.suggestedFilename()}`);
      csvResult = `csv=${download.suggestedFilename()}`;
    } catch (downloadError) {
      const toastText = await page.locator('.pd-toast').last().textContent().catch(() => '');
      assert(toastText && (toastText.includes('정산 내역이 없습니다') || toastText.includes('데이터가 없습니다')), `CSV 다운로드/토스트 모두 미확인: ${downloadError.message}`);
      csvResult = `toast=${String(toastText).trim()}`;
    }

    return `등급=${String(gradeText).trim()}, ${csvResult}`;
  }, page);

  let schedulePage = null;
  await runScenario('파트너 일정 관리 탭', async () => {
    schedulePage = await context.newPage();
    await schedulePage.goto(`${baseUrl}/shop/page.html?id=2608`, { waitUntil: 'domcontentloaded' });
    await waitForPartnerDashboardReady(schedulePage);
    await schedulePage.waitForTimeout(800);
    await waitForOverlayHidden(schedulePage, '#pdLoadingOverlay', 15000);

    await schedulePage.locator('#pdTabBtnSchedules').evaluate((element) => element.click());
    try {
      await schedulePage.waitForFunction(() => {
        const panel = document.getElementById('pdTabSchedules');
        const button = document.getElementById('pdTabBtnSchedules');
        const select = document.getElementById('pdScheduleClass');
        const optionCount = select ? select.querySelectorAll('option').length : 0;
        return !!panel
          && !!button
          && window.getComputedStyle(panel).display !== 'none'
          && panel.classList.contains('is-active')
          && button.classList.contains('is-active')
          && optionCount > 1;
      }, { timeout: 15000 });
    } catch (tabError) {
      const debugState = await schedulePage.evaluate(() => {
        const panel = document.getElementById('pdTabSchedules');
        const button = document.getElementById('pdTabBtnSchedules');
        const select = document.getElementById('pdScheduleClass');
        const overlay = document.getElementById('pdLoadingOverlay');
        return {
          panelClass: panel ? panel.className : 'missing',
          panelDisplay: panel ? window.getComputedStyle(panel).display : 'missing',
          buttonClass: button ? button.className : 'missing',
          buttonAriaSelected: button ? button.getAttribute('aria-selected') : 'missing',
          optionCount: select ? select.querySelectorAll('option').length : 0,
          overlayDisplay: overlay ? window.getComputedStyle(overlay).display : 'missing'
        };
      });
      throw new Error(`${tabError.message} ${JSON.stringify(debugState)}`);
    }
    await schedulePage.waitForTimeout(500);
    await waitForOverlayHidden(schedulePage, '#pdLoadingOverlay', 15000);

    const optionCount = await schedulePage.locator('#pdScheduleClass option').count();
    assert(optionCount > 1, `일정 관리용 강의 옵션이 부족합니다. optionCount=${optionCount}`);

    const firstValue = await schedulePage.locator('#pdScheduleClass option').nth(1).getAttribute('value');
    assert(firstValue, '첫 강의 value가 비어 있습니다.');
    await schedulePage.selectOption('#pdScheduleClass', firstValue);
    await schedulePage.waitForTimeout(1000);
    await waitForOverlayHidden(schedulePage, '#pdLoadingOverlay', 15000);

    const addButtonVisible = await schedulePage.locator('#pdBtnAddSchedule').isVisible();
    if (!addButtonVisible) {
      const debugState = await schedulePage.evaluate(() => {
        const select = document.getElementById('pdScheduleClass');
        const button = document.getElementById('pdBtnAddSchedule');
        const panel = document.getElementById('pdTabSchedules');
        return {
          selected: select ? select.value : '',
          buttonDisplay: button ? window.getComputedStyle(button).display : 'missing',
          panelDisplay: panel ? window.getComputedStyle(panel).display : 'missing',
          overlayDisplay: document.getElementById('pdLoadingOverlay') ? window.getComputedStyle(document.getElementById('pdLoadingOverlay')).display : 'missing',
        };
      });
      throw new Error(`일정 추가 버튼이 보이지 않습니다. ${JSON.stringify(debugState)}`);
    }

    await schedulePage.locator('#pdBtnAddSchedule').click();
    const formVisible = await schedulePage.locator('#pdScheduleForm').isVisible();
    assert(formVisible, '일정 추가 폼이 열리지 않았습니다.');
    await schedulePage.locator('#pdBtnCancelSchedule').click();

    return `강의 옵션 ${optionCount - 1}건, 일정 추가 폼 열기/취소 확인`;
  }, () => schedulePage || page);
  if (schedulePage) {
    await schedulePage.close();
  }

  await runScenario('파트너 등급 게이지/승급표 정합성', async () => {
    await page.goto(`${baseUrl}/shop/page.html?id=2608`, { waitUntil: 'domcontentloaded' });
    await waitForPartnerDashboardReady(page);
    await page.locator('#pdTabBtnRevenue').click();
    await page.waitForFunction(() => {
      const panel = document.getElementById('pdTabRevenue');
      return !!panel && window.getComputedStyle(panel).display !== 'none';
    }, { timeout: 10000 });
    await page.waitForTimeout(1000);

    const authData = await fetchPartnerAuth();
    const expectedGrade = resolvePartnerDisplayGrade(authData);
    const gradeBadgeText = String(await page.locator('#pdGradeBadge').textContent() || '').trim();
    const commissionText = String(await page.locator('.pd-gauge-info__commission').textContent() || '').trim();
    const tierRows = await page.locator('.pd-grade-tiers__table tbody tr').count();
    assert(tierRows === 4, `승급 조건 테이블 행 수가 4가 아닙니다. count=${tierRows}`);

    const uiCommission = numericValue(commissionText);
    const apiCommission = normalizePercent(authData.commission_rate);
    assert(gradeBadgeText.includes(expectedGrade), `등급 배지 불일치: expected=${expectedGrade}, actual=${gradeBadgeText}`);
    assert(uiCommission === apiCommission, `수수료율 불일치: ui=${uiCommission}, api=${apiCommission}, badge=${gradeBadgeText}`);

    const shot = await captureFullPage(page, 'partner-grade-gauge-consistency.png');
    return `badge=${gradeBadgeText}, commission=${uiCommission}%, tiers=${tierRows}, screenshot=${shot}`;
  }, page);

  await runScenario('강의 등록 폼 검증/일정 추가/키트 토글', async () => {
    await page.goto(`${baseUrl}/shop/page.html?id=8009`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#crRegisterForm', { timeout: 15000 });

    await page.locator('#crSubmitBtn').click();
    await page.waitForTimeout(500);
    const visibleErrors = await page.locator('.cr-form__error:visible').count();
    assert(visibleErrors >= 7, `필수 검증 메시지가 부족합니다. count=${visibleErrors}`);

    await page.locator('#crAddScheduleBtn').click();
    const scheduleEntryCount = await page.locator('.cr-schedule-entry').count();
    assert(scheduleEntryCount === 1, `일정 항목 추가 실패. count=${scheduleEntryCount}`);

    await page.locator('label.cr-kit-toggle').click();
    await page.waitForTimeout(200);
    const kitAreaVisible = await page.locator('#crKitItemsArea').isVisible();
    assert(kitAreaVisible, '키트 영역이 열리지 않았습니다.');

    await page.locator('#crAddKitItemBtn').click();
    const kitItemCount = await page.locator('.cr-kit-item').count();
    assert(kitItemCount === 2, `키트 항목 추가 실패. count=${kitItemCount}`);

    const shot = await captureFullPage(page, 'class-register-validation-kit.png');
    return `error=${visibleErrors}, schedules=${scheduleEntryCount}, kitItems=${kitItemCount}, screenshot=${shot}`;
  }, page);

  await runScenario('상세 선물하기 주문서 진입', async () => {
    const detail = await openFirstClassDetail(page);
    const schedule = await chooseFirstSchedule(page);

    const giftBtn = page.locator('#bookingGift');
    const disabled = await giftBtn.isDisabled();
    assert(!disabled, '선물하기 버튼이 활성화되지 않았습니다.');

    await Promise.all([
      page.waitForURL(/\/shop\/order\.html|\/shop\/shopdetail\.html/, { timeout: 20000, waitUntil: 'domcontentloaded' }),
      giftBtn.click(),
    ]);

    const finalUrl = page.url();
    const isGiftOrderUrl = finalUrl.indexOf('/shop/order.html') > -1 && finalUrl.indexOf('direct_order=giveapresent') > -1;
    const hasGiftHeading = await page.getByText('선물 주문하기', { exact: false }).first().isVisible().catch(() => false);
    assert(isGiftOrderUrl || hasGiftHeading, `선물 주문서 진입에 실패했습니다: ${finalUrl}`);

    return `detail=${detail.detailUrl}, date=${schedule.selectedDate}, slot=${schedule.selectedSlot}, final=${finalUrl}`;
  }, page);

  await runScenario('마이페이지 로그인 상태 빈 화면', async () => {
    await page.goto(`${baseUrl}/shop/page.html?id=8010`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#mbMainArea', { timeout: 15000 });
    await waitForOverlayHidden(page, '#mbLoadingOverlay', 15000);
    await page.waitForTimeout(500);

    const totalText = await page.locator('#mbTotalCount').textContent();
    const emptyVisible = await page.locator('#mbEmptyState').isVisible().catch(() => false);
    const bookingCardCount = await page.locator('.mb-booking-card').count();
    assert(Number(String(totalText).trim()) >= 0, `마이페이지 총 예약 수 파싱 실패: ${totalText}`);
    assert(emptyVisible || bookingCardCount > 0, '빈 상태와 예약 목록이 모두 보이지 않습니다.');

    return emptyVisible ? '빈 상태 확인' : `예약 카드 ${bookingCardCount}건 확인`;
  }, page);

  await context.close();
}

async function runAdminScenarios(browser) {
  const simulatedAdminPage = await browser.newPage();

  await runScenario('관리자 비권한 접근 차단', async () => {
    await simulatedAdminPage.goto(`${baseUrl}/shop/page.html?id=8011`, { waitUntil: 'domcontentloaded' });
    await simulatedAdminPage.waitForTimeout(1000);
    const unauthorizedVisible = await simulatedAdminPage.locator('#adUnauthorized').isVisible().catch(() => false);
    assert(unauthorizedVisible, '비권한 접근 차단 화면이 보이지 않습니다.');
    return '비권한 접근 차단 화면 확인';
  }, simulatedAdminPage);

  await runScenario('관리자 API 읽기 전용 조회', async () => {
    const apiRequest = await request.newContext();

    const applicationsResp = await apiRequest.post('https://n8n.pressco21.com/webhook/admin-api', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer pressco21-admin-2026',
      },
      data: { action: 'getApplications', status: 'PENDING', page: 1, limit: 5 },
    });
    const classesResp = await apiRequest.post('https://n8n.pressco21.com/webhook/admin-api', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer pressco21-admin-2026',
      },
      data: { action: 'getPendingClasses', status: 'INACTIVE', page: 1, limit: 5 },
    });
    const settlementsResp = await apiRequest.post('https://n8n.pressco21.com/webhook/admin-api', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer pressco21-admin-2026',
      },
      data: { action: 'getSettlements', status: 'PENDING_SETTLEMENT', page: 1, limit: 5 },
    });
    const affiliationsResp = await apiRequest.post('https://n8n.pressco21.com/webhook/class-api', {
      headers: { 'Content-Type': 'application/json' },
      data: { action: 'getAffiliations' },
    });

    const applicationsJson = await applicationsResp.json();
    const classesJson = await classesResp.json();
    const settlementsJson = await settlementsResp.json();
    const affiliationsJson = await affiliationsResp.json();

    assert(applicationsResp.ok(), 'getApplications HTTP 실패');
    assert(classesResp.ok(), 'getPendingClasses HTTP 실패');
    assert(settlementsResp.ok(), 'getSettlements HTTP 실패');
    assert(affiliationsResp.ok(), 'getAffiliations HTTP 실패');
    assert(applicationsJson.success && applicationsJson.data && Array.isArray(applicationsJson.data.applications), '신청 목록 응답 형식이 올바르지 않습니다.');
    assert(classesJson.success && classesJson.data && Array.isArray(classesJson.data.classes), '강의 승인 대기 응답 형식이 올바르지 않습니다.');
    assert(settlementsJson.success && settlementsJson.data && Array.isArray(settlementsJson.data.settlements), '정산 대기 응답 형식이 올바르지 않습니다.');
    assert(affiliationsJson.success && Array.isArray(affiliationsJson.data), '협회 데이터 응답 형식이 올바르지 않습니다.');

    await apiRequest.dispose();

    return `applications=${applicationsJson.data.applications.length}, classes=${classesJson.data.classes.length}, settlements=${settlementsJson.data.settlements.length}, affiliations=${affiliationsJson.data.length}`;
  });

  await runScenario('관리자 양성 UI 시뮬레이션', async () => {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        const memberEl = document.getElementById('adMemberId');
        const groupEl = document.getElementById('adGroupName');
        const levelEl = document.getElementById('adGroupLevel');
        if (memberEl) memberEl.textContent = 'codex-admin-sim';
        if (groupEl) groupEl.textContent = '관리자';
        if (levelEl) levelEl.textContent = '0';
      });
    });
    const page = await context.newPage();

    await page.goto(`${baseUrl}/shop/page.html?id=8011`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const main = document.getElementById('adMain');
      return !!main && window.getComputedStyle(main).display !== 'none';
    }, { timeout: 15000 });
    await page.waitForFunction(() => {
      const count = document.getElementById('countApplications');
      return !!count && !!String(count.textContent || '').trim() && String(count.textContent || '').trim() !== '-';
    }, { timeout: 15000 });

    const countApplications = await page.locator('#countApplications').textContent();
    assert(countApplications && countApplications.trim() !== '-', `요약 카드가 로드되지 않았습니다: ${countApplications}`);

    const tabs = [
      { button: 'button[data-tab="applications"]', panel: '#panelApplications' },
      { button: 'button[data-tab="classes"]', panel: '#panelClasses' },
      { button: 'button[data-tab="settlements"]', panel: '#panelSettlements' },
      { button: 'button[data-tab="affiliations"]', panel: '#panelAffiliations' },
    ];

    for (let index = 0; index < tabs.length; index += 1) {
      await page.locator(tabs[index].button).click();
      await page.waitForTimeout(400);
      const panelVisible = await page.locator(tabs[index].panel).isVisible();
      assert(panelVisible, `관리자 탭 패널이 보이지 않습니다: ${tabs[index].panel}`);
    }

    const shot = await captureFullPage(page, 'admin-simulated-dashboard.png');
    await context.close();

    return `요약 대기 건수=${countApplications.trim()}, screenshot=${shot}`;
  });

  await simulatedAdminPage.close();
}

async function main() {
  ensureOutputDir();

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  try {
    await runGuestScenarios(browser);
    if (hasPartnerCredentials()) {
      await runMemberScenarios(browser);
    } else {
      logSkipped('파트너 전용 시나리오', 'PARTNER_MEMBER_ID / PARTNER_MEMBER_PASSWORD 미설정으로 건너뜀');
    }
    await runAdminScenarios(browser);
  } finally {
    await browser.close();
  }

  fs.writeFileSync(resultsPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    results,
  }, null, 2));

  const failed = results.filter((item) => item.passed === false);
  const skipped = results.filter((item) => item.skipped);
  const passedCount = results.filter((item) => item.passed === true).length;
  console.log(`총 ${results.length}건 중 ${passedCount}건 성공, ${failed.length}건 실패, ${skipped.length}건 건너뜀`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[FATAL]', error);
  process.exitCode = 1;
});
