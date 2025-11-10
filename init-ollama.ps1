# Ollama 초기화 스크립트 (PowerShell)

Write-Host "🚀 Initializing Ollama with code analysis models..." -ForegroundColor Green

# Ollama 컨테이너가 준비될 때까지 대기
Write-Host "⏳ Waiting for Ollama to be ready..." -ForegroundColor Yellow
do {
  Start-Sleep -Seconds 2
  $result = docker exec ollama-code-analyzer ollama list 2>&1
} while ($LASTEXITCODE -ne 0)

Write-Host "✅ Ollama is ready!" -ForegroundColor Green

# 코드 분석용 모델 다운로드
Write-Host ""
Write-Host "📥 Downloading code analysis models..." -ForegroundColor Cyan
Write-Host "   This may take 10-20 minutes depending on your internet speed." -ForegroundColor Gray
Write-Host ""

# qwen2.5-coder:7b (추천 - 빠르고 정확)
Write-Host "1️⃣ Downloading qwen2.5-coder:7b (4.7GB)..." -ForegroundColor Yellow
docker exec ollama-code-analyzer ollama pull qwen2.5-coder:7b

# deepseek-coder:6.7b (대안 - 코드 분석 특화)
Write-Host ""
Write-Host "2️⃣ Downloading deepseek-coder:6.7b (3.8GB)..." -ForegroundColor Yellow
docker exec ollama-code-analyzer ollama pull deepseek-coder:6.7b

# codellama:7b (대안 - Meta의 코드 LLM)
Write-Host ""
Write-Host "3️⃣ Downloading codellama:7b (3.8GB)..." -ForegroundColor Yellow
docker exec ollama-code-analyzer ollama pull codellama:7b

Write-Host ""
Write-Host "✅ All models downloaded successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Installed models:" -ForegroundColor Cyan
docker exec ollama-code-analyzer ollama list

Write-Host ""
Write-Host "🎉 Ollama initialization complete!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now use the following models:" -ForegroundColor White
Write-Host "  - qwen2.5-coder:7b    (Recommended)" -ForegroundColor Gray
Write-Host "  - deepseek-coder:6.7b (Code-specialized)" -ForegroundColor Gray
Write-Host "  - codellama:7b        (Meta's LLM)" -ForegroundColor Gray
Write-Host ""
Write-Host "Test with: docker exec ollama-code-analyzer ollama run qwen2.5-coder:7b" -ForegroundColor Cyan
