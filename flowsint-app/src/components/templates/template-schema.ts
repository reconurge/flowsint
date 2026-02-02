// JSON Schema for template YAML validation - matches flowsint_core/templates/types.py
export const templateSchema = {
  type: 'object',
  required: ['name', 'category', 'version', 'input', 'request', 'output', 'response'],
  additionalProperties: false,
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      description: 'Name of the template'
    },
    description: {
      type: 'string',
      description: 'Description of the template'
    },
    category: {
      type: 'string',
      minLength: 1,
      description: 'Category of the template'
    },
    version: {
      type: 'number',
      description: 'Version of the template'
    },
    input: {
      type: 'object',
      required: ['type'],
      additionalProperties: false,
      properties: {
        type: {
          type: 'string',
          description: 'Flowsint Type the template takes as input'
        },
        key: {
          type: 'string',
          default: 'nodeLabel',
          description: 'Key to use for input mapping'
        }
      }
    },
    secrets: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name'],
        additionalProperties: false,
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 128,
            description: 'Name of the secret (used as {{secrets.NAME}} in template)'
          },
          required: {
            type: 'boolean',
            default: true,
            description: 'Whether this secret is required for the template'
          },
          description: {
            type: 'string',
            description: 'Description of what this secret is used for'
          }
        }
      },
      default: [],
      description: 'List of secrets required by this template (fetched from vault)'
    },
    request: {
      type: 'object',
      required: ['method', 'url'],
      additionalProperties: false,
      properties: {
        method: {
          type: 'string',
          enum: ['GET', 'POST'],
          description: 'HTTP method'
        },
        url: {
          type: 'string',
          description: 'URL template with {{key}} placeholders'
        },
        headers: {
          type: 'object',
          additionalProperties: { type: 'string' },
          default: {},
          description: 'HTTP headers'
        },
        params: {
          type: 'object',
          additionalProperties: { type: 'string' },
          default: {},
          description: 'Query parameters'
        },
        body: {
          type: ['string', 'null'],
          description: 'Request body (for POST requests)'
        },
        timeout: {
          type: 'number',
          minimum: 1,
          maximum: 300,
          default: 30,
          description: 'Request timeout in seconds'
        }
      }
    },
    output: {
      type: 'object',
      required: ['type'],
      additionalProperties: false,
      properties: {
        type: {
          type: 'string',
          description: 'Flowsint Type that the template returns'
        },
        is_array: {
          type: 'boolean',
          default: false,
          description: 'Whether the response is an array that should produce multiple outputs'
        },
        array_path: {
          type: ['string', 'null'],
          description: "Dot-notation path to array in response (e.g., 'data.results')"
        }
      }
    },
    response: {
      type: 'object',
      required: ['expect'],
      additionalProperties: false,
      properties: {
        expect: {
          type: 'string',
          enum: ['json', 'xml', 'text'],
          description: 'Expected response format'
        },
        map: {
          type: 'object',
          additionalProperties: { type: 'string' },
          default: {},
          description: 'Mapping from output type attributes to response keys'
        }
      }
    },
    retry: {
      type: 'object',
      additionalProperties: false,
      properties: {
        max_retries: {
          type: 'integer',
          minimum: 0,
          maximum: 10,
          default: 3,
          description: 'Maximum number of retry attempts'
        },
        backoff_factor: {
          type: 'number',
          minimum: 0.1,
          maximum: 10,
          default: 0.5,
          description: 'Multiplier for exponential backoff (seconds)'
        },
        retry_on_status: {
          type: 'array',
          items: { type: 'integer' },
          default: [429, 500, 502, 503, 504],
          description: 'HTTP status codes that should trigger a retry'
        }
      },
      description: 'Retry configuration for failed requests'
    }
  }
}

export const defaultTemplate = `name: my-enricher
description: My custom enricher template
category: Domain
type: request
version: 1.0
input:
  type: Domain
  key: domain
request:
  method: GET
  url: https://api.example.com/lookup/{{domain}}
output:
  type: Domain
response:
  expect: json
  map:
    domain: domain
`

export interface TemplateInput {
  type: string
  key?: string
}

export interface TemplateSecret {
  name: string
  required?: boolean
  description?: string
}

export interface TemplateHttpRequest {
  method: 'GET' | 'POST'
  url: string
  headers?: Record<string, string>
  params?: Record<string, string>
  body?: string | null
  timeout?: number
}

export interface TemplateHttpResponse {
  expect: 'json' | 'xml' | 'text'
  map?: Record<string, string>
}

export interface TemplateOutput {
  type: string
  is_array?: boolean
  array_path?: string | null
}

export interface TemplateRetryConfig {
  max_retries?: number
  backoff_factor?: number
  retry_on_status?: number[]
}

export interface TemplateData {
  name: string
  description?: string
  category: string
  version: number
  input: TemplateInput
  secrets?: TemplateSecret[]
  request: TemplateHttpRequest
  output: TemplateOutput
  response: TemplateHttpResponse
  retry?: TemplateRetryConfig
}
