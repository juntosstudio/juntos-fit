import type { MemoryContext } from './types.ts'

// Permanent seam for future relationship, episodic, and
// active-context retrieval. Brain Lite intentionally returns
// an empty memory packet rather than baking memory logic into
// the AI provider.
export async function loadRelevantMemory(): Promise<MemoryContext> {
  return {
    provider_version: 'memory_provider_v0.1_empty',
    relationship_memory: [],
    active_context: [],
    recent_context: [],
  }
}
