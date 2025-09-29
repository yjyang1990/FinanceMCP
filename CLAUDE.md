# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Build and Development

- `npm run build` - Compile TypeScript to JavaScript and make binaries executable
- `npm run watch` - Run TypeScript compiler in watch mode
- `npm run dev` - Start the HTTP server in development mode
- `npm run prepare` - Pre-commit build (runs automatically)

### Testing

- `npm test` - Run all tests with Jest (uses Node.js experimental VM modules)
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage reporting

### Server Deployment

- `npm run start:http` - Start HTTP server mode (port 3000)
- `npm run start:stdio` - Start STDIO mode for MCP
- `npm run start:sse` - Start SSE mode using Supergateway (port 3100)
- `npm run inspector` - Launch MCP inspector for debugging

### Single Test Execution

```bash
NODE_OPTIONS=--experimental-vm-modules jest tests/path/to/specific.test.ts
```

## Architecture Overview

### Core Structure

This is a **Model Context Protocol (MCP) server** that provides financial data tools to AI assistants like Claude. The codebase follows a modular architecture:

1. **Entry Points**:

   - `src/index.ts` - STDIO MCP server
   - `src/httpServer.ts` - HTTP/SSE server with Express
2. **Configuration Management** (`src/config.ts`):

   - Dynamic token resolution from request headers or environment variables
   - AsyncLocalStorage for per-request context isolation
   - Multi-API support (Tushare, CoinGecko, Binance)
3. **Tool Architecture** (`src/tools/`):

   - Each tool is a self-contained module with name, description, parameters, and run function
   - Tools are organized by data type (stocks, funds, news, etc.)
   - Modular formatters for complex data processing

### Technical Indicators Engine

The `src/tools/stockDataDetail/` directory contains a sophisticated technical indicators system:

- **Parameter Parser** (`paramParser.ts`) - Enforces explicit parameter specification
- **Data Calculator** (`dataCalculator.ts`) - Intelligent historical data pre-fetching
- **Indicator Modules** (`macd.ts`, `rsi.ts`, `kdj.ts`, `boll.ts`, `ma.ts`) - Individual technical indicators
- **Smart Pre-fetching** - Automatically calculates required historical data to eliminate NaN values

### Multi-Region Financial Data Support

- **A-Stock Markets** - Chinese stocks via Tushare API
- **International Markets** - US, HK stocks with dedicated performance analysis modules
- **Crypto Markets** - Binance integration for cryptocurrency data
- **Macro Economics** - Economic indicators and indices

### API Integration Patterns

1. **Request Context Isolation** - Each HTTP request gets isolated token context
2. **Fallback Strategy** - Request headers → environment variables → defaults
3. **Error Handling** - Consistent error formatting across all tools
4. **Data Formatting** - Specialized formatters for different financial data types

### Key Features

- **17 Financial Tools** - Comprehensive coverage from stocks to macro economics
- **Multiple Deployment Modes** - STDIO, HTTP, SSE for different integration needs
- **Dynamic Token Management** - Per-request API token handling
- **Intelligent Data Processing** - Smart parameter parsing and historical data calculation
- **Production Ready** - Express server with CORS, health checks, and proper error handling

## Environment Variables

- `TUSHARE_TOKEN` - Tushare API token (can be overridden via request headers)
- `COINGECKO_API_KEY` - CoinGecko API key for crypto data
- `NODE_ENV` - Environment mode (development/production)

## Testing Strategy `tests`

- Unit tests focus on individual tools and utilities
- Uses Jest with TypeScript support
- Experimental VM modules required for ES modules compatibility
- Coverage reporting available for quality assurance
