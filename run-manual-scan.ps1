# 수동으로 BestCase AI 분석 실행하는 스크립트 (PowerShell)

Write-Host "🤖 Manual BestCase AI Analysis" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Docker 컨테이너 확인
$mcpRunning = docker ps | Select-String "mcp-code-mode-server"
if (-not $mcpRunning) {
    Write-Host "❌ Error: mcp-code-mode-server container not running" -ForegroundColor Red
    Write-Host "Please start the container first:" -ForegroundColor Yellow
    Write-Host "  docker-compose -f docker-compose.ai.yml up -d" -ForegroundColor Yellow
    exit 1
}

$ollamaRunning = docker ps | Select-String "ollama-code-analyzer"
if (-not $ollamaRunning) {
    Write-Host "❌ Error: ollama-code-analyzer container not running" -ForegroundColor Red
    Write-Host "Please start Ollama:" -ForegroundColor Yellow
    Write-Host "  docker-compose -f docker-compose.ai.yml up -d ollama" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ All containers running" -ForegroundColor Green
Write-Host ""

# 크론 스케줄러 컨테이너에서 분석 실행
Write-Host "🔍 Starting AI analysis in cron-scheduler container..." -ForegroundColor Cyan
Write-Host "This may take several minutes depending on project size..." -ForegroundColor Yellow
Write-Host ""

docker exec bestcase-cron-scheduler /app/cron-scan.sh

Write-Host ""
Write-Host "✨ Analysis completed!" -ForegroundColor Green
Write-Host "Check results in: D:/01.Work/01.Projects/.bestcases/" -ForegroundColor Cyan
