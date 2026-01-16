
import { z } from 'zod';

export const AnalysisRequestSchema = z.object({
  logData: z.string().min(1, "Error log cannot be empty"),
  repoUrl: z.string(),
  commitHash: z.string(),
  provider: z.enum(["github", "gitlab", "circleci"]).default("github"),
  workflowId: z.string().optional()
});

export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;

export interface AnalysisResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorType?: 'syntax' | 'dependency' | 'test_failure' | 'unknown';
  suggestedFix?: {
    files: Array<{ path: string; content: string; diff: string }>;
    explanation: string;
  }; 
  // Flexible string field for simple fixes or markdown
  fixSuggestion?: string; 
  filesToEdit?: string[];
  confidenceScore: number;
  createdAt: string;
}
