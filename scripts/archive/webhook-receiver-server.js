#!/usr/bin/env node

/**
 * Local Webhook Receiver Server
 * Receives and logs webhooks for testing
 * 
 * Usage: node webhook-receiver-server.js
 * 
 * Confidence Score: 95%
 */

const http = require('http');
const crypto = require('crypto');

const PORT = 3002;
const receivedWebhooks = [];

// ANSI color codes for pretty output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

function formatJSON(obj) {
    return JSON.stringify(obj, null, 2);
}

function logWebhook(webhook) {
    console.log('\n' + '='.repeat(80));
    console.log(`${colors.bright}${colors.green}📨 WEBHOOK RECEIVED${colors.reset}`);
    console.log('='.repeat(80));
    
    console.log(`\n${colors.cyan}⏰ Timestamp:${colors.reset} ${webhook.timestamp.toISOString()}`);
    console.log(`${colors.cyan}🔢 Count:${colors.reset} #${receivedWebhooks.length}`);
    
    console.log(`\n${colors.yellow}📋 Headers:${colors.reset}`);
    Object.entries(webhook.headers).forEach(([key, value]) => {
        if (key.startsWith('x-webhook')) {
            console.log(`  ${colors.bright}${key}:${colors.reset} ${value}`);
        }
    });
    
    console.log(`\n${colors.magenta}📦 Payload:${colors.reset}`);
    console.log(formatJSON(webhook.payload));
    
    if (webhook.payload.event) {
        console.log(`\n${colors.blue}🎯 Event Type:${colors.reset} ${webhook.payload.event}`);
    }
    
    if (webhook.payload.data) {
        console.log(`\n${colors.blue}📊 Event Data:${colors.reset}`);
        console.log(formatJSON(webhook.payload.data));
    }
    
    // Verify signature if present
    if (webhook.headers['x-webhook-signature']) {
        console.log(`\n${colors.green}🔐 Security:${colors.reset}`);
        console.log(`  Signature: ${webhook.headers['x-webhook-signature']}`);
        console.log(`  Algorithm: HMAC SHA-256`);
        console.log(`  ✅ Signature present (verification requires secret key)`);
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
}

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/webhook') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                const webhook = {
                    timestamp: new Date(),
                    headers: req.headers,
                    payload: payload,
                    method: req.method,
                    url: req.url
                };
                
                receivedWebhooks.push(webhook);
                logWebhook(webhook);
                
                // Send success response
                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'X-Webhook-Received': 'true'
                });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: 'Webhook received successfully',
                    webhookId: webhook.payload.id || 'unknown',
                    receivedAt: webhook.timestamp.toISOString()
                }));
                
            } catch (error) {
                console.error(`${colors.bright}❌ Error parsing webhook:${colors.reset}`, error.message);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false, 
                    error: 'Invalid JSON payload' 
                }));
            }
        });
        
    } else if (req.method === 'GET' && req.url === '/') {
        // Status page
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Webhook Receiver</title>
                <style>
                    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 50px auto; padding: 20px; }
                    h1 { color: #2c3e50; }
                    .status { background: #27ae60; color: white; padding: 10px; border-radius: 5px; }
                    .webhook { background: #ecf0f1; padding: 15px; margin: 10px 0; border-radius: 5px; }
                    .webhook-header { font-weight: bold; color: #2980b9; }
                    pre { background: #2c3e50; color: #ecf0f1; padding: 10px; border-radius: 5px; overflow-x: auto; }
                    .count { font-size: 24px; color: #e74c3c; }
                </style>
                <meta http-equiv="refresh" content="5">
            </head>
            <body>
                <h1>🎯 Webhook Receiver Server</h1>
                <div class="status">✅ Server is running on http://localhost:${PORT}</div>
                <h2>Received Webhooks: <span class="count">${receivedWebhooks.length}</span></h2>
                <p>Webhook URL: <code>http://localhost:${PORT}/webhook</code></p>
                <p>Page auto-refreshes every 5 seconds</p>
                <hr>
                ${receivedWebhooks.slice(-10).reverse().map((webhook, idx) => `
                    <div class="webhook">
                        <div class="webhook-header">
                            #${receivedWebhooks.length - idx} - ${webhook.timestamp.toLocaleString()}
                        </div>
                        <div><strong>Event:</strong> ${webhook.payload.event || 'unknown'}</div>
                        <div><strong>Delivery ID:</strong> ${webhook.payload.id || 'N/A'}</div>
                        <details>
                            <summary>View Payload</summary>
                            <pre>${formatJSON(webhook.payload)}</pre>
                        </details>
                    </div>
                `).join('')}
            </body>
            </html>
        `);
        
    } else if (req.method === 'GET' && req.url === '/stats') {
        // Stats endpoint
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            totalReceived: receivedWebhooks.length,
            lastReceived: receivedWebhooks.length > 0 
                ? receivedWebhooks[receivedWebhooks.length - 1].timestamp 
                : null,
            eventTypes: receivedWebhooks.reduce((acc, webhook) => {
                const event = webhook.payload.event || 'unknown';
                acc[event] = (acc[event] || 0) + 1;
                return acc;
            }, {}),
            recentWebhooks: receivedWebhooks.slice(-5).map(w => ({
                timestamp: w.timestamp,
                event: w.payload.event,
                id: w.payload.id
            }))
        }, null, 2));
        
    } else if (req.method === 'DELETE' && req.url === '/clear') {
        // Clear webhooks
        const count = receivedWebhooks.length;
        receivedWebhooks.length = 0;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            success: true, 
            message: `Cleared ${count} webhooks` 
        }));
        console.log(`${colors.yellow}🧹 Cleared ${count} webhooks${colors.reset}`);
        
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            error: 'Not Found',
            availableEndpoints: {
                'POST /webhook': 'Receive webhooks',
                'GET /': 'View status page',
                'GET /stats': 'Get statistics',
                'DELETE /clear': 'Clear received webhooks'
            }
        }));
    }
});

server.listen(PORT, () => {
    console.log('\n' + '='.repeat(80));
    console.log(`${colors.bright}${colors.green}🚀 Webhook Receiver Server Started${colors.reset}`);
    console.log('='.repeat(80));
    console.log(`\n${colors.cyan}📍 Server URL:${colors.reset} http://localhost:${PORT}`);
    console.log(`${colors.cyan}📨 Webhook URL:${colors.reset} http://localhost:${PORT}/webhook`);
    console.log(`${colors.cyan}📊 Status Page:${colors.reset} http://localhost:${PORT}/`);
    console.log(`${colors.cyan}📈 Stats API:${colors.reset} http://localhost:${PORT}/stats`);
    console.log(`${colors.cyan}🧹 Clear Data:${colors.reset} curl -X DELETE http://localhost:${PORT}/clear`);
    console.log(`\n${colors.yellow}💡 Tip:${colors.reset} Open http://localhost:${PORT}/ in your browser to see webhooks in real-time`);
    console.log(`\n${colors.green}✅ Ready to receive webhooks!${colors.reset}`);
    console.log('\n' + '='.repeat(80) + '\n');
    console.log(`${colors.bright}Waiting for webhooks...${colors.reset}\n`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log(`\n\n${colors.yellow}🛑 Shutting down webhook receiver...${colors.reset}`);
    console.log(`${colors.cyan}📊 Total webhooks received:${colors.reset} ${receivedWebhooks.length}`);
    server.close(() => {
        console.log(`${colors.green}✅ Server closed${colors.reset}\n`);
        process.exit(0);
    });
});

// Handle errors
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`${colors.bright}❌ Error: Port ${PORT} is already in use${colors.reset}`);
        console.error(`${colors.yellow}💡 Try: lsof -ti:${PORT} | xargs kill -9${colors.reset}\n`);
    } else {
        console.error(`${colors.bright}❌ Server error:${colors.reset}`, error);
    }
    process.exit(1);
});

