export type JSONSchemaObject = {
    type?: string;
    properties?: Record<string, JSONSchemaObject>;
    items?: JSONSchemaObject;
    additionalProperties?: boolean;
    [key: string]: unknown;
};

export type FormattedSchema = {
    name: string;
    description: string;
    strict: boolean;
    schema: JSONSchemaObject;
};

export class SchemaFormatter {
    /**
     * Adds additionalProperties: false to all object levels in a JSON schema
     * This ensures strict validation at every level when using structured outputs
     */
    public static addAdditionalPropertiesFalse(schema: JSONSchemaObject): JSONSchemaObject {
        const result = { ...schema, additionalProperties: false };

        // Handle nested objects in properties
        if (typeof result.properties === 'object' && result.properties !== null) {
            result.properties = Object.entries(result.properties).reduce((acc, [key, value]) => {
                if (typeof value === 'object' && value !== null) {
                    // If it's an object type property, recursively add additionalProperties: false
                    if (value.type === 'object') {
                        acc[key] = this.addAdditionalPropertiesFalse(value);
                    }
                    // Handle arrays with object items
                    else if (value.type === 'array' && typeof value.items === 'object' && value.items !== null) {
                        if (value.items.type === 'object') {
                            acc[key] = {
                                ...value,
                                items: this.addAdditionalPropertiesFalse(value.items)
                            };
                        } else {
                            acc[key] = value;
                        }
                    } else {
                        acc[key] = value;
                    }
                } else {
                    acc[key] = value;
                }
                return acc;
            }, {} as Record<string, JSONSchemaObject>);
        }

        return result;
    }

} 