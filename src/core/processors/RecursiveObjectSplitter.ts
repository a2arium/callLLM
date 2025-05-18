type JsObject = { [key: string]: any };

export class RecursiveObjectSplitter {
    private maxChunkSize: number;
    private minChunkSize: number;
    private maxCharsPerChunk?: number;
    private sizeCache = new WeakMap<object, number>();

    constructor(maxChunkSize: number = 2000, minChunkSize?: number, maxCharsPerChunk?: number) {
        this.maxChunkSize = maxChunkSize;
        this.minChunkSize = minChunkSize ?? Math.max(maxChunkSize - 200, 50);
        this.maxCharsPerChunk = maxCharsPerChunk;
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
        if (totalSize <= this.maxChunkSize && (!this.maxCharsPerChunk || totalSize <= this.maxCharsPerChunk)) {
            return [inputData];
        }

        const chunks: JsObject[] = [];
        let currentChunk: JsObject = {};
        let currentChunkChars = 2; // '{}'

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
            const itemChars = JSON.stringify({ [key]: value }).length;
            // Check if adding this item would exceed either limit
            if ((currentSize + itemSize > this.maxChunkSize || (this.maxCharsPerChunk && currentChunkChars + itemChars > this.maxCharsPerChunk)) && Object.keys(currentChunk).length > 0) {
                addToChunks(currentChunk);
                currentChunk = {};
                currentChunkChars = 2;
            }
            // If value is a nested object, split it recursively and merge results
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                const nestedChunks = this.split(value, handleArrays);
                if (nestedChunks.length > 1) {
                    // Add current chunk if not empty
                    if (Object.keys(currentChunk).length > 0) {
                        addToChunks(currentChunk);
                        currentChunk = {};
                        currentChunkChars = 2;
                    }
                    // Each nested chunk becomes a separate chunk with the current key
                    for (const nestedChunk of nestedChunks) {
                        const chunkObj: JsObject = { ...currentChunk, [key]: nestedChunk };
                        addToChunks(chunkObj);
                    }
                    continue;
                } else {
                    currentChunk[key] = nestedChunks[0];
                }
            } else {
                currentChunk[key] = value;
            }
            currentChunkChars = JSON.stringify(currentChunk).length;
        }

        if (Object.keys(currentChunk).length > 0) {
            addToChunks(currentChunk);
        }

        // If we still have only one chunk that's too large, force split it
        if (chunks.length === 1 && (this.calculateSize(chunks[0]) > this.maxChunkSize || (this.maxCharsPerChunk && this.calculateSize(chunks[0]) > this.maxCharsPerChunk))) {
            const entries = Object.entries(chunks[0]);
            const midPoint = Math.ceil(entries.length / 2);
            const firstHalf = Object.fromEntries(entries.slice(0, midPoint));
            const secondHalf = Object.fromEntries(entries.slice(midPoint));
            return [firstHalf, secondHalf];
        }

        return chunks.length > 0 ? chunks : [{}];
    }
}