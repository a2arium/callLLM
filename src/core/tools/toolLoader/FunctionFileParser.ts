import {
    Project,
    SyntaxKind,
    JSDocText,
    JSDocLink,
    JSDocLinkCode,
    JSDocLinkPlain,
    SourceFile,
    ParameterDeclaration,
    CommentRange,
    FunctionDeclaration,
    ts
} from 'ts-morph';
import path from 'path';
import { ParsedFunctionMeta, ExtractedJsonSchema, ToolParsingError } from './types';

/**
 * Information about a function parameter
 */
type ParameterInfo = {
    name: string;
    type: string;
    description: string;
    isOptional: boolean;
    enum?: string[];
};

/**
 * Parses function files to extract ToolDefinition metadata
 */
export class FunctionFileParser {
    private project: Project;
    private fileCache: Map<string, ParsedFunctionMeta>;

    constructor() {
        this.project = new Project();
        this.fileCache = new Map<string, ParsedFunctionMeta>();
    }

    /**
     * Parses a TypeScript file to extract a tool definition
     * @param filePath - Full path to the TypeScript file
     * @returns Parsed function metadata
     * @throws ToolParsingError if parsing fails
     */
    public parseFile(filePath: string): ParsedFunctionMeta {
        // Check cache first
        const cachedResult = this.fileCache.get(filePath);
        if (cachedResult) {
            return cachedResult;
        }

        try {
            // Add the file to the project
            const sourceFile = this.project.addSourceFileAtPath(filePath);

            // Force ts-morph to re-read the file from the disk to avoid internal caching issues
            sourceFile.refreshFromFileSystemSync();

            // If there are any syntax or type diagnostics for this file, fail early
            const allDiagnostics = this.project.getPreEmitDiagnostics();
            const diagnostics = allDiagnostics.filter(d => d.getSourceFile()?.getFilePath() === filePath);
            if (diagnostics.length > 0) {
                const messages = diagnostics.map(d => d.getMessageText()).join('; ');
                throw new ToolParsingError(`Error parsing file ${filePath}: ${messages}`);
            }

            // --- Debug: Log file content briefly ---
            // console.log(`[Debug] Content of ${filePath}:\n${sourceFile.getText().substring(0, 300)}...`);
            // --- End Debug ---

            // Look for toolFunction
            const functionName = "toolFunction";
            const functionDeclaration = sourceFile.getFunction(functionName);

            if (!functionDeclaration) {
                throw new ToolParsingError(
                    `Function 'toolFunction' not found in ${filePath}. Each file must export a function named 'toolFunction'.`
                );
            }

            // Extract function description
            const description = this.extractFunctionDescription(functionDeclaration);

            // Extract parameter info and create schema
            const parameterInfos = this.extractFunctionParameterInfo(functionDeclaration, sourceFile);
            const properties: Record<string, { type: 'string' | 'number' | 'boolean' | 'array' | 'object'; description: string; enum?: string[] }> = {};
            const required: string[] = [];

            parameterInfos.forEach(param => {
                // Convert TypeScript types to JSON schema types
                let jsonType: 'string' | 'number' | 'boolean' | 'array' | 'object' = 'string'; // Default type

                if (param.type.includes('number')) {
                    jsonType = 'number';
                } else if (param.type.includes('boolean')) {
                    jsonType = 'boolean';
                } else if (param.type.includes('Array') || param.type.includes('[]')) {
                    jsonType = 'array';
                } else if (param.type.includes('object') || param.type.includes('{') || param.type === 'any' || param.type === 'unknown') {
                    // Treat objects, any, unknown as object type for schema
                    // Check if it has enum values, if so, it's likely a string enum handled below
                    if (!param.enum) {
                        jsonType = 'object';
                    }
                } else {
                    // Default to string if not matched above (handles enums identified as string)
                    jsonType = 'string';
                }

                // Define the specific JSON schema types allowed
                type JsonSchemaType = 'string' | 'number' | 'boolean' | 'array' | 'object';

                const propertyDefinition: { type: JsonSchemaType; description: string; enum?: string[] } = {
                    type: jsonType,
                    description: param.description || `Parameter: ${param.name}`,
                };

                // Add enum values if present
                if (param.enum && param.enum.length > 0) {
                    propertyDefinition.enum = param.enum;
                    // Cast 'string' to JsonSchemaType, as we know it's valid here
                    propertyDefinition.type = 'string' as JsonSchemaType;
                }

                properties[param.name] = propertyDefinition;

                // Add to required list if not optional
                if (!param.isOptional) {
                    required.push(param.name);
                }
            });

            // If no description was found, throw an error
            if (!description) {
                throw new ToolParsingError(
                    `No description found for function 'toolFunction' in ${filePath}. Every tool function must have a description comment.`
                );
            }

            // Extract the file name without extension from the path
            const name = path.basename(filePath, path.extname(filePath));

            const schema: ExtractedJsonSchema = {
                type: 'object',
                properties
            };

            // Only add required field if there are required parameters
            if (required.length > 0) {
                schema.required = required;
            }

            const result: ParsedFunctionMeta = {
                name,
                description,
                schema,
                runtimePath: filePath
            };

            // Cache the result
            this.fileCache.set(filePath, result);

            return result;
        } catch (error) {
            if (error instanceof ToolParsingError) {
                throw error;
            }
            throw new ToolParsingError(`Error parsing file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Extracts description from a function's comments
     * @param functionDeclaration - The function declaration to extract from
     * @returns The extracted description or empty string
     */
    private extractFunctionDescription(functionDeclaration: FunctionDeclaration): string {
        // 1) JSDoc comments
        const jsDocs = functionDeclaration.getJsDocs();
        if (jsDocs.length > 0) {
            const comment = jsDocs[0].getComment();
            if (comment) {
                if (typeof comment === 'string') {
                    return comment.trim();
                }
                return (comment as JSDocText[])
                    .map(block => block.getText())
                    .join(' ')
                    .trim();
            }
        }

        // 2) Try to get leading comment ranges directly
        const leadingCommentRanges = functionDeclaration.getLeadingCommentRanges();
        if (leadingCommentRanges && leadingCommentRanges.length > 0) {
            const lastComment = leadingCommentRanges[leadingCommentRanges.length - 1];
            const commentText = lastComment.getText();
            // Clean up comment markers
            return commentText
                .replace(/^\/\*\*/, '') // Remove opening /**
                .replace(/\*\/$/, '')   // Remove closing */
                .replace(/^\/\/\s*/, '') // Remove // and any spaces after it
                .replace(/^\/\*/, '')    // Remove opening /*
                .replace(/^\s*\*\s*/gm, '') // Remove * at beginning of lines in block comments
                .trim();
        }

        // 3) Fallback: scan text before function declaration for comments
        const sourceFile = functionDeclaration.getSourceFile();
        const fullText = sourceFile.getFullText();
        const start = functionDeclaration.getFullStart();
        const beforeText = fullText.slice(0, start);

        // Block comment fallback: capture the last /* ... */ block
        const blockRegex = /\/\*+\s*([\s\S]*?)\s*\*+\//g;
        const blockMatches = Array.from(beforeText.matchAll(blockRegex)) as RegExpMatchArray[];
        if (blockMatches.length > 0) {
            const raw = blockMatches[blockMatches.length - 1][1];
            const lines = raw
                .split(/\r?\n/)
                .map((l: string) => l.replace(/^\s*\*+\s*/, '').trim())
                .filter((l: string) => l.length > 0);
            if (lines.length > 0) {
                return lines.join(' ');
            }
        }

        // Single-line comment fallback: scan for consecutive single-line comments
        const singleLineComments: string[] = [];
        const lineRegex = /^\s*\/\/\s*(.*)$/gm;
        let match: RegExpExecArray | null;

        while ((match = lineRegex.exec(beforeText)) !== null) {
            if (match[1].trim()) {
                singleLineComments.push(match[1].trim());
            }
        }

        // If we found consecutive single-line comments, join them
        if (singleLineComments.length > 0) {
            // Get the last comment or consecutive comment group
            let lastIndex = singleLineComments.length - 1;
            const lastComments: string[] = [singleLineComments[lastIndex]];

            // Check if there are consecutive comments (on adjacent lines)
            while (lastIndex > 0) {
                // This is a simple heuristic to detect consecutive comments
                // A more accurate approach would check actual line numbers
                lastIndex--;
                lastComments.unshift(singleLineComments[lastIndex]);

                // If we have a significant gap between comments, stop
                // This is a simplistic approach - ideally we'd check line numbers
                if (lastIndex === 0) break;
            }

            return lastComments.join(' ');
        }

        // No description found
        return '';
    }

    /**
     * Extracts parameter information from a function
     * @param functionDeclaration - The function declaration to extract from
     * @param sourceFile - The containing source file
     * @returns Array of parameter information
     */
    private extractFunctionParameterInfo(functionDeclaration: any, sourceFile: SourceFile): ParameterInfo[] {
        // Get JSDoc comment associated with the function
        const jsDocComments = functionDeclaration.getJsDocs();

        // Check if this is a function with a single object parameter
        const parameters = functionDeclaration.getParameters();
        if (parameters.length === 1) {
            const param = parameters[0];
            const typeNode = param.getTypeNode();

            // Check if the parameter is an object type
            if (typeNode && (
                typeNode.getKind() === SyntaxKind.TypeLiteral || // Inline object type
                (typeNode.getKind() === SyntaxKind.TypeReference && !this.isSimpleType(typeNode.getText())) // Reference to complex type
            )) {
                return this.extractObjectProperties(param, sourceFile, jsDocComments);
            }
        }

        // Regular function with multiple parameters
        return functionDeclaration.getParameters().map((param: ParameterDeclaration) => {
            const paramName = param.getName();
            const isOptional = param.isOptional();

            // Get parameter type as string
            const typeNode = param.getTypeNode();
            const typeText = typeNode ? typeNode.getText() : 'unknown';

            // Find parameter description from JSDoc
            let description = '';

            // Extract JSDoc parameter descriptions
            if (jsDocComments.length > 0) {
                for (const jsdoc of jsDocComments) {
                    // Try to find a matching parameter tag
                    for (const tag of jsdoc.getTags()) {
                        // Check if it's a parameter tag
                        if (tag.getKind() === SyntaxKind.JSDocParameterTag) {
                            const tagText = tag.getText();
                            // Check if this tag contains our parameter name
                            if (tagText.includes(`@param ${paramName}`) || tagText.includes(`@param - ${paramName}`)) {
                                // Extract description from the tag text
                                const match = tagText.match(new RegExp(`@param\\s+(?:${paramName}\\s+-\\s+|\\-\\s+${paramName}\\s+)(.+)`));
                                if (match && match[1]) {
                                    description = match[1].trim();
                                }
                            }
                        }
                    }
                }
            }

            // Fallback: Check for regular leading comments if no description found yet
            if (!description) {
                try {
                    const leadingComments = param.getLeadingCommentRanges();
                    if (leadingComments.length > 0) {
                        // Use the last comment range before the declaration
                        const lastComment = leadingComments[leadingComments.length - 1];
                        const commentText = lastComment.getText();
                        // Clean comment markers
                        description = commentText
                            .replace(/^\/\*\*/, '') // Remove opening /**
                            .replace(/\*\/$/, '')   // Remove closing */
                            .replace(/^\/\/\s*/, '') // Remove // and any spaces after it
                            .replace(/^\/\*/, '')    // Remove opening /*
                            .replace(/^\s*\*\s*/gm, '') // Remove * at the beginning of lines in block comments
                            .trim();
                    }
                } catch (error) {
                    // Ignore errors when trying to get regular leading comments
                }
            }

            return {
                name: paramName,
                type: typeText,
                description,
                isOptional
            };
        });
    }

    /**
     * Checks if a type is a simple primitive type
     * @param typeText - The type text to check
     * @returns True if this is a simple type, false otherwise
     */
    private isSimpleType(typeText: string): boolean {
        const simpleTypes = ['string', 'number', 'boolean', 'unknown', 'void', 'null', 'undefined'];
        return simpleTypes.includes(typeText);
    }

    /**
     * Extracts properties from an object parameter
     * @param param - The parameter to extract properties from
     * @param sourceFile - The source file
     * @param jsDocComments - JSDoc comments from the function
     * @returns Array of parameter info objects representing the object properties
     */
    private extractObjectProperties(
        param: ParameterDeclaration,
        sourceFile: SourceFile,
        jsDocComments: any[]
    ): ParameterInfo[] {
        const paramName = param.getName();
        const paramType = param.getType();
        const results: ParameterInfo[] = [];

        // Get properties from the type
        const properties = paramType.getProperties();

        for (const prop of properties) {
            const propName = prop.getName();
            const propType = prop.getValueDeclaration()?.getType() || prop.getTypeAtLocation(sourceFile);

            const isOptional = prop.isOptional();

            let enumValues: string[] | undefined = undefined;

            // Attempt to get the type's symbol to check if it points to an EnumDeclaration
            const typeSymbol = propType.getSymbol();
            const typeDeclarations = typeSymbol?.getDeclarations() || [];

            let typeText = 'unknown';
            try {
                // Check if the type declaration is an EnumDeclaration
                const enumDeclaration = typeDeclarations.find(d => d.isKind(SyntaxKind.EnumDeclaration));

                if (enumDeclaration) {
                    const enumDecl = enumDeclaration as import('ts-morph').EnumDeclaration; // Cast for type safety
                    enumValues = [];
                    for (const member of enumDecl.getMembers()) {
                        const initializer = member.getInitializer();

                        let memberValue = member.getName(); // Default to name
                        if (initializer && ts.isStringLiteral(initializer.compilerNode)) {
                            memberValue = initializer.compilerNode.text;
                        }
                        enumValues.push(memberValue);
                    }

                    // Use 'string' for the JSON schema type, as enum values are typically strings
                    typeText = 'string';
                    // Optionally use the enum name as the typeText for more clarity
                    // typeText = enumDecl.getName();
                } else if (propType.isUnion() && propType.getUnionTypes().every(t => t.isStringLiteral())) {
                    // --- Handle String Literal Unions --- 
                    enumValues = propType.getUnionTypes().map(t => t.getLiteralValue() as string).filter(v => typeof v === 'string');
                    typeText = 'string'; // JSON schema type is string
                } else if (propType.isEnumLiteral() || (propType.isUnion() && propType.getUnionTypes().every(t => t.isEnumLiteral()))) {
                    // --- Keep the existing logic for inline enum literals or unions of them --- 
                    enumValues = [];
                    const typesToProcess = propType.isUnion() ? propType.getUnionTypes() : [propType];
                    for (const enumLiteralType of typesToProcess) {
                        const symbol = enumLiteralType.getSymbol();
                        if (symbol) {
                            const valueDeclaration = symbol.getValueDeclaration();
                            if (valueDeclaration && valueDeclaration.isKind(SyntaxKind.EnumMember)) {
                                const enumMemberDeclaration = valueDeclaration as import('ts-morph').EnumMember;
                                const initializer = enumMemberDeclaration.getInitializer();
                                if (initializer && ts.isStringLiteral(initializer.compilerNode)) {
                                    enumValues.push(initializer.compilerNode.text);
                                } else {
                                    // Fallback for numeric or uninitialized enums (use name)
                                    enumValues.push(symbol.getName());
                                }
                            } else {
                                enumValues.push(symbol.getName()); // Fallback if structure is unexpected
                            }
                        } else {
                            // Fallback if symbol is not available
                            enumValues.push(enumLiteralType.getText(undefined, ts.TypeFormatFlags.NoTruncation));
                        }
                    }

                    // Use 'string' for the JSON schema type, as enum values are typically strings
                    typeText = 'string';
                    // Use the first enum type's text for the raw type info if needed, or construct a union string
                    // typeText = enumValues.join(' | '); // Alternative representation
                } else {
                    // Get the regular type text if it's not an enum
                    typeText = propType.getText(undefined, ts.TypeFormatFlags.NoTruncation);
                }
            } catch (error) {
                // If we can't get the text representation, try a simpler approach
                typeText = propType.getText();
            }

            // Find description from JSDoc
            let description = '';

            // Try to find property description in function JSDoc
            if (jsDocComments.length > 0) {
                // Iterate over JSDoc comments to find property descriptions
                for (const jsdoc of jsDocComments) {
                    for (const tag of jsdoc.getTags()) {
                        if (tag.getKind() === SyntaxKind.JSDocParameterTag) {
                            const tagText = tag.getText();
                            // Look for the property name in the tag text
                            if (tagText.includes(`@param ${paramName}.${propName}`) ||
                                tagText.includes(`${propName} -`) ||
                                tagText.includes(`"${propName}":`) ||
                                tagText.includes(`'${propName}:'`)) {
                                // Extract description
                                const match = tagText.match(new RegExp(`${propName}\\s*-\\s*(.+)`));
                                if (match && match[1]) {
                                    description = match[1].trim();
                                }
                            }
                        }
                    }
                }
            }

            // Try to find the property's own JSDoc if it exists in the type declaration
            try {
                const valueDeclaration = prop.getValueDeclaration();
                // Check if getJsDocs method exists before calling it
                if (valueDeclaration && typeof (valueDeclaration as any).getJsDocs === 'function') {
                    const propJsDocs = (valueDeclaration as any).getJsDocs();
                    if (propJsDocs.length > 0) {
                        const propComment = propJsDocs[0].getComment();
                        if (propComment) {
                            description = typeof propComment === 'string'
                                ? propComment
                                : propComment.map((block: JSDocText | JSDocLink | JSDocLinkCode | JSDocLinkPlain | undefined) =>
                                    block?.getText?.() || '').join(' ').trim();
                        }
                    }
                }
            } catch (error) {
                // Ignore errors when trying to get property JSDoc
            }

            // Fallback: Check for regular leading comments if no description found yet
            if (!description) {
                try {
                    const valueDeclaration = prop.getValueDeclaration();
                    if (valueDeclaration) {
                        const leadingComments = valueDeclaration.getLeadingCommentRanges();
                        if (leadingComments.length > 0) {
                            // Use the last comment range before the declaration
                            const lastComment = leadingComments[leadingComments.length - 1];
                            const commentText = lastComment.getText();
                            // Clean comment markers
                            description = commentText
                                .replace(/^\/\*\*/, '') // Remove opening /** (shouldn't happen here, but safe)
                                .replace(/\*\/$/, '')   // Remove closing */
                                .replace(/^\/\/\s*/, '') // Remove // and any spaces after it
                                .replace(/^\/\*/, '')    // Remove opening /*
                                .replace(/^\s*\*\s*/gm, '') // Remove * at the beginning of lines in block comments
                                .trim();
                        }
                    }
                } catch (error) {
                    // Ignore errors when trying to get regular leading comments
                }
            }

            // Second fallback: Check property node in type alias declarations
            if (!description) {
                try {
                    // Find type declarations that might contain this property
                    const typeAliasDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.TypeAliasDeclaration);

                    for (const typeAlias of typeAliasDeclarations) {
                        const typeNode = typeAlias.getTypeNode();
                        if (!typeNode || !typeNode.isKind(SyntaxKind.TypeLiteral)) continue;

                        const typeLiteral = typeNode as import('ts-morph').TypeLiteralNode;
                        const propertySignatures = typeLiteral.getProperties();

                        for (const propertySignature of propertySignatures) {
                            if (propertySignature.getName() === propName) {
                                const leadingComments = propertySignature.getLeadingCommentRanges();
                                if (leadingComments.length > 0) {
                                    // Use the last comment range before the declaration
                                    const lastComment = leadingComments[leadingComments.length - 1];
                                    const commentText = lastComment.getText();
                                    // Clean comment markers
                                    description = commentText
                                        .replace(/^\/\*\*/, '') // Remove opening /**
                                        .replace(/\*\/$/, '')   // Remove closing */
                                        .replace(/^\/\/\s*/, '') // Remove // and any spaces after it
                                        .replace(/^\/\*/, '')    // Remove opening /*
                                        .replace(/^\s*\*\s*/gm, '') // Remove * at the beginning of lines in block comments
                                        .trim();

                                    // If we found a description, we can break out of the loops
                                    if (description) break;
                                }
                            }
                        }

                        // If we found a description, we can break out of the outer loop
                        if (description) break;
                    }
                } catch (error) {
                    // Ignore errors when trying to find property in type declarations
                }
            }

            // Third fallback: Check interface declarations
            if (!description) {
                try {
                    // Find interface declarations that might contain this property
                    const interfaceDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.InterfaceDeclaration);

                    for (const interfaceDecl of interfaceDeclarations) {
                        const propertySignatures = interfaceDecl.getProperties();

                        for (const propertySignature of propertySignatures) {
                            if (propertySignature.getName() === propName) {
                                const leadingComments = propertySignature.getLeadingCommentRanges();
                                if (leadingComments.length > 0) {
                                    // Use the last comment range before the declaration
                                    const lastComment = leadingComments[leadingComments.length - 1];
                                    const commentText = lastComment.getText();
                                    // Clean comment markers
                                    description = commentText
                                        .replace(/^\/\*\*/, '') // Remove opening /**
                                        .replace(/\*\/$/, '')   // Remove closing */
                                        .replace(/^\/\/\s*/, '') // Remove // and any spaces after it
                                        .replace(/^\/\*/, '')    // Remove opening /*
                                        .replace(/^\s*\*\s*/gm, '') // Remove * at the beginning of lines in block comments
                                        .trim();

                                    // If we found a description, we can break out of the loops
                                    if (description) break;
                                }
                            }
                        }

                        // If we found a description, we can break out of the outer loop
                        if (description) break;
                    }
                } catch (error) {
                    // Ignore errors when trying to find property in interface declarations
                }
            }

            results.push({
                name: propName,
                type: typeText,
                description,
                isOptional,
                enum: enumValues
            });
        }

        return results;
    }
} 