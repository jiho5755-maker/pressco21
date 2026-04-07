#!/bin/bash
# memory-watchdog.sh — macOS 메모리 압력 기반 감지 + 알림
# 사용법: launchd로 60초마다 실행하거나, 터미널에서 직접 실행
#
# v3: 임계값 현실화 (16GB Mac 기준, v2는 Swap 3GB에서 과도하게 울림)
#
# 판단 기준:
#   - macOS memory_pressure의 "free percentage" 사용 (Inactive+Free+Purgeable 포함)
#   - Swap 사용량 급증 감지 (실제 성능 저하 지표)
#   - 경고: 여유 20% 이하 AND Swap 3GB 이상
#   - 위험: 여유 10% 이하 OR Swap 6GB 이상

FREE_WARN=20    # 여유 메모리 20% 이하면 경고 후보
FREE_CRIT=10    # 여유 메모리 10% 이하면 위험
SWAP_WARN=3072  # Swap 3GB 이상이면 경고 확정
SWAP_CRIT=6144  # Swap 6GB 이상이면 무조건 위험
LOG_FILE="$HOME/.local/log/memory-watchdog.log"

mkdir -p "$(dirname "$LOG_FILE")"

# macOS memory_pressure에서 여유 퍼센트 추출
get_free_pct() {
    memory_pressure 2>/dev/null | awk '/free percentage/ {print $NF}' | tr -d '%'
}

# Swap 사용량 (MB)
get_swap_used() {
    sysctl vm.swapusage 2>/dev/null | awk '{
        for(i=1;i<=NF;i++) {
            if($i=="used") { gsub(/M/,"",$(i+2)); printf "%.0f", $(i+2) }
        }
    }'
}

# 상위 메모리 소비 프로세스 목록
get_top_processes() {
    ps -eo rss,comm -r | head -6 | tail -5 | awk '{printf "  %s (%.0fMB)\n", $2, $1/1024}' | sed 's|.*/||'
}

free_pct=$(get_free_pct)
swap_mb=$(get_swap_used)
timestamp=$(date '+%Y-%m-%d %H:%M:%S')

# 값 검증
if [ -z "$free_pct" ] || [ -z "$swap_mb" ]; then
    echo "[$timestamp] ERROR: 메모리 정보 수집 실패 (free=$free_pct swap=$swap_mb)" >> "$LOG_FILE"
    exit 1
fi

level="OK"

# 위험 판단: 여유 15% 이하 OR Swap 3GB 이상
if [ "$free_pct" -le "$FREE_CRIT" ] 2>/dev/null || [ "$swap_mb" -ge "$SWAP_CRIT" ] 2>/dev/null; then
    level="CRITICAL"
    top_procs=$(get_top_processes)

    osascript -e "display notification \"여유 ${free_pct}% / Swap ${swap_mb}MB — 앱을 정리하세요\" with title \"메모리 위험\" subtitle \"시스템이 느려질 수 있습니다\" sound name \"Sosumi\""

    echo "[$timestamp] CRITICAL: free=${free_pct}% swap=${swap_mb}MB" >> "$LOG_FILE"
    echo "$top_procs" >> "$LOG_FILE"

# 경고 판단: 여유 25% 이하 AND Swap 1.5GB 이상 (둘 다 해당해야 경고)
elif [ "$free_pct" -le "$FREE_WARN" ] 2>/dev/null && [ "$swap_mb" -ge "$SWAP_WARN" ] 2>/dev/null; then
    level="WARNING"

    osascript -e "display notification \"여유 ${free_pct}% / Swap ${swap_mb}MB\" with title \"메모리 경고\" sound name \"Tink\""

    echo "[$timestamp] WARNING: free=${free_pct}% swap=${swap_mb}MB" >> "$LOG_FILE"
fi

# 디버그 로그 (5분에 1번만, 매분 기록 방지)
min=$(date '+%M')
if [ $((min % 5)) -eq 0 ] && [ "$level" = "OK" ]; then
    echo "[$timestamp] OK: free=${free_pct}% swap=${swap_mb}MB" >> "$LOG_FILE"
fi
