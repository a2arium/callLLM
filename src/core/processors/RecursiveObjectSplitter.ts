type JsObject = { [key: string]: any };

export class RecursiveObjectSplitter {
    private maxChunkSize: number;
    private minChunkSize: number;
    private sizeCache = new WeakMap<object, number>();

    constructor(maxChunkSize: number = 2000, minChunkSize?: number) {
        this.maxChunkSize = maxChunkSize;
        this.minChunkSize = minChunkSize ?? Math.max(maxChunkSize - 200, 50);
    }

    private calculateSize(data: any): number {
        if (typeof data === 'object' && data !== null) {
            if (this.sizeCache.has(data)) return this.sizeCache.get(data)!;
        }

        let size: number;

        switch (typeof data) {
            case 'string':
                size = JSON.stringify(data).length;
                break;
            case 'number':
            case 'boolean':
                size = JSON.stringify(data).length;
                break;
            case 'object':
                if (data === null) {
                    size = 4; // "null"
                } else if (Array.isArray(data)) {
                    size = 2; // []
                    let isFirst = true;
                    for (const item of data) {
                        if (!isFirst) size += 1; // comma
                        size += this.calculateSize(item);
                        isFirst = false;
                    }
                } else {
                    size = 2; // {}
                    let isFirst = true;
                    for (const [key, value] of Object.entries(data)) {
                        if (!isFirst) size += 1; // comma
                        size += JSON.stringify(key).length + 1; // key: 
                        size += this.calculateSize(value);
                        isFirst = false;
                    }
                }
                if (data !== null) this.sizeCache.set(data, size);
                break;
            default:
                size = 0;
        }

        return size;
    }

    public split(inputData: JsObject, handleArrays: boolean = false): JsObject[] {
        const totalSize = this.calculateSize(inputData);
        if (totalSize <= this.maxChunkSize) {
            return [inputData];
        }

        const chunks: JsObject[] = [];
        let currentChunk: JsObject = {};

        const addToChunks = (chunk: JsObject): void => {
            if (Object.keys(chunk).length > 0) {
                chunks.push({ ...chunk });
            }
        };

        const entries = Object.entries(inputData);
        for (let i = 0; i < entries.length; i++) {
            const [key, value] = entries[i];
            const itemSize = this.calculateSize({ [key]: value });
            const currentSize = this.calculateSize(currentChunk);

            if (Array.isArray(value)) {
                if (!handleArrays) {
                    if (currentSize > this.minChunkSize) {
                        addToChunks(currentChunk);
                        currentChunk = {};
                    }
                    currentChunk[key] = value;
                    addToChunks(currentChunk);
                    currentChunk = {};
                } else {
                    // Split arrays when handleArrays=true
                    const arrayChunks: any[][] = [];
                    let currentArrayChunk: any[] = [];
                    let currentArrayChunkSize = 2; // []

                    for (const item of value) {
                        const itemSize = this.calculateSize(item);
                        if (currentArrayChunkSize + itemSize + (currentArrayChunkSize > 2 ? 1 : 0) > this.maxChunkSize) {
                            if (currentArrayChunk.length > 0) {
                                arrayChunks.push([...currentArrayChunk]);
                                currentArrayChunk = [];
                                currentArrayChunkSize = 2;
                            }
                        }
                        currentArrayChunk.push(item);
                        currentArrayChunkSize += itemSize + (currentArrayChunkSize > 2 ? 1 : 0);
                    }

                    if (currentArrayChunk.length > 0) {
                        arrayChunks.push(currentArrayChunk);
                    }

                    for (const arrayChunk of arrayChunks) {
                        if (currentSize > this.minChunkSize) {
                            addToChunks(currentChunk);
                            currentChunk = {};
                        }
                        currentChunk[key] = arrayChunk;
                        addToChunks(currentChunk);
                        currentChunk = {};
                    }
                }
            } else if (typeof value === 'object' && value !== null) {
                // Handle nested objects
                const nestedChunks = this.split(value, handleArrays);

                // If the nested object was split or is too large
                if (nestedChunks.length > 1 || itemSize > this.maxChunkSize) {
                    if (currentSize > this.minChunkSize) {
                        addToChunks(currentChunk);
                        currentChunk = {};
                    }
                    for (const nestedChunk of nestedChunks) {
                        currentChunk = { [key]: nestedChunk };
                        addToChunks(currentChunk);
                        currentChunk = {};
                    }
                } else {
                    // If the nested object wasn't split but adding it would exceed maxChunkSize
                    if (currentSize + itemSize > this.maxChunkSize && currentSize > this.minChunkSize) {
                        addToChunks(currentChunk);
                        currentChunk = {};
                    }
                    currentChunk[key] = nestedChunks[0];
                }
            } else {
                // Handle primitive values
                if (currentSize + itemSize > this.maxChunkSize && currentSize > this.minChunkSize) {
                    addToChunks(currentChunk);
                    currentChunk = {};
                }
                currentChunk[key] = value;
            }
        }

        if (Object.keys(currentChunk).length > 0) {
            addToChunks(currentChunk);
        }

        // If we still have only one chunk that's too large, force split it
        if (chunks.length === 1 && this.calculateSize(chunks[0]) > this.maxChunkSize) {
            const entries = Object.entries(chunks[0]);
            const midPoint = Math.ceil(entries.length / 2);
            const firstHalf = Object.fromEntries(entries.slice(0, midPoint));
            const secondHalf = Object.fromEntries(entries.slice(midPoint));
            return [firstHalf, secondHalf];
        }

        return chunks.length > 0 ? chunks : [{}];
    }

    private setNestedValue(obj: JsObject, path: string[], value: any): void {
        let current = obj;
        for (let i = 0; i < path.length - 1; i++) {
            const key = path[i];
            current[key] = current[key] || {};
            current = current[key];
        }
        current[path[path.length - 1]] = value;
    }

    private getNestedValue(obj: JsObject, path: string[]): JsObject | undefined {
        let current = obj;
        for (const key of path) {
            if (current[key] === undefined) return undefined;
            current = current[key];
        }
        return current;
    }
}