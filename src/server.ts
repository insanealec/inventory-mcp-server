import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

const API_BASE_URL = process.env.LARAVEL_API_URL || 'http://localhost:8000/api';
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
  sku?: string;
  reorder_point?: number;
  reorder_quantity?: number;
  min_stock_level?: number;
  max_stock_level?: number;
  expiration_date?: string;
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
            name: 'get_stock_locations',
            description: 'Get all available stock locations, optionally filtered by search term',
            inputSchema: {
              type: 'object',
              properties: {
                search: {
                  type: 'string',
                  description: 'Optional search term to filter locations'
                }
              }
            }
          },
          {
            name: 'create_stock_location',
            description: 'Create a new stock location',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Full name of the stock location'
                },
                short_name: {
                  type: 'string',
                  description: 'Short name/code for the location'
                },
                description: {
                  type: 'string',
                  description: 'Optional description of the location'
                }
              },
              required: ['name', 'short_name']
            }
          },
          {
            name: 'get_inventory_items',
            description: 'Get all inventory items, optionally filtered by search term',
            inputSchema: {
              type: 'object',
              properties: {
                search: {
                  type: 'string',
                  description: 'Optional search term to filter items by name, description, or location'
                }
              }
            }
          },
          {
            name: 'create_inventory_item',
            description: 'Create a new inventory item in a specific stock location',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Name of the item'
                },
                stock_location_id: {
                  type: 'number',
                  description: 'ID of the stock location where item will be stored'
                },
                position: {
                  type: 'string',
                  description: 'Optional specific position within the location'
                },
                quantity: {
                  type: 'number',
                  description: 'Quantity of items'
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
                },
                sku: {
                  type: 'string',
                  description: 'Optional SKU/product code for the item'
                },
                reorder_point: {
                  type: 'number',
                  description: 'Optional quantity level at which to reorder this item'
                },
                reorder_quantity: {
                  type: 'number',
                  description: 'Optional quantity to order when reordering this item'
                },
                min_stock_level: {
                  type: 'number',
                  description: 'Optional minimum stock level to maintain'
                },
                max_stock_level: {
                  type: 'number',
                  description: 'Optional maximum stock level to maintain'
                },
                expiration_date: {
                  type: 'string',
                  description: 'Optional expiration date in YYYY-MM-DD format'
                }
              },
              required: ['name', 'stock_location_id']
            }
          },
          {
            name: 'update_inventory_item',
            description: 'Update an existing inventory item by ID',
            inputSchema: {
              type: 'object',
              properties: {
                item_id: {
                  type: 'number',
                  description: 'ID of the item to update'
                },
                name: {
                  type: 'string',
                  description: 'Name of the item'
                },
                stock_location_id: {
                  type: 'number',
                  description: 'ID of the stock location where item will be stored'
                },
                position: {
                  type: 'string',
                  description: 'Optional specific position within the location'
                },
                quantity: {
                  type: 'number',
                  description: 'Quantity of items'
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
                },
                sku: {
                  type: 'string',
                  description: 'Optional SKU/product code for the item'
                },
                reorder_point: {
                  type: 'number',
                  description: 'Optional quantity level at which to reorder this item'
                },
                reorder_quantity: {
                  type: 'number',
                  description: 'Optional quantity to order when reordering this item'
                },
                min_stock_level: {
                  type: 'number',
                  description: 'Optional minimum stock level to maintain'
                },
                max_stock_level: {
                  type: 'number',
                  description: 'Optional maximum stock level to maintain'
                },
                expiration_date: {
                  type: 'string',
                  description: 'Optional expiration date in YYYY-MM-DD format'
                }
              },
              required: ['item_id']
            }
          },
          {
            name: 'delete_inventory_item',
            description: 'Delete an inventory item by ID',
            inputSchema: {
              type: 'object',
              properties: {
                item_id: {
                  type: 'number',
                  description: 'ID of the item to delete'
                }
              },
              required: ['item_id']
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
          case 'get_stock_locations':
            return await this.getStockLocations((args as any)?.search);
          case 'create_stock_location':
            return await this.createStockLocation(args as any || {});
          case 'get_inventory_items':
            return await this.getInventoryItems((args as any)?.search);
          case 'create_inventory_item':
            return await this.createInventoryItem(args as any || {});
          case 'update_inventory_item':
            return await this.updateInventoryItem(args as any || {});
          case 'delete_inventory_item':
            return await this.deleteInventoryItem(args as any || {});
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

  private async getStockLocations(search?: string) {
    try {
      const params: any = {};
      if (search) {
        params.search = search;
      }

      const response = await axios.get(`${API_BASE_URL}/stock-locations`, {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Accept': 'application/json'
        },
        params
      });

      const locations = response.data.data || response.data;

      return {
        content: [
          {
            type: 'text',
            text: `Found ${locations.length} stock locations${search ? ` matching "${search}"` : ''}:\n${JSON.stringify(locations, null, 2)}`
          }
        ]
      };

    } catch (error: any) {
      throw new Error(`Failed to get stock locations: ${error.response?.data?.message || error.message}`);
    }
  }

  private async getInventoryItems(search?: string) {
    try {
      const params: any = {};
      if (search) {
        params.search = search;
      }

      const response = await axios.get(`${API_BASE_URL}/inventory-items`, {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Accept': 'application/json'
        },
        params
      });

      const items = response.data.data || response.data;

      return {
        content: [
          {
            type: 'text',
            text: `Found ${items.length} inventory items${search ? ` matching "${search}"` : ''}:\n${JSON.stringify(items, null, 2)}`
          }
        ]
      };

    } catch (error: any) {
      throw new Error(`Failed to get inventory items: ${error.response?.data?.message || error.message}`);
    }
  }

  private async createStockLocation(args: any) {
    try {
      if (!args.name || !args.short_name) {
        throw new Error('name and short_name are required to create a stock location');
      }

      const { name, short_name, description } = args;

      const locationData = {
        name,
        short_name,
        description
      };

      const response = await axios.post(`${API_BASE_URL}/stock-locations`, locationData, {
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
            text: `Successfully created stock location: ${JSON.stringify(response.data, null, 2)}`
          }
        ]
      };

    } catch (error: any) {
      throw new Error(`Failed to create stock location: ${error.response?.data?.message || error.message}`);
    }
  }

  private async createInventoryItem(args: any) {
    try {
      if (!args.name || !args.stock_location_id) {
        throw new Error('name and stock_location_id are required to create an inventory item');
      }

      const {
        name,
        stock_location_id,
        position,
        quantity,
        description,
        unit_price,
        unit
      } = args;

      const itemData: Partial<Item> = {
        name,
        stock_location_id,
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
            text: `Successfully created inventory item: ${JSON.stringify(response.data, null, 2)}`
          }
        ]
      };

    } catch (error: any) {
      throw new Error(`Failed to create inventory item: ${error.response?.data?.message || error.message}`);
    }
  }

  private async updateInventoryItem(args: any) {
    try {
      if (!args.item_id) {
        throw new Error('item_id is required to update an inventory item');
      }

      const { item_id, ...updateData } = args;

      // Remove any undefined values from updateData
      const cleanUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );

      const response = await axios.put(`${API_BASE_URL}/inventory-items/${item_id}`, cleanUpdateData, {
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
            text: `Successfully updated inventory item (ID: ${item_id}): ${JSON.stringify(response.data, null, 2)}`
          }
        ]
      };

    } catch (error: any) {
      throw new Error(`Failed to update inventory item: ${error.response?.data?.message || error.message}`);
    }
  }

  private async deleteInventoryItem(args: any) {
    try {
      if (!args.item_id) {
        throw new Error('item_id is required to delete an inventory item');
      }

      const { item_id } = args;

      await axios.delete(`${API_BASE_URL}/inventory-items/${item_id}`, {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Accept': 'application/json'
        }
      });

      return {
        content: [
          {
            type: 'text',
            text: `Successfully deleted inventory item with ID: ${item_id}`
          }
        ]
      };

    } catch (error: any) {
      throw new Error(`Failed to delete inventory item: ${error.response?.data?.message || error.message}`);
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