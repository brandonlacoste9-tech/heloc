
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { AgentBridge } from './services/agentBridge';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

import { AnalysisEngine } from './services/analysisEngine';
import { AnalysisRequestSchema } from './models/analysis';

// Async Analysis Endpoint
app.post('/api/analyze', async (req, res) => {
    try {
        // Validate Input
        const validation = AnalysisRequestSchema.safeParse(req.body);
        if (!validation.success) {
             return res.status(400).json({ error: 'Validation Error', details: validation.error.format() });
        }

        const requestData = validation.data;
        console.log(`📥 Received Analysis Request for ${requestData.repoUrl}`);

        // Submit Job
        const jobId = await AnalysisEngine.submitJob(requestData);

        // Return Accepted
        res.status(202).json({ 
            jobId, 
            status: 'pending',
            message: 'Analysis job submitted successfully.',
            statusUrl: `/api/status/${jobId}` 
        });

    } catch (error: any) {
        console.error("Error in /api/analyze:", error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

// Job Status Endpoint
app.get('/api/status/:id', (req, res) => {
    const { id } = req.params;
    const result = AnalysisEngine.getJobStatus(id);

    if (!result) {
        return res.status(404).json({ error: 'Job not found' });
    }

    res.json(result);
});

// KEEPING Legacy /api/fix for backward compatibility/testing if needed, 
// allows direct sync Access for simple CLI tools
app.post('/api/fix', async (req, res) => {
    try {
        const { error_log } = req.body;
        if (!error_log) return res.status(400).json({ error: 'Missing error_log' });

        console.log('🚀 Triggering Ralph Fix (Legacy Sync)...');
        const fix = await AgentBridge.runRalphFix(error_log);
        res.json({ status: 'completed', fix });
    } catch (error: any) {
        console.error("Error in /api/fix:", error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🤖 CI-Fixer Core API running on port ${PORT}`);
});
