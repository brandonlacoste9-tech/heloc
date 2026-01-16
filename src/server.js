require('dotenv').config();
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const aiService = require('./services/aiService');
const githubService = require('./services/githubService');
const { STORED_LOG_LENGTH, MAX_HISTORY_SIZE, API_REQUEST_LIMIT } = require('./utils/constants');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Store for tracking fixes
const fixHistory = [];
const activeAnalyses = new Map();

// Middleware
app.use(bodyParser.json({ limit: API_REQUEST_LIMIT }));
const { exec } = require('child_process');
const app = express();
const port = process.env.PORT || 8080;

// 1. Serve the Landing Page
app.use(express.static(path.join(__dirname, '../public')));

// 2. Stripe Webhook
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
app.post('/api/stripe-webhook', express.raw({type: 'application/json'}), (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Generate analysis ID
    const analysisId = `${repository}-${Date.now()}`;
    
    // Store initial status
    activeAnalyses.set(analysisId, {
      id: analysisId,
      repository,
      workflow,
      branch,
      commit,
      job_name,
      job_url,
      status: 'analyzing',
      created_at: new Date().toISOString(),
      error_log: error_log.substring(0, STORED_LOG_LENGTH) // Store truncated log
    });

    // Start async analysis
    analyzeAndFix(analysisId, {
      repository,
      workflow,
      branch,
      commit,
      error_log,
      job_name,
      job_url
    }).catch(error => {
      console.error('Analysis failed:', error);
      const analysis = activeAnalyses.get(analysisId);
      if (analysis) {
        analysis.status = 'failed';
        analysis.error = error.message;
        analysis.completed_at = new Date().toISOString();
        
        // Move to history
        fixHistory.unshift(analysis);
        activeAnalyses.delete(analysisId);
      }
    });

    res.json({
      analysis_id: analysisId,
      status: 'started',
      message: 'Analysis started. Check status at /api/status/' + analysisId
    });

  } catch (error) {
    console.error('Error in /api/analyze:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get analysis status
app.get('/api/status/:analysisId', (req, res) => {
  const { analysisId } = req.params;
  const analysis = activeAnalyses.get(analysisId);

  if (!analysis) {
    // Check history
    const historical = fixHistory.find(h => h.id === analysisId);
    if (historical) {
      return res.json(historical);
    if (event.type === 'checkout.session.completed') {
        console.log(`💰 Payment received from: ${event.data.object.customer_details.email}`);
    }

    res.json({received: true});
});

// 3. GitHub Webhook (Triggers Helix)
app.use(express.json());
app.post('/api/github-webhook', (req, res) => {
    const event = req.headers['x-github-event'];
    
    if (event === 'check_run' && req.body.action === 'completed' && req.body.check_run.conclusion === 'failure') {
        console.log('🚨 Build Failure Detected. Waking up Helix...');
        
        const repoName = req.body.repository.full_name;
        const prNumber = req.body.check_run.check_suite.pull_requests[0]?.number;
        
        if(prNumber) {
            // Launches the Python agent
            exec(`python3 agents/helix.py --repo "${repoName}" --pr "${prNumber}"`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Helix Error: ${error.message}`);
                    return;
                }
                console.log(`Helix Output: ${stdout}`);
            });
        }
    }

    // Move to history
    analysis.completed_at = new Date().toISOString();
    fixHistory.unshift(analysis);
    
    // Keep history limited
    if (fixHistory.length > MAX_HISTORY_SIZE) {
      fixHistory.pop();
    }
    
    activeAnalyses.delete(analysisId);

  } catch (error) {
    console.error('Error in analyzeAndFix:', error);
    analysis.status = 'failed';
    analysis.error = error.message;
    analysis.completed_at = new Date().toISOString();
    
    fixHistory.unshift(analysis);
    activeAnalyses.delete(analysisId);
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`🤖 CI-Fixer service running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard.html`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
    res.status(200).send('Webhook received');
});

app.listen(port, () => {
    console.log(`🐝 DevKoloni Hive running on port ${port}`);
});
