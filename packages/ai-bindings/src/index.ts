// MCP 도구들을 TypeScript API로 노출
import * as filesystem from '../../../mcp-servers/filesystem/index.js';
import * as bestcase from '../../../mcp-servers/bestcase/index.js';

export { filesystem, bestcase };

// 레거시
export const ping = () => 'pong';