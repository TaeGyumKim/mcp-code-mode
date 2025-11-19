# API Type Mapping Configuration

## Overview

The API Type Mapping system automatically detects the API communication type used in your project by analyzing `package.json` dependencies. This helps provide better code recommendations and guides.

## Default Supported Types

- **gRPC**: For gRPC/Protocol Buffer based APIs
- **OpenAPI**: For OpenAPI/Swagger REST APIs
- **GraphQL**: For GraphQL APIs
- **REST**: For generic REST APIs (default fallback)
- **Mixed**: When multiple types are detected

## Configuration

### Default Patterns

The system comes with built-in patterns for common packages:

```json
{
  "grpc": {
    "patterns": ["@grpc/grpc-js", "@grpc/proto-loader", "*proto*", "grpc"],
    "priority": 10,
    "confidence": "high"
  },
  "openapi": {
    "patterns": ["@openapi", "swagger", "@nestjs/swagger"],
    "priority": 8,
    "confidence": "high"
  },
  "graphql": {
    "patterns": ["graphql", "apollo", "@apollo/client"],
    "priority": 9,
    "confidence": "high"
  },
  "rest": {
    "patterns": ["axios", "ky", "node-fetch"],
    "priority": 5,
    "confidence": "medium"
  }
}
```

### Custom Configuration

Create `.mcp/api-type-mapping.json` in your project root to customize detection:

```bash
# Copy example configuration
cp .mcp/api-type-mapping.example.json .mcp/api-type-mapping.json

# Edit with your custom patterns
code .mcp/api-type-mapping.json
```

### Pattern Syntax

Patterns support various matching strategies:

#### 1. Exact Match
```json
{
  "patterns": ["axios"]
}
```
Matches: `axios`
Does not match: `axios-retry`, `@axios/core`

#### 2. Wildcard Match
```json
{
  "patterns": ["*proto*"]
}
```
Matches: `protobuf`, `@grpc/proto-loader`, `google-protobuf`

#### 3. Scope Match
```json
{
  "patterns": ["@grpc/*"]
}
```
Matches: `@grpc/grpc-js`, `@grpc/proto-loader`

#### 4. Combined Patterns
```json
{
  "grpc": {
    "patterns": [
      "@grpc/grpc-js",      // Exact match
      "*proto*",            // Wildcard
      "@grpc/*"             // Scope
    ]
  }
}
```

### Priority System

When multiple API types are detected, the system uses priority to determine the result:

- **Priority difference ≤ 2**: Returns `mixed` type
- **Priority difference > 2**: Returns highest priority type

Example:
```json
{
  "grpc": {
    "priority": 10,
    "patterns": ["*proto*"]
  },
  "rest": {
    "priority": 5,
    "patterns": ["axios"]
  }
}
```

If both `google-protobuf` and `axios` are found:
- Difference: 10 - 5 = 5 (> 2)
- Result: `grpc` (higher priority)

### Confidence Levels

- **high**: Strong indicators (e.g., `@grpc/grpc-js`)
- **medium**: Common but ambiguous (e.g., `axios`)
- **low**: Uncertain or fallback

## Usage in Code

### Automatic Detection

```typescript
import { extractProjectContext } from './projectContext';

const context = await extractProjectContext('/path/to/project');

console.log(context.apiInfo.type);        // 'grpc' | 'openapi' | 'rest' | 'graphql' | 'mixed' | 'unknown'
console.log(context.apiInfo.packages);    // ['@grpc/grpc-js', 'protobufjs']
console.log(context.apiInfo.confidence);  // 'high' | 'medium' | 'low'
```

### Manual Detection

```typescript
import { detectApiType } from '../../llm-analyzer/src/apiTypeMapping';

const dependencies = {
  'axios': '^1.0.0',
  'protobufjs': '^7.0.0'
};

const result = await detectApiType(dependencies);
console.log(result.type);  // 'grpc' (higher priority)
```

## Examples

### Example 1: Pure gRPC Project

**package.json**:
```json
{
  "dependencies": {
    "@grpc/grpc-js": "^1.8.0",
    "@grpc/proto-loader": "^0.7.0"
  }
}
```

**Detection Result**:
```json
{
  "type": "grpc",
  "packages": ["@grpc/grpc-js", "@grpc/proto-loader"],
  "confidence": "high"
}
```

### Example 2: Mixed API Project

**package.json**:
```json
{
  "dependencies": {
    "@grpc/grpc-js": "^1.8.0",
    "axios": "^1.0.0",
    "graphql": "^16.0.0"
  }
}
```

**Detection Result**:
```json
{
  "type": "mixed",
  "packages": ["@grpc/grpc-js", "axios", "graphql"],
  "confidence": "high"
}
```

### Example 3: Custom Pattern

**Custom .mcp/api-type-mapping.json**:
```json
{
  "grpc": {
    "patterns": [
      "@my-company/grpc-*",
      "*proto*"
    ],
    "priority": 10,
    "confidence": "high"
  }
}
```

**package.json**:
```json
{
  "dependencies": {
    "@my-company/grpc-client": "^1.0.0"
  }
}
```

**Detection Result**:
```json
{
  "type": "grpc",
  "packages": ["@my-company/grpc-client"],
  "confidence": "high"
}
```

## Troubleshooting

### API Type Shows as "unknown"

1. Check if your `package.json` exists and has dependencies
2. Verify your API packages match the patterns
3. Add custom patterns to `.mcp/api-type-mapping.json`
4. Enable debug logging: Check stderr output for `[getApiTypeMapping]` messages

### Wrong API Type Detected

1. Adjust priority values in your custom configuration
2. Add more specific patterns for your packages
3. Use exact match instead of wildcards for precision

### Custom Config Not Loading

1. Verify file path: `.mcp/api-type-mapping.json` in project root
2. Check JSON syntax (use `node -e "JSON.parse(require('fs').readFileSync('.mcp/api-type-mapping.json'))"`)
3. Check stderr logs for error messages

## Migration from Legacy Detection

If you were using the old hard-coded detection, the new system is backward compatible. All default patterns are preserved.

To customize:
1. Copy `.mcp/api-type-mapping.example.json` to `.mcp/api-type-mapping.json`
2. Add your custom patterns
3. Restart the MCP server

## See Also

- [Project Context Documentation](./PROJECT_CONTEXT.md)
- [Design System Mapping](./DESIGN_SYSTEM_USAGE.md)
- [Utility Library Mapping](./UTILITY_LIBRARY_USAGE.md)
