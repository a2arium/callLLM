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