#!/bin/bash

# 프레스코21 브랜드 헤리티지 페이지 - 로컬 테스트 스크립트

echo "======================================"
echo "  로컬 테스트 서버 시작"
echo "======================================"
echo ""
echo "📍 URL: http://localhost:8000"
echo ""
echo "✅ 테스트 체크리스트:"
echo "  1. Slick 캐러셀 작동 확인 (Publications 섹션)"
echo "  2. Pretendard 폰트 로드 확인 (개발자 도구 → Network)"
echo "  3. 플로팅 버튼 표시 및 hover 효과"
echo "  4. 플로팅 버튼 → 쇼핑몰 이동 확인"
echo "  5. Legacy CTA 버튼 → 쇼핑몰 이동 확인"
echo "  6. Gallery 라이트박스 작동"
echo "  7. Stats 카운터 애니메이션"
echo "  8. 반응형 디자인 확인 (개발자 도구 → Device Toolbar)"
echo ""
echo "⌨️  종료: Ctrl + C"
echo "======================================"
echo ""

# 현재 디렉토리 확인
if [ ! -f "index.html" ]; then
    echo "❌ 오류: index.html 파일을 찾을 수 없습니다."
    echo "   현재 디렉토리: $(pwd)"
    echo "   올바른 경로로 이동해주세요:"
    echo "   cd /Users/jangjiho/workspace/brand-intro-page"
    exit 1
fi

# Python 3 확인
if ! command -v python3 &> /dev/null; then
    echo "❌ 오류: Python 3가 설치되지 않았습니다."
    echo "   설치 방법: brew install python3"
    exit 1
fi

# 서버 시작
python3 -m http.server 8000
