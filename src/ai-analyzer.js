const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function analyzeErrorLog(errorLog) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `You are an expert software engineer analyzing CI/CD pipeline failures. 

ERROR LOG:
${errorLog}

Please analyze this error log and provide:
1. Root cause of the failure
2. Specific files and line numbers involved (if identifiable)
3. Suggested code fix with exact file paths and code changes
4. Explanation of why this fix will work

Format your response as JSON with this structure:
{
  "root_cause": "Brief description",
  "affected_files": ["file1.js", "file2.py"],
  "suggested_fixes": [
    {
      "file": "path/to/file.js",
      "description": "What to change",
      "original_code": "code to replace (if applicable)",
      "fixed_code": "corrected code"
    }
  ],
  "explanation": "Why this fixes the issue"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Try to extract JSON from the response
    let jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // If no JSON found, return raw analysis
    return {
      root_cause: 'Analysis completed',
      affected_files: [],
      suggested_fixes: [],
      explanation: text,
      raw_response: text
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    throw new Error(`Failed to analyze error log: ${error.message}`);
  }
}

module.exports = { analyzeErrorLog };
