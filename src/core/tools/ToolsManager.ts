import type { ToolDefinition, ToolsManager as IToolsManager } from '../types';

export class ToolsManager implements IToolsManager {
    private tools: Map<string, ToolDefinition>;

    constructor() {
        this.tools = new Map<string, ToolDefinition>();
    }

    getTool(name: string): ToolDefinition | undefined {
        return this.tools.get(name);
    }

    addTool(tool: ToolDefinition): void {
        if (this.tools.has(tool.name)) {
            throw new Error(`Tool with name '${tool.name}' already exists`);
        }
        this.tools.set(tool.name, tool);
    }

    removeTool(name: string): void {
        if (!this.tools.has(name)) {
            throw new Error(`Tool with name '${name}' does not exist`);
        }
        this.tools.delete(name);
    }

    updateTool(name: string, updated: Partial<ToolDefinition>): void {
        const existingTool = this.tools.get(name);
        if (!existingTool) {
            throw new Error(`Tool with name '${name}' does not exist`);
        }

        // If the name is being updated, ensure it doesn't conflict with an existing tool
        if (updated.name && updated.name !== name && this.tools.has(updated.name)) {
            throw new Error(`Cannot update tool name to '${updated.name}' as it already exists`);
        }

        const updatedTool: ToolDefinition = {
            ...existingTool,
            ...updated
        };

        // If name is changed, remove the old entry and add the new one
        if (updated.name && updated.name !== name) {
            this.tools.delete(name);
            this.tools.set(updated.name, updatedTool);
        } else {
            this.tools.set(name, updatedTool);
        }
    }

    listTools(): ToolDefinition[] {
        return Array.from(this.tools.values());
    }
} 