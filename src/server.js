const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const aiService = require('./services/aiService');
const githubService = require('./services/githubService');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Store for tracking fixes
const fixHistory = [];
const activeAnalyses = new Map();

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// CORS for local development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main analysis endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const {
      repository,
      workflow,
      branch,
      commit,
      error_log,
      job_name,
      job_url
    } = req.body;

    if (!error_log || !repository) {
      return res.status(400).json({
        error: 'Missing required fields: error_log and repository'
      });
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
      error_log: error_log.substring(0, 2000) // Store truncated log
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
    }
    return res.status(404).json({ error: 'Analysis not found' });
  }

  res.json(analysis);
});

// Get all analyses
app.get('/api/analyses', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const all = [...activeAnalyses.values(), ...fixHistory];
  const sorted = all.sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  );
  
  res.json({
    total: sorted.length,
    analyses: sorted.slice(0, limit)
  });
});

// Dashboard stats
app.get('/api/stats', (req, res) => {
  const all = [...activeAnalyses.values(), ...fixHistory];
  const stats = {
    total: all.length,
    active: activeAnalyses.size,
    completed: fixHistory.length,
    successful: fixHistory.filter(h => h.status === 'completed').length,
    failed: fixHistory.filter(h => h.status === 'failed').length,
    success_rate: fixHistory.length > 0 
      ? ((fixHistory.filter(h => h.status === 'completed').length / fixHistory.length) * 100).toFixed(1)
      : 0
  };
  
  res.json(stats);
});

// Async function to analyze and create fix
async function analyzeAndFix(analysisId, data) {
  const analysis = activeAnalyses.get(analysisId);
  if (!analysis) return;

  try {
    // Step 1: Analyze error with AI
    analysis.status = 'analyzing';
    const aiAnalysis = await aiService.analyzeError(data.error_log, {
      repository: data.repository,
      workflow: data.workflow,
      job_name: data.job_name
    });

    analysis.ai_analysis = aiAnalysis;
    analysis.suggested_fixes = aiAnalysis.fixes;
    
    // Step 2: Create PR with fix
    if (aiAnalysis.fixes && aiAnalysis.fixes.length > 0) {
      analysis.status = 'creating_pr';
      
      const prResult = await githubService.createFixPR({
        repository: data.repository,
        branch: data.branch,
        commit: data.commit,
        fixes: aiAnalysis.fixes,
        analysis: aiAnalysis,
        job_url: data.job_url,
        job_name: data.job_name
      });

      analysis.pr_url = prResult.pr_url;
      analysis.pr_number = prResult.pr_number;
      analysis.status = 'completed';
    } else {
      analysis.status = 'no_fix_found';
      analysis.message = 'AI could not determine a fix';
    }

    // Move to history
    analysis.completed_at = new Date().toISOString();
    fixHistory.unshift(analysis);
    
    // Keep history limited
    if (fixHistory.length > 100) {
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
});

module.exports = app;
