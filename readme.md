# Inventory MCP Server

A Model Context Protocol (MCP) server for managing inventory items through natural language interactions with a Laravel API backend.

## Features

- Store inventory items using natural language location descriptions
- Automatically search for existing stock locations
- Create new stock locations if none match
- Full integration with Laravel API for items and stock locations

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your Laravel API URL and token
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Configure Claude Desktop:**
   - Copy the contents of `claude_desktop_config.json`
   - Add to your Claude Desktop configuration file:
     - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
     - **Windows:** `%APPDATA%/Claude/claude_desktop_config.json`
   - Update the `cwd` path to point to your project directory
   - Update the environment variables with your actual API URL and token

5. **Restart Claude Desktop**

## Usage

Once configured, you can interact with the inventory system using natural language:

- "I'm putting 50 screws in the main warehouse"
- "Store 25 cables on shelf A in the storage room"
- "Place 10 widgets in the shipping area"

The AI will:
1. Search for the best matching stock location
2. Create a new location if none exists
3. Store the item with the specified details

## API Requirements

Your Laravel API should have these endpoints:

- `GET /api/stock-locations?search={query}` - Search stock locations
- `POST /api/stock-locations` - Create new stock location
- `POST /api/items` - Create new inventory item

Expected data structures:

**Stock Location:**
```json
{
  "name": "string",
  "short_name": "string", 
  "description": "string (optional)"
}
```

**Item:**
```json
{
  "name": "string",
  "stock_location_id": "integer",
  "position": "string (optional)",
  "description": "string (optional)",
  "quantity": "number (optional)",
  "unit_price": "number (optional)",
  "unit": "string (optional)"
}
```

## Development

- `npm run dev` - Build and run the server
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run the built server

## Environment Variables

- `LARAVEL_API_URL` - Base URL of your Laravel API (default: http://localhost:8000/api)
- `LARAVEL_API_TOKEN` - Bearer token for API authentication