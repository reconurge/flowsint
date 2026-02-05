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

export const defaultTemplate = `# Example template enricher
# GitHub user lookup template
# Fetches user profile information from GitHub API
#
# API endpoint: https://api.github.com/users/{username}
# Docs: https://docs.github.com/en/rest/users/users#get-a-user
#
# Example response:
# {
#   "login": "my_gh_pseudo",
#   "id": 206358,
#   "avatar_url": "https://avatars.githubusercontent.com/u/206358?v=4",
#   "html_url": "https://github.com/my_gh_pseudo",
#   "name": "John Doe",
#   "bio": "Developer",
#   "location": "San Francisco",
#   "followers": 3,
#   "following": 0,
#   "public_repos": 1,
#   "created_at": "2010-02-18T23:00:25Z",
#   ...
# }

name: github-user-lookup
description: Fetch GitHub user profile and return as SocialAccount
category: Username
version: 1.0

input:
  type: Username
  key: value

secrets:
  - name: GITHUB_TOKEN
    required: true
    description: GitHub personal access token (required for API rate limits)

request:
  method: GET
  url: https://api.github.com/users/{{value}}
  headers:
    Accept: application/vnd.github+json
    Authorization: Bearer {{secrets.GITHUB_TOKEN}}
    X-GitHub-Api-Version: "2022-11-28"
    User-Agent: flowsint-enricher
  timeout: 15

response:
  expect: json
  map:
    # SocialAccount.username <- response["login"]
    username: login
    # SocialAccount.display_name <- response["name"]
    display_name: name
    # SocialAccount.profile_url <- response["html_url"]
    profile_url: html_url
    # SocialAccount.profile_picture_url <- response["avatar_url"]
    profile_picture_url: avatar_url
    # SocialAccount.bio <- response["bio"]
    bio: bio
    # SocialAccount.location <- response["location"]
    location: location
    # SocialAccount.created_at <- response["created_at"]
    created_at: created_at
    # SocialAccount.followers_count <- response["followers"]
    followers_count: followers
    # SocialAccount.following_count <- response["following"]
    following_count: following
    # SocialAccount.posts_count <- response["public_repos"]
    posts_count: public_repos

output:
  type: SocialAccount

retry:
  max_retries: 3
  backoff_factor: 1.0
  retry_on_status:
    - 429
    - 500
    - 502
    - 503
    - 504

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
