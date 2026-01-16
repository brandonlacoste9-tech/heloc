
import { AgentBridge } from './agentBridge';
import { AnalysisRequest, AnalysisResult } from '../models/analysis';
import { v4 as uuidv4 } from 'uuid';

// In-memory job store (replace with Redis in production)
const jobStore = new Map<string, AnalysisResult>();

export class AnalysisEngine {
  
  static async submitJob(request: AnalysisRequest): Promise<string> {
    const jobId = uuidv4();
    
    // Initialize Job
    const job: AnalysisResult = {
      id: jobId,
      status: 'pending',
      confidenceScore: 0,
      createdAt: new Date().toISOString()
    };
    
    jobStore.set(jobId, job);
    
    // Trigger background processing (Fire & Forget)
    this.processJob(jobId, request).catch(err => {
      console.error(`Background job ${jobId} failed:`, err);
    });

    return jobId;
  }

  static getJobStatus(jobId: string): AnalysisResult | null {
    return jobStore.get(jobId) || null;
  }

  private static async processJob(jobId: string, request: AnalysisRequest) {
    const job = jobStore.get(jobId);
    if (!job) return;

    try {
      // Update Status: Processing
      job.status = 'processing';
      jobStore.set(jobId, job);

      console.log(`[Job ${jobId}] Starting analysis for repo: ${request.repoUrl}`);

      // Call the Python Brain (AG2)
      // Note: mapping 'logData' from user to 'error_log' expected by python
      const rawOutput = await AgentBridge.runRalphFix(request.logData);
      
      console.log(`[Job ${jobId}] Raw Output: ${rawOutput.substring(0, 100)}...`);

      let analysisResult: any = {};
      try {
          // Find the first valid JSON object in the output (ignoring potential debug logs)
          const jsonStart = rawOutput.indexOf('{');
          const jsonEnd = rawOutput.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1) {
              const jsonIdx = rawOutput.substring(jsonStart, jsonEnd + 1);
              analysisResult = JSON.parse(jsonIdx);
          } else {
              throw new Error("No JSON found in agent output");
          }
      } catch (parseError) {
          console.error(`[Job ${jobId}] Failed to parse Agent JSON:`, parseError);
          analysisResult = {
              errorType: 'unknown',
              suggestedFix: { explanation: "Failed to parse AI response. Raw output logged." },
              confidenceScore: 0
          };
      }

      job.status = 'completed';
      job.errorType = analysisResult.errorType || 'unknown';
      job.suggestedFix = analysisResult.suggestedFix;
      job.confidenceScore = analysisResult.confidenceScore || 0;
      // Also strictly enable markdown fallback capability
      if (job.suggestedFix?.explanation) {
          job.fixSuggestion = job.suggestedFix.explanation;
      }
      
      jobStore.set(jobId, job);
      console.log(`[Job ${jobId}] Analysis completed.`);

    } catch (error: any) {
      console.error(`[Job ${jobId}] Analysis failed:`, error);
      job.status = 'failed';
      // job.error = error.message; // Add error field to interface if needed
      jobStore.set(jobId, job);
    }
  }
}
