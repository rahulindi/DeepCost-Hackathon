// API Documentation Routes
const express = require('express');
const ApiDocumentationService = require('../services/apiDocumentationService');
const router = express.Router();

// Generate and serve OpenAPI spec
router.get('/openapi.json', async (req, res) => {
    try {
        const spec = ApiDocumentationService.generateOpenApiSpec();
        res.json(spec);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate API documentation' });
    }
});

// Get API examples
router.get('/examples', (req, res) => {
    const examples = ApiDocumentationService.generateApiExamples();
    res.json(examples);
});

// Serve API documentation UI
router.get('/docs', (req, res) => {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>AWS Cost Tracker Pro API Documentation</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
    <style>
        body { margin: 0; background: #fafafa; }
        .swagger-ui .topbar { background-color: #667eea; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
    <script>
        SwaggerUIBundle({
            url: '/api/docs/openapi.json',
            dom_id: '#swagger-ui',
            presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIBundle.presets.standalone
            ]
        });
    </script>
</body>
</html>`;
    res.send(html);
});

module.exports = router;
