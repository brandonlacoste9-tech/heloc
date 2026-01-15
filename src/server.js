const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { analyzeErrorLog } = require('./ai-analyzer');
const { createFixPR } = require('./github-client');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Webhook endpoint for CI failures
app.post('/api/webhook/ci-failure', async (req, res) => {
  try {
    console.log('Received CI failure webhook:', JSON.stringify(req.body, null, 2));
    
    const { repository, workflow, workflow_run, action } = req.body;
    
    // Only process failure events
    if (action !== 'completed' || workflow_run?.conclusion !== 'failure') {
      return res.json({ message: 'Not a failure event, ignoring' });
    }

    const owner = repository?.owner?.login;
    const repo = repository?.name;
    const runId = workflow_run?.id;
    const branch = workflow_run?.head_branch;

    if (!owner || !repo || !runId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Queue the analysis (in production, use a proper queue)
    processFailure(owner, repo, runId, branch).catch(err => {
      console.error('Error processing failure:', err);
    });

    res.json({ message: 'CI failure received, processing...' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manual analysis endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const { owner, repo, runId, errorLog } = req.body;

    if (!errorLog && (!owner || !repo || !runId)) {
      return res.status(400).json({ 
        error: 'Provide either errorLog or (owner, repo, runId)' 
      });
    }

    let logToAnalyze = errorLog;
    
    // If no error log provided, we'd fetch it from GitHub
    // For now, just use what's provided
    if (!logToAnalyze) {
      return res.status(400).json({ 
        error: 'Error log fetching not implemented yet. Please provide errorLog.' 
      });
    }

    const analysis = await analyzeErrorLog(logToAnalyze);
    
    res.json({
      success: true,
      analysis: analysis
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create PR endpoint
app.post('/api/create-pr', async (req, res) => {
  try {
    const { owner, repo, branch, fixes, title, description } = req.body;

    if (!owner || !repo || !branch || !fixes) {
      return res.status(400).json({ 
        error: 'Missing required fields: owner, repo, branch, fixes' 
      });
    }

    const pr = await createFixPR(owner, repo, branch, fixes, title, description);
    
    res.json({
      success: true,
      pr_url: pr.html_url,
      pr_number: pr.number
    });
  } catch (error) {
    console.error('PR creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Dashboard endpoint
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Process CI failure (async)
async function processFailure(owner, repo, runId, branch) {
  try {
    console.log(`Processing failure for ${owner}/${repo}, run ${runId}`);
    
    // In a real implementation:
    // 1. Fetch logs from GitHub API
    // 2. Analyze with AI
    // 3. Create PR with fix
    
    // For now, just log
    console.log('Would fetch logs, analyze, and create PR here');
  } catch (error) {
    console.error('Process failure error:', error);
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`CI-Fixer server running on port ${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/api/webhook/ci-failure`);
});

module.exports = app;
