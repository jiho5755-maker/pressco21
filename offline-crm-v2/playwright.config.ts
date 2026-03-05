import { defineConfig, devices } from '@playwright/test'

/**
 * PRESSCO21 Offline CRM v2 Playwright 설정
 *
 * 전제 조건:
 *   1. NocoDB 서버가 실행 중이어야 함 (https://nocodb.pressco21.com)
 *   2. Vite dev server가 localhost:5173에서 실행 중이어야 함
 *      (webServer 설정으로 자동 기동됨)
 *   3. .env.test 파일에 VITE_NOCODB_TOKEN이 설정되어 있어야 함
 *
 * 실행: npm run test:e2e
 */
export default defineConfig({
  // 테스트 파일 위치
  testDir: './tests',

  // 각 테스트 최대 실행 시간 (NocoDB API 응답 대기 포함)
  timeout: 60_000,

  // expect() 단언 최대 대기 시간
  expect: {
    timeout: 15_000,
  },

  // 병렬 실행 비활성화 (NocoDB 쓰기 테스트 충돌 방지)
  fullyParallel: false,
  workers: 1,

  // 실패 시 재시도 없음 (CI 환경에서는 1회 재시도 권장)
  retries: 0,

  // 리포터 설정
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  // 공통 설정
  use: {
    baseURL: 'http://localhost:5173',

    // 모든 테스트 브라우저: Chromium (데스크탑)
    ...devices['Desktop Chrome'],

    // 실패 시 스크린샷 저장
    screenshot: 'only-on-failure',

    // 실패 시 트레이스 저장 (디버깅용)
    trace: 'on-first-retry',

    // 실패 시 비디오 저장
    video: 'on-first-retry',

    // 출력 폴더
    outputDir: 'test-results/',

    // NocoDB API 응답이 느릴 수 있으므로 넉넉하게 설정
    navigationTimeout: 30_000,
    actionTimeout: 15_000,

    // 한국어 로케일
    locale: 'ko-KR',
  },

  // Vite dev server 자동 기동 (테스트 시작 전)
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,  // 이미 실행 중이면 재사용
    timeout: 30_000,
    // 환경변수는 .env.local 또는 .env를 Vite가 자동으로 읽음
  },

  // 프로젝트별 브라우저 설정 (기본: Chrome만)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
