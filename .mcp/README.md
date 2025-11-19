# MCP Configuration Directory

This directory contains configuration files for the MCP Code Mode system.

## Configuration Files

### `api-type-mapping.json`

Configures how the system detects API types from `package.json` dependencies.

**Quick Start:**
```bash
# Copy example configuration
cp api-type-mapping.example.json api-type-mapping.json

# Edit with your patterns
code api-type-mapping.json
```

**Example:**
```json
{
  "grpc": {
    "patterns": ["@grpc/*", "*proto*", "grpc"],
    "priority": 10,
    "confidence": "high"
  }
}
```

### Pattern Matching

- **Exact**: `"axios"` matches only `axios`
- **Wildcard**: `"*proto*"` matches `protobuf`, `@grpc/proto-loader`, etc.
- **Scope**: `"@grpc/*"` matches all packages under `@grpc` scope

### Priority System

When multiple API types are detected:
- Priority difference ≤ 2 → Returns `mixed` type
- Priority difference > 2 → Returns highest priority type

**Default Priorities:**
- gRPC: 10 (highest)
- GraphQL: 9
- OpenAPI: 8
- REST: 5 (lowest)

## Documentation

See [docs/API_TYPE_MAPPING.md](../docs/API_TYPE_MAPPING.md) for full documentation.

## Environment Variables

- `MCP_CONFIG_PATH`: Path to global config directory (default: `/app/.mcp`)
- `PROJECTS_PATH`: Path to projects directory (default: `/projects`)

## File Structure

```
.mcp/
├── README.md                      # This file
├── api-type-mapping.example.json # Example configuration
├── api-type-mapping.json         # Your custom configuration (gitignored)
└── local-packages.json           # Local package analysis results
```

## Support

For issues or questions:
- Documentation: [docs/API_TYPE_MAPPING.md](../docs/API_TYPE_MAPPING.md)
- Examples: [scripts/test/test-api-type-detection.ts](../scripts/test/test-api-type-detection.ts)
