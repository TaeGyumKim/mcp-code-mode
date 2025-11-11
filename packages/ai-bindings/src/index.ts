// MCP 도구들을 TypeScript API로 노출
import * as filesystem from '../../../mcp-servers/filesystem/index.js';
import * as bestcase from '../../../mcp-servers/bestcase/index.js';
import * as guides from '../../../mcp-servers/guides/index.js';

export { filesystem, bestcase, guides };

// 레거시
export const ping = () => 'pong';