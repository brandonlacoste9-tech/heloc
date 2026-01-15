const { GoogleGenerativeAI } = require('@google/generative-ai');
const { AI_LOG_LENGTH } = require('../utils/constants');

class AIService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (!this.apiKey) {
      console.warn('Warning: GEMINI_API_KEY not set. AI analysis will be limited.');
    }
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
  }

  async analyzeError(errorLog, context = {}) {
    if (!this.genAI) {
      return this.fallbackAnalysis(errorLog, context);
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

      const prompt = this.buildAnalysisPrompt(errorLog, context);
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseAIResponse(text, errorLog);

    } catch (error) {
      console.error('AI analysis error:', error.message);
      return this.fallbackAnalysis(errorLog, context);
    }
  }

  buildAnalysisPrompt(errorLog, context) {
    // Truncate log intelligently - keep complete lines
    let truncatedLog = errorLog;
    if (errorLog.length > AI_LOG_LENGTH) {
      truncatedLog = errorLog.substring(0, AI_LOG_LENGTH);
      // Find the last complete line
      const lastNewline = truncatedLog.lastIndexOf('\n');
      if (lastNewline > 0) {
        truncatedLog = truncatedLog.substring(0, lastNewline);
      }
      truncatedLog += '\n... (truncated)';
    }

    return `You are a CI/CD debugging expert. Analyze the following CI failure and provide actionable fixes.

Repository: ${context.repository || 'unknown'}
Workflow: ${context.workflow || 'unknown'}
Job: ${context.job_name || 'unknown'}

ERROR LOG:
\`\`\`
${truncatedLog}
\`\`\`

Please provide:
1. Root cause analysis (brief)
2. Specific file paths and line numbers to fix (if identifiable)
3. Exact code changes needed
4. Step-by-step fix instructions

Format your response as JSON with this structure:
{
  "root_cause": "brief explanation",
  "error_type": "type of error (e.g., syntax, dependency, test, build)",
  "fixes": [
    {
      "file": "path/to/file",
      "description": "what to change",
      "code_change": "exact code to add/modify",
      "line_number": 123
    }
  ],
  "instructions": ["step 1", "step 2"]
}`;
  }

  parseAIResponse(text, errorLog) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      }
    } catch (e) {
      console.warn('Could not parse AI response as JSON:', e.message);
    }

    // Fallback: extract information from text
    return {
      root_cause: this.extractRootCause(text, errorLog),
      error_type: this.detectErrorType(errorLog),
      fixes: this.extractFixes(text),
      instructions: this.extractInstructions(text),
      raw_analysis: text
    };
  }

  fallbackAnalysis(errorLog, context) {
    // Rule-based analysis when AI is not available
    const errorType = this.detectErrorType(errorLog);
    const suggestions = this.getSuggestionsByType(errorType, errorLog);

    return {
      root_cause: `Detected ${errorType} error in CI workflow`,
      error_type: errorType,
      fixes: suggestions.fixes,
      instructions: suggestions.instructions,
      fallback: true
    };
  }

  detectErrorType(errorLog) {
    const log = errorLog.toLowerCase();
    
    if (log.includes('npm err!') || log.includes('package not found') || log.includes('module not found')) {
      return 'dependency';
    }
    if (log.includes('syntax error') || log.includes('unexpected token')) {
      return 'syntax';
    }
    if (log.includes('test failed') || log.includes('assertion error') || log.includes('expected')) {
      return 'test';
    }
    if (log.includes('build failed') || log.includes('compilation error')) {
      return 'build';
    }
    if (log.includes('permission denied') || log.includes('eacces')) {
      return 'permission';
    }
    if (log.includes('timeout') || log.includes('timed out')) {
      return 'timeout';
    }
    if (log.includes('network') || log.includes('enotfound') || log.includes('econnrefused')) {
      return 'network';
    }
    
    return 'unknown';
  }

  getSuggestionsByType(errorType, errorLog) {
    const suggestions = {
      dependency: {
        fixes: [{
          file: 'package.json',
          description: 'Install missing dependencies',
          code_change: 'Run: npm install',
          line_number: null
        }],
        instructions: [
          'Run npm install to install missing dependencies',
          'Check if package.json has the correct dependency versions',
          'Clear npm cache with: npm cache clean --force',
          'Delete node_modules and package-lock.json, then reinstall'
        ]
      },
      syntax: {
        fixes: [{
          file: 'unknown',
          description: 'Fix syntax error',
          code_change: 'Check the error line and fix syntax',
          line_number: this.extractLineNumber(errorLog)
        }],
        instructions: [
          'Review the syntax error at the indicated line',
          'Check for missing brackets, parentheses, or semicolons',
          'Ensure proper indentation and formatting',
          'Run linter to catch additional issues'
        ]
      },
      test: {
        fixes: [{
          file: 'test files',
          description: 'Fix failing tests',
          code_change: 'Update test assertions or fix code logic',
          line_number: null
        }],
        instructions: [
          'Review the test failure message',
          'Update test expectations if behavior changed intentionally',
          'Fix the code logic to match test expectations',
          'Run tests locally before pushing'
        ]
      },
      build: {
        fixes: [{
          file: 'build configuration',
          description: 'Fix build configuration',
          code_change: 'Check build scripts and configuration files',
          line_number: null
        }],
        instructions: [
          'Check build configuration files',
          'Ensure all required build tools are installed',
          'Verify environment variables are set correctly',
          'Review build logs for specific error messages'
        ]
      },
      permission: {
        fixes: [{
          file: 'CI workflow',
          description: 'Fix permission issues',
          code_change: 'Add chmod commands or update workflow permissions',
          line_number: null
        }],
        instructions: [
          'Add execute permissions: chmod +x script.sh',
          'Update GitHub Actions permissions in workflow file',
          'Check file ownership and access rights'
        ]
      },
      timeout: {
        fixes: [{
          file: '.github/workflows',
          description: 'Increase timeout duration',
          code_change: 'Add timeout-minutes: 30 to workflow step',
          line_number: null
        }],
        instructions: [
          'Increase timeout in workflow configuration',
          'Optimize slow operations',
          'Check for hanging processes or infinite loops'
        ]
      },
      default: {
        fixes: [{
          file: 'unknown',
          description: 'Review error logs for specific issue',
          code_change: 'Manual investigation required',
          line_number: null
        }],
        instructions: [
          'Review the full error log carefully',
          'Search for similar issues online',
          'Check recent code changes that might have caused the issue',
          'Consult documentation for the failing component'
        ]
      }
    };

    return suggestions[errorType] || suggestions.default;
  }

  extractLineNumber(errorLog) {
    const lineMatch = errorLog.match(/line (\d+)/i) || errorLog.match(/:(\d+):/);
    return lineMatch ? parseInt(lineMatch[1]) : null;
  }

  extractRootCause(text, errorLog) {
    // Try to find a sentence about the cause
    const causeMatch = text.match(/root cause[:\s]+([^\n]+)/i);
    if (causeMatch) return causeMatch[1].trim();

    // Fallback to first sentence
    const firstSentence = text.split('.')[0];
    return firstSentence || 'See error log for details';
  }

  extractFixes(text) {
    // Try to extract fix information from text (limit to first 2000 chars to avoid performance issues)
    const fixes = [];
    const limitedText = text.substring(0, 2000);
    const fileRegex = /file[:\s]+([^\n]+)/gi;
    let match;
    let iterationCount = 0;
    const maxIterations = 10; // Safety limit to prevent infinite loops
    
    while ((match = fileRegex.exec(limitedText)) !== null && iterationCount < maxIterations) {
      iterationCount++;
      
      // Ensure we have a valid match
      if (!match[1] || match[1].trim().length === 0) continue;
      
      fixes.push({
        file: match[1].trim(),
        description: 'See AI analysis',
        code_change: 'Review AI recommendations',
        line_number: null
      });
      
      // Limit to 5 fixes to avoid excessive parsing
      if (fixes.length >= 5) break;
    }

    return fixes.length > 0 ? fixes : [{
      file: 'unknown',
      description: 'See full AI analysis',
      code_change: 'Review recommendations above',
      line_number: null
    }];
  }

  extractInstructions(text) {
    // Extract numbered or bulleted lists
    const instructions = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (/^\d+\./.test(line.trim()) || /^[-*]/.test(line.trim())) {
        instructions.push(line.trim().replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, ''));
      }
    }

    return instructions.length > 0 ? instructions : [
      'Review the AI analysis above',
      'Apply suggested changes',
      'Test locally before committing',
      'Monitor CI after fix is applied'
    ];
  }
}

module.exports = new AIService();
