# Setup Guide

> **Complete setup guide for MCP Code Mode Starter**

This guide consolidates all setup documentation into one place.

---

## 📋 Prerequisites

- **Docker Desktop** installed and running
- **VS Code** with Copilot or Claude extension
- **Windows/Linux/Mac** with sufficient disk space (for Docker volumes)

---

## 🚀 Quick Setup (5 minutes)

### 1. Clone and Configure

```bash
# Clone repository
git clone https://github.com/TaeGyumKim/mcp-code-mode.git
cd mcp-code-mode

# Copy environment file
cp .env.example .env
```

### 2. Edit `.env` File

**Most important:** Set your projects path

```bash
# Windows
HOST_PROJECTS_PATH=D:/01.Work/01.Projects

# Linux
HOST_PROJECTS_PATH=/home/user/projects

# Mac
HOST_PROJECTS_PATH=/Users/username/projects
```

**⚠️ Important:**
- Use forward slashes `/` (not backslashes `\`)
- No trailing slash at the end
- This path will be mounted to `/projects` in Docker

### 3. Start Docker Services

```bash
# Start MCP server
docker-compose up -d

# Verify containers are running
docker-compose ps

# Check logs
docker-compose logs -f mcp-code-mode-server
```

### 4. Configure VS Code

**Option A: Global MCP Settings (Recommended)**

Edit: `C:\Users\[USERNAME]\AppData\Roaming\Code\User\mcp.json`

Add this server configuration:

```json
{
  "servers": {
    "mcp-code-mode": {
      "type": "stdio",
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "mcp-code-mode-server",
        "node",
        "/app/dist/mcp-stdio-server.js"
      ],
      "description": "MCP Code Mode - 98% token reduction with sandbox execution"
    }
  }
}
```

**Option B: Workspace Settings**

Create `.vscode/mcp.json` in your project root (same content as above).

### 5. Restart VS Code

Close and reopen VS Code to apply MCP configuration.

---

## 🔧 Environment Variables Reference

### Essential Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST_PROJECTS_PATH` | **(Required)** | Your local projects directory path |
| `OLLAMA_URL` | `http://ollama:11434` | Ollama server URL for embeddings |
| `EMBEDDING_MODEL` | `nomic-embed-text` | Model for vector embeddings (768D) |
| `GENERATE_EMBEDDINGS` | `true` | Enable RAG-based semantic search |
| `LLM_MODEL` | `qwen2.5-coder:7b` | Model for code analysis |

### Scan Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CONCURRENCY` | `2` | Parallel file analysis count |
| `MAX_FILES_PER_PROJECT` | `50` | Maximum files to scan per project |
| `FORCE_REANALYZE` | `false` | Force re-analysis of all files |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `EXAMPLE_PROJECT_PATH` | `/projects/...` | Path for examples in documentation |
| `CACHE_TTL_MS` | `300000` | Cache TTL in milliseconds (5 minutes) |
| `CACHE_MAX_ENTRIES` | `100` | Maximum cache entries |

---

## 🔍 Path Conversion Mechanism

MCP Code Mode automatically converts between **host paths** and **container paths**.

### How it Works

```
VSCode Copilot (Host)
    ↓ Sends: D:/01.Work/01.Projects/myapp/src/index.ts
    ↓
filesystem API (Auto-conversion)
    ↓ Converts to: /projects/myapp/src/index.ts
    ↓
Docker Volume Mount
    ↓ Maps: D:/01.Work/01.Projects → /projects
    ↓
File Access ✅
```

### Conversion Rules

| Input Path | Converted Path | Notes |
|------------|---------------|-------|
| `D:/01.Work/01.Projects/myapp/file.ts` | `/projects/myapp/file.ts` | Windows → Container |
| `/home/user/projects/myapp/file.ts` | `/projects/myapp/file.ts` | Linux → Container |
| `/projects/myapp/file.ts` | `/projects/myapp/file.ts` | Already container path |

**You don't need to worry about path conversion** - it's automatic!

---

## 🐳 Docker Setup Details

### Docker Compose Services

```yaml
services:
  mcp-code-mode-server:
    # Main MCP server
    ports: []
    volumes:
      - ${HOST_PROJECTS_PATH}:/projects
      - ./scripts:/app/scripts
      - bestcases:/projects/.bestcases

  ollama (optional):
    # AI model server for embeddings
    ports:
      - "11434:11434"
    volumes:
      - ollama:/root/.ollama
```

### Rebuild Docker Images

When you update code or dependencies:

```bash
# Rebuild specific service
docker-compose build mcp-code-mode-server

# Rebuild all services
docker-compose build

# Restart services
docker-compose restart
```

### View Logs

```bash
# Follow logs (real-time)
docker-compose logs -f mcp-code-mode-server

# View last 100 lines
docker-compose logs --tail=100 mcp-code-mode-server

# View all services
docker-compose logs -f
```

---

## 🧪 Verify Setup

### 1. Check MCP Server

```bash
# Server should be running
docker-compose ps

# Should show:
# mcp-code-mode-server   running
```

### 2. Test in VS Code Copilot

Open VS Code and ask:

```
Can you list the available MCP tools?
```

Expected response should include:
- ✅ `execute` tool available
- ✅ Sandbox APIs (filesystem, bestcase, guides)

### 3. Test File Access

```javascript
// In VS Code Copilot, run:
const result = await filesystem.readFile({
  path: 'D:/01.Work/01.Projects/your-project/package.json'
});

console.log(result);
```

Should return your `package.json` content.

---

## 🔧 Common Issues

### Issue: "Container not found"

**Solution:**
```bash
docker-compose up -d
docker-compose ps
```

### Issue: "File not found"

**Solution:**
Check `.env` file:
```bash
# Correct path with forward slashes
HOST_PROJECTS_PATH=D:/01.Work/01.Projects

# ❌ Wrong (backslashes)
HOST_PROJECTS_PATH=D:\01.Work\01.Projects
```

### Issue: "Embedding model not found"

**Solution:**
```bash
# Download embedding model
docker exec -it ollama-code-analyzer ollama pull nomic-embed-text

# Verify model
docker exec -it ollama-code-analyzer ollama list
```

### Issue: "MCP server not responding"

**Solution:**
```bash
# Restart Docker containers
docker-compose restart

# Check logs for errors
docker-compose logs -f mcp-code-mode-server
```

---

## 🚀 Next Steps

After setup is complete:

1. **[GETTING_STARTED.md](./GETTING_STARTED.md)** - Learn how to use MCP Code Mode
2. **[WORKFLOW_GUIDE.md](./WORKFLOW_GUIDE.md)** - Understand the workflow
3. **[SANDBOX_USAGE_GUIDE.md](./SANDBOX_USAGE_GUIDE.md)** - Sandbox API reference

---

## 📚 Advanced Configuration

### Custom Docker Network

```yaml
# docker-compose.override.yml
networks:
  mcp-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16
```

### Multiple Project Paths

```yaml
# Mount multiple project directories
volumes:
  - D:/Projects/work:/projects/work
  - D:/Projects/personal:/projects/personal
```

### GPU Support (for faster embeddings)

```yaml
services:
  ollama:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

---

## 🔗 Related Documentation

- **[ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)** - Full environment variable reference
- **[DOCKER_REBUILD_GUIDE.md](./DOCKER_REBUILD_GUIDE.md)** - Detailed Docker rebuild instructions
- **[PRODUCTION_GUIDE.md](./PRODUCTION_GUIDE.md)** - Production deployment
- **[TROUBLESHOOTING.md](../TROUBLESHOOTING.md)** - Comprehensive troubleshooting
