/**
 * DevHound Mock Neural Bridge
 *
 * Simulates ignite_server.js for testing the VS Code extension.
 * Run: node test/mock-bridge.js
 *
 * Part of Colony OS - The Neural Monolith
 */

const http = require('http');

const PORT = 4000;
const startTime = Date.now();
let ledgerEntries = 0;

// ============================================================================
// Issue Detection Engine (Simplified Ralph Loop)
// ============================================================================

function detectIssues(code, language) {
    const issues = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
        const lineNum = index + 1;

        // Skip comments
        if (line.trim().startsWith('//') || line.trim().startsWith('/*')) {
            return;
        }

        // Missing semicolons (JS/TS)
        if (['typescript', 'javascript', 'typescriptreact', 'javascriptreact'].includes(language)) {
            if (line.match(/^[\s]*(const|let|var|return)\s+.+[^;{}\s,]$/) && !line.includes('=>')) {
                issues.push({
                    id: `semi-${lineNum}`,
                    line: lineNum,
                    column: line.length,
                    severity: 'warning',
                    message: 'Missing semicolon',
                    source: 'devhound',
                    code: 'semi'
                });
            }
        }

        // console.log detection
        if (line.includes('console.log')) {
            issues.push({
                id: `no-console-${lineNum}`,
                line: lineNum,
                column: line.indexOf('console.log') + 1,
                severity: 'warning',
                message: 'Unexpected console statement',
                source: 'devhound',
                code: 'no-console'
            });
        }

        // var usage
        if (line.match(/\bvar\s+/)) {
            issues.push({
                id: `no-var-${lineNum}`,
                line: lineNum,
                column: line.indexOf('var') + 1,
                severity: 'error',
                message: 'Unexpected var, use let or const instead',
                source: 'devhound',
                code: 'no-var'
            });
        }

        // == instead of ===
        if (line.match(/[^=!]={2}[^=]/)) {
            issues.push({
                id: `eqeqeq-${lineNum}`,
                line: lineNum,
                column: line.indexOf('==') + 1,
                severity: 'error',
                message: 'Expected === but found ==',
                source: 'devhound',
                code: 'eqeqeq'
            });
        }

        // Trailing whitespace
        if (line.match(/\s+$/)) {
            issues.push({
                id: `no-trailing-spaces-${lineNum}`,
                line: lineNum,
                column: line.trimEnd().length + 1,
                severity: 'hint',
                message: 'Trailing whitespace',
                source: 'devhound',
                code: 'no-trailing-spaces'
            });
        }
    });

    return issues;
}

// ============================================================================
// Code Healing Engine
// ============================================================================

function healCode(code, language) {
    let healed = code;
    const changes = [];

    // Fix var → const
    if (healed.match(/\bvar\s+/)) {
        healed = healed.replace(/\bvar\s+/g, 'const ');
        changes.push('Replaced var with const');
    }

    // Fix == → ===
    if (healed.match(/([^=!])={2}([^=])/)) {
        healed = healed.replace(/([^=!])={2}([^=])/g, '$1===$2');
        changes.push('Replaced == with ===');
    }

    // Comment out console.log
    const lines = healed.split('\n');
    lines.forEach((line, i) => {
        if (line.includes('console.log') && !line.trim().startsWith('//')) {
            lines[i] = '// ' + line + ' // [DevHound: commented out]';
            changes.push(`Commented out console.log on line ${i + 1}`);
        }
    });
    healed = lines.join('\n');

    // Add missing semicolons (simplified)
    if (['typescript', 'javascript', 'typescriptreact', 'javascriptreact'].includes(language)) {
        const finalLines = healed.split('\n');
        finalLines.forEach((line, i) => {
            if (line.trim() &&
                !line.trim().startsWith('//') &&
                !line.trim().startsWith('/*') &&
                !line.trim().endsWith('{') &&
                !line.trim().endsWith('}') &&
                !line.trim().endsWith(',') &&
                !line.trim().endsWith(';') &&
                line.match(/^[\s]*(const|let|return)\s+/)) {
                finalLines[i] = line + ';';
                changes.push(`Added semicolon on line ${i + 1}`);
            }
        });
        healed = finalLines.join('\n');
    }

    // Remove trailing whitespace
    healed = healed.split('\n').map(line => line.trimEnd()).join('\n');

    return { healed, changes };
}

// ============================================================================
// HTTP Server
// ============================================================================

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-DevHound-Client, X-DevHound-Version, X-DevHound-Timestamp, X-DevHound-Signature');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Parse URL
    const url = new URL(req.url, `http://localhost:${PORT}`);

    console.log(`[${new Date().toISOString()}] ${req.method} ${url.pathname}`);

    // Health check
    if (url.pathname === '/api/status' && req.method === 'GET') {
        const uptime = Math.floor((Date.now() - startTime) / 1000);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            connected: true,
            version: '0.1.0-mock',
            uptime: uptime,
            ledgerEntries: ledgerEntries,
            lastActivity: new Date().toISOString()
        }));
        return;
    }

    // Main enforce endpoint
    if (url.pathname === '/api/enforce' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { command, parameters } = data;
                const { content, filePath, language } = parameters || {};

                console.log(`[DevHound] Command: ${command}, File: ${filePath}`);

                const startMs = Date.now();

                if (command === 'SCAN') {
                    const issues = detectIssues(content, language || 'typescript');
                    const elapsed = Date.now() - startMs;

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        status: 'SUCCESS',
                        issues: issues,
                        metrics: {
                            scanTimeMs: elapsed,
                            issuesFound: issues.length,
                            issuesFixed: 0,
                            ralphLoopPasses: 1
                        }
                    }));

                    ledgerEntries++;
                    console.log(`[DevHound] Scan complete: ${issues.length} issues found in ${elapsed}ms`);

                } else if (command === 'SCAN_AND_REPAIR' || command === 'AUTONOMOUS_HEAL') {
                    const { healed, changes } = healCode(content, language || 'typescript');
                    const elapsed = Date.now() - startMs;

                    const hasChanges = healed !== content;

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        status: hasChanges ? 'SUCCESS' : 'NO_CHANGES',
                        originalContent: content,
                        healedContent: healed,
                        changesSummary: changes,
                        metrics: {
                            healTimeMs: elapsed,
                            changesApplied: changes.length,
                            ralphLoopPasses: 2
                        }
                    }));

                    ledgerEntries++;
                    console.log(`[DevHound] Heal complete: ${changes.length} changes in ${elapsed}ms`);

                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: `Unknown command: ${command}` }));
                }

            } catch (err) {
                console.error('[DevHound] Error:', err.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // Ledger endpoint
    if (url.pathname === '/api/ledger' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            ledgerEntries++;
            console.log(`[DevHound] Ledger entry added. Total: ${ledgerEntries}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, entryId: `ledger-${ledgerEntries}` }));
        });
        return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
    console.log('');
    console.log('🐺 ═══════════════════════════════════════════════════════');
    console.log('   DEVHOUND MOCK NEURAL BRIDGE');
    console.log('   Part of Colony OS - The Neural Monolith');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log(`   🌐 Bridge online at http://localhost:${PORT}`);
    console.log('   📡 Endpoints:');
    console.log('      GET  /api/status   - Health check');
    console.log('      POST /api/enforce  - Scan & Heal');
    console.log('      POST /api/ledger   - Log entry');
    console.log('');
    console.log('   🧪 Ready for VS Code extension testing!');
    console.log('');
    console.log('   Press Ctrl+C to stop');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
});
