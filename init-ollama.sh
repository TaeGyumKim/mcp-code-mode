#!/bin/bash

# Ollama 초기화 스크립트
echo "🚀 Initializing Ollama with code analysis models..."

# Ollama 컨테이너가 준비될 때까지 대기
echo "⏳ Waiting for Ollama to be ready..."
until docker exec ollama-code-analyzer ollama list > /dev/null 2>&1; do
  sleep 2
done

echo "✅ Ollama is ready!"

# 코드 분석용 모델 다운로드
echo ""
echo "📥 Downloading code analysis models..."
echo "   This may take 10-20 minutes depending on your internet speed."
echo ""

# qwen2.5-coder:7b (추천 - 빠르고 정확)
echo "1️⃣ Downloading qwen2.5-coder:7b (4.7GB)..."
docker exec ollama-code-analyzer ollama pull qwen2.5-coder:7b

# deepseek-coder:6.7b (대안 - 코드 분석 특화)
echo ""
echo "2️⃣ Downloading deepseek-coder:6.7b (3.8GB)..."
docker exec ollama-code-analyzer ollama pull deepseek-coder:6.7b

# codellama:7b (대안 - Meta의 코드 LLM)
echo ""
echo "3️⃣ Downloading codellama:7b (3.8GB)..."
docker exec ollama-code-analyzer ollama pull codellama:7b

echo ""
echo "✅ All models downloaded successfully!"
echo ""
echo "📊 Installed models:"
docker exec ollama-code-analyzer ollama list

echo ""
echo "🎉 Ollama initialization complete!"
echo ""
echo "You can now use the following models:"
echo "  - qwen2.5-coder:7b    (Recommended)"
echo "  - deepseek-coder:6.7b (Code-specialized)"
echo "  - codellama:7b        (Meta's LLM)"
echo ""
echo "Test with: docker exec ollama-code-analyzer ollama run qwen2.5-coder:7b"
