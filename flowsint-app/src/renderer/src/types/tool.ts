export interface Tool {
  name: string
  path: string
  description?: string
  active: boolean
  link?: string
  avatar?: string
  apiKeyRequired?: false | 'free' | 'paid'
}

export interface ToolCategory {
  [key: string]: {
    [key: string]: Tool
  }
}

export interface Tools {
  [key: string]: ToolCategory
}
