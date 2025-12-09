// API Documentation and Management Service
// Provides Swagger/OpenAPI documentation and API key management
const fs = require('fs');
const path = require('path');

class ApiDocumentationService {
    /**
     * Generate OpenAPI/Swagger documentation
     */
    static generateOpenApiSpec() {
        return {
            openapi: '3.0.0',
            info: {
                title: 'AWS Cost Tracker Pro API',
                version: '1.0.0',
                description: 'Comprehensive AWS cost management and optimization API',
                contact: {
                    name: 'API Support',
                    email: 'support@awscosttracker.pro'
                }
            },
            servers: [
                {
                    url: 'http://localhost:3001/api',
                    description: 'Development server'
                }
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT'
                    }
                },
                schemas: {
                    CostData: {
                        type: 'object',
                        properties: {
                            date: { type: 'string', format: 'date' },
                            service: { type: 'string' },
                            cost: { type: 'number' },
                            region: { type: 'string' }
                        }
                    },
                    RIRecommendation: {
                        type: 'object',
                        properties: {
                            service: { type: 'string' },
                            instanceType: { type: 'string' },
                            term: { type: 'string' },
                            estimatedMonthlySavings: { type: 'number' },
                            priority: { type: 'string', enum: ['high', 'medium', 'low'] }
                        }
                    },
                    ApiResponse: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            data: { type: 'object' },
                            error: { type: 'string' },
                            timestamp: { type: 'string' }
                        }
                    }
                }
            },
            paths: {
                '/cost-data': {
                    get: {
                        summary: 'Get AWS cost data',
                        security: [{ bearerAuth: [] }],
                        responses: {
                            200: {
                                description: 'Cost data retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: { $ref: '#/components/schemas/ApiResponse' }
                                    }
                                }
                            }
                        }
                    }
                },
                '/ri/analysis': {
                    get: {
                        summary: 'Get Reserved Instance recommendations',
                        security: [{ bearerAuth: [] }],
                        responses: {
                            200: {
                                description: 'RI analysis completed',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: {
                                                    type: 'object',
                                                    properties: {
                                                        recommendations: {
                                                            type: 'array',
                                                            items: { $ref: '#/components/schemas/RIRecommendation' }
                                                        },
                                                        savings: {
                                                            type: 'object',
                                                            properties: {
                                                                monthly: { type: 'number' },
                                                                annual: { type: 'number' }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/webhooks': {
                    post: {
                        summary: 'Create webhook endpoint',
                        security: [{ bearerAuth: [] }],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            url: { type: 'string', format: 'url' },
                                            events: { type: 'array', items: { type: 'string' } },
                                            active: { type: 'boolean' }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            201: {
                                description: 'Webhook created successfully'
                            }
                        }
                    },
                    get: {
                        summary: 'List user webhooks',
                        security: [{ bearerAuth: [] }],
                        responses: {
                            200: {
                                description: 'Webhooks retrieved successfully'
                            }
                        }
                    }
                }
            }
        };
    }

    /**
     * Generate API examples and code snippets
     */
    static generateApiExamples() {
        return {
            javascript: {
                costData: `
// Get AWS cost data
const response = await fetch('/api/cost-data', {
    headers: {
        'Authorization': 'Bearer YOUR_TOKEN'
    }
});
const data = await response.json();
console.log('Cost data:', data);
`,
                riAnalysis: `
// Get RI recommendations
const response = await fetch('/api/ri/analysis', {
    headers: {
        'Authorization': 'Bearer YOUR_TOKEN'
    }
});
const analysis = await response.json();
console.log('Savings potential:', analysis.data.savings.monthly);
`,
                webhook: `
// Create webhook
await fetch('/api/webhooks', {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer YOUR_TOKEN',
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        url: 'https://your-app.com/webhook',
        events: ['cost_alert', 'ri_recommendation'],
        active: true
    })
});
`
            },
            curl: {
                costData: `curl -X GET "http://localhost:3001/api/cost-data" \\
  -H "Authorization: Bearer YOUR_TOKEN"`,
                riAnalysis: `curl -X GET "http://localhost:3001/api/ri/analysis" \\
  -H "Authorization: Bearer YOUR_TOKEN"`,
                webhook: `curl -X POST "http://localhost:3001/api/webhooks" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-app.com/webhook",
    "events": ["cost_alert"],
    "active": true
  }'`
            },
            python: {
                costData: `
import requests

headers = {'Authorization': 'Bearer YOUR_TOKEN'}
response = requests.get('http://localhost:3001/api/cost-data', headers=headers)
data = response.json()
print(f"Monthly cost: $10.50")
`,
                riAnalysis: `
import requests

headers = {'Authorization': 'Bearer YOUR_TOKEN'}
response = requests.get('http://localhost:3001/api/ri/analysis', headers=headers)
analysis = response.json()
print(f"Potential savings: ${10.50}/month")
`
            }
        };
    }

    /**
     * Save API documentation to file
     */
    static async saveApiDocs() {
        const spec = this.generateOpenApiSpec();
        const examples = this.generateApiExamples();
        
        const docsPath = path.join(__dirname, '../docs');
        if (!fs.existsSync(docsPath)) {
            fs.mkdirSync(docsPath, { recursive: true });
        }

        // Save OpenAPI spec
        fs.writeFileSync(
            path.join(docsPath, 'openapi.json'),
            JSON.stringify(spec, null, 2)
        );

        // Save examples
        fs.writeFileSync(
            path.join(docsPath, 'api-examples.json'),
            JSON.stringify(examples, null, 2)
        );

        return {
            success: true,
            message: 'API documentation generated',
            files: ['openapi.json', 'api-examples.json']
        };
    }
}

module.exports = ApiDocumentationService;
