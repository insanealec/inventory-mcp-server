import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

const API_BASE_URL = process.env.LARAVEL_API_URL || 'http://localhost:80/api';
const API_TOKEN = process.env.LARAVEL_API_TOKEN;

interface StockLocation {
  id: number;
  name: string;
  short_name: string;
  description?: string;
}

interface Item {
  id?: number;
  name: string;
  stock_location_id: number;
  position?: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
  unit?: string;
}

class InventoryMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'inventory-mcp-server',
        version: '1.0.0',
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'store_inventory_item',
            description: 'Store an inventory item in a specific location. Will search for the location and create it if needed, then save the item.',
            inputSchema: {
              type: 'object',
              properties: {
                item_name: {
                  type: 'string',
                  description: 'Name of the item being stored'
                },
                location_description: {
                  type: 'string',
                  description: 'Description of where the item is being placed (e.g., "main warehouse", "shelf A", "storage room")'
                },
                position: {
                  type: 'string',
                  description: 'Optional specific position within the location'
                },
                quantity: {
                  type: 'number',
                  description: 'Quantity of items being stored'
                },
                description: {
                  type: 'string',
                  description: 'Optional description of the item'
                },
                unit_price: {
                  type: 'number',
                  description: 'Optional unit price of the item'
                },
                unit: {
                  type: 'string',
                  description: 'Optional unit of measurement (e.g., "pieces", "kg", "meters")'
                }
              },
              required: ['item_name', 'location_description']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'store_inventory_item':
            return await this.storeInventoryItem(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ]
        };
      }
    });
  }

  private async storeInventoryItem(args: any) {
    const {
      item_name,
      location_description,
      position,
      quantity,
      description,
      unit_price,
      unit
    } = args;

    try {
      // Step 1: Search for stock location
      const stockLocation = await this.findOrCreateStockLocation(location_description);

      // Step 2: Create the item
      const itemData: Partial<Item> = {
        name: item_name,
        stock_location_id: stockLocation.id,
        position,
        description,
        quantity,
        unit_price,
        unit
      };

      const response = await axios.post(`${API_BASE_URL}/inventory-items`, itemData, {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      return {
        content: [
          {
            type: 'text',
            text: `Successfully stored "${item_name}" in location "${stockLocation.name}" (ID: ${stockLocation.id}). Item details: ${JSON.stringify(response.data, null, 2)}`
          }
        ]
      };

    } catch (error: any) {
      throw new Error(`Failed to store inventory item: ${error.response?.data?.message || error.message}`);
    }
  }

  private async findOrCreateStockLocation(locationDescription: string): Promise<StockLocation> {
    try {
      // Search for existing stock locations
      const searchResponse = await axios.get(`${API_BASE_URL}/stock-locations`, {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Accept': 'application/json'
        },
        params: {
          search: locationDescription
        }
      });

      const locations = searchResponse.data.data || searchResponse.data;

      // If we found matching locations, return the best match
      if (locations && locations.length > 0) {
        // Return the first match (assuming API returns best matches first)
        return locations[0];
      }

      // No matches found, create a new stock location
      return await this.createStockLocation(locationDescription);

    } catch (error: any) {
      throw new Error(`Failed to find stock location: ${error.response?.data?.message || error.message}`);
    }
  }

  private async createStockLocation(locationDescription: string): Promise<StockLocation> {
    try {
      // Generate short_name from location description (first 10 chars, uppercase, no spaces)
      const shortName = locationDescription
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 10)
        .toUpperCase();

      const newLocationData = {
        name: locationDescription,
        short_name: shortName,
        description: `Auto-created location: ${locationDescription}`
      };

      const response = await axios.post(`${API_BASE_URL}/stock-locations`, newLocationData, {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      return response.data;

    } catch (error: any) {
      throw new Error(`Failed to create stock location: ${error.response?.data?.message || error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Inventory MCP Server running on stdio');
  }
}

// Error handling for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
const server = new InventoryMCPServer();
server.run().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});