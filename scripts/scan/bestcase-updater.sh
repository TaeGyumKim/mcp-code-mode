#!/bin/bash
# BestCase 자동 업데이트 스크립트
# 컨테이너 시작 시 및 주기적으로 실행됩니다.

set -e

echo "🔄 Starting BestCase Auto Update Service"

# 초기 스캔 실행 (컨테이너 시작 시)
echo "📊 Running initial scan..."
node /app/auto-scan-projects.js

# 주기적 업데이트 (6시간마다)
while true; do
  echo "⏰ Next scan in 6 hours..."
  sleep 21600  # 6시간 = 21600초
  
  echo "📊 Running scheduled scan..."
  node /app/auto-scan-projects.js
done
