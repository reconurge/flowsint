// Simple query key factory that actually works
export const queryKeys = {
  // Auth related queries
  auth: {
    session: ['auth', 'session'],
    currentUser: ['auth', 'currentUser']
  },

  // Investigations
  investigations: {
    list: ['investigations', 'list'],
    detail: (investigationId: string) => ['investigations', investigationId],
    sketches: (investigationId: string) => [investigationId, 'sketches'],
    analyses: (investigationId: string) => [investigationId, 'analyses'],
    flows: (investigationId: string) => [investigationId, 'flows'],
    dashboard: ['investigations', 'dashboard'],
    selector: (investigationId: string) => ['dashboard', 'selector', investigationId]
  },

  // Sketches/Graphs
  sketches: {
    list: ['sketches', 'list'],
    detail: (sketchId: string) => ['sketches', sketchId],
    byInvestigation: (investigationId: string) => [investigationId, 'sketches'],
    graph: (investigationId: string, sketchId: string) => [investigationId, 'graph', sketchId],
    types: ['sketches', 'types'],
    dashboard: (investigationId: string) => ['dashboard', 'investigation', investigationId]
  },

  // Analyses
  analyses: {
    list: ['analyses', 'list'],
    detail: (analysisId: string) => ['analyses', analysisId],
    byInvestigation: (investigationId: string) => [investigationId, 'analyses'],
    dashboard: (investigationId: string) => ['analyses', investigationId]
  },

  // Flows
  flows: {
    list: ['flows', 'list'],
    detail: (flowId: string) => ['flows', flowId],
    byInvestigation: (investigationId: string) => [investigationId, 'flows']
  },

  // Chats
  chats: {
    list: ['chats', 'list'],
    detail: (chatId: string) => ['chats', chatId],
    byInvestigation: (investigationId: string) => [investigationId, 'chats'],
    messages: (chatId: string) => [chatId, 'messages']
  },

  // API Keys
  keys: {
    list: ['keys'],
    detail: (keyId: string) => ['keys', keyId]
  },

  // Logs/Events
  logs: {
    bySketch: (sketchId: string) => [sketchId, 'logs']
  },

  // Action Items
  actionItems: ['actionItems'],

  // Scans
  scans: {
    list: ['scans', 'list'],
    detail: (scanId: string) => ['scans', scanId]
  },

  // Enrichers
  enrichers: {
    list: ['enrichers', 'list'],
    detail: (enricherId: string) => ['enrichers', enricherId]
  }
}

// Export individual key groups for easier imports
export const authKeys = queryKeys.auth
export const investigationKeys = queryKeys.investigations
export const sketchKeys = queryKeys.sketches
export const analysisKeys = queryKeys.analyses
export const flowKeys = queryKeys.flows
export const chatKeys = queryKeys.chats
export const keyKeys = queryKeys.keys
export const logKeys = queryKeys.logs
export const actionItemKeys = queryKeys.actionItems
export const scanKeys = queryKeys.scans
export const enricherKeys = queryKeys.enrichers
