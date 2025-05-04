STREAMING DATA FLOW
===================

Provider → Adapter → Core Processing → Consumer
────────────────────────────────────────────────────────────────────────────────────────

                                           ┌─── Higher Level API ───┐
                         ┌─────────────────┤  LLMCaller/Client API  ├─────────────────┐
                         │                 └──────────┬─────────────┘                 │
                         │                           │                                │
                         ▼                           ▼                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         ┌──────────────────┐
│   API Request   │    │ StreamController│    │ ChunkController │         │ Other Controllers│
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘         └─────────┬────────┘
         │                      │                      │                            │
         │                      │                      │                            │
         ▼                      │                      │                            │
┌─────────────────┐             │                      │                            │
│ OpenAI Provider │◄────────────┘                      │                            │
└────────┬────────┘             │                      │                            │
         │                      │                      │                            │
         │  Raw OpenAI Stream   │                      │                            │
         ▼                      │                      │                            │
┌─────────────────┐             │                      │                            │
│ OpenAI Adapter  │             │                      │                            │
└────────┬────────┘             │                      │                            │
         │                      │                      │                            │
         │                      │                      │                            │
         ▼                      │                      │                            │
┌─────────────────┐             │                      │                            │
│OpenAI StreamHand│             │                      │                            │
│(convertProvider)│             │                      │                            │
└────────┬────────┘             │                      │                            │
         │                      │                      │                            │
         │  StreamChunk         │                      │                            │
         ▼                      │                      │                            │
┌─────────────────┐             │                      │                            │
│ Adapter Convert │             │                      │                            │
│ (To Universal)  │             │                      │                            │
└────────┬────────┘             │                      │                            │
         │                      │                      │                            │
         │ UniversalStreamResp  │                      │                            │
         │                      │                      │                            │
         └──────────────────────┼──────────────────────┼────────────────────────────┘
                                │                      │                             
                                │                      │                             
                                ▼                      ▼                             
                      ┌─────────────────┐     ┌────────────────┐                    
                      │ Core StreamHandl│     │    Iterating   │                    
                      │ (processStream) │     │ For-Await Loop │                    
                      └────────┬────────┘     └────────┬───────┘                    
                               │                       │                             
                               │ (Async Generator)     │                             
                               │                       │                             
                               ▼                       │                             
                      ┌─────────────────┐              │                             
                      │ ConvertToStreamC│◄─────────────┘                             
                      │   (Generator)   │                                            
                      └────────┬────────┘                                            
                               │                                                     
                               │ StreamChunk                                         
                               │                                                     
                               ▼                                                     
                      ┌─────────────────┐                                            
                      │  StreamPipeline │                                            
                      │   (Generator)   │                                            
                      └────────┬────────┘                                            
                               │                                                     
                               │ Piped StreamChunk                                   
                               │                                                     
                               ▼                                                     
                      ┌─────────────────┐                                            
                      │ContentAccumulat │                                            
                      │   (Generator)   │                                            
                      └────────┬────────┘                                            
                               │                                                     
                               │ Accumulated StreamChunk                             
                               │                                                     
                               ▼                                                     
                      ┌─────────────────┐                                            
                      │ Other Processors│                                            
                      │   (Generator)   │                                            
                      └────────┬────────┘                                            
                               │                                                     
                               │ Final StreamChunk                                   
                               │                                                     
                               ▼                                                     
                      ┌─────────────────┐                                            
                      │  Consumer/User  │                                            
                      │     Client      │                                            
                      └─────────────────┘                                            

IMPORTANT NOTES:
---------------
1. All async generators are lazy - processing only starts when iterated
2. Log messages appear when generators are created, not when executed
3. ChunkController handles large inputs by making multiple StreamController calls
4. ContentAccumulator builds complete messages from partial chunks
5. Similar class names in different layers cause confusing logs

## Unified Code Path Implementation (2023 Refactoring)

The LLMCaller previously had divergent code paths for processing single chunks and multiple chunks, which caused inconsistencies in behavior and parameter handling. The 2023 refactoring addressed these issues by:

1. **Introducing `buildChatParams`**: This helper method centralizes parameter preparation for both `call()` and `stream()` methods, ensuring consistent handling of:
   - callerId propagation for usage tracking
   - Tool resolution and MCP integration
   - JSON mode and response format 
   - History management
   - Image/file attachment handling

2. **Consistent Parameter Structure**: Both the direct path (internalChatCall/internalStreamCall) and chunking path (ChunkController) now receive identical parameter objects.

3. **ChunkController Enhancements**: Added `streamChunks` method to provide a stream-compatible interface for multi-chunk processing, matching the behavior of direct streaming.

4. **History Management**: Standardized when and how assistant messages are added to history across all code paths.

This refactoring eliminates "behavioral cliffs" where slightly increasing the input size (crossing the chunking threshold) could previously change behavior in subtle but important ways, including:
- Missing usage tracking information for chunked calls
- Inconsistent handling of file inputs
- Different JSON format behavior depending on chunk count
- Tool calling inconsistencies

The new architecture ensures consistent behavior regardless of input size, making the system more predictable and easier to maintain.