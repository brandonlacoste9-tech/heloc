
import { spawn } from 'child_process';
import path from 'path';

export class AgentBridge {
  static async runRalphFix(errorLog: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Use venv python if available, otherwise fallback to system python
      // In production/cloud run, this might need adjustment
      const pythonExecutable = path.join(__dirname, '../../venv/Scripts/python.exe'); // relative to src/services
      // Fallback relative path for flexibility, or use env var
      
      const scriptPath = path.join(__dirname, '../../core/ralph_agents.py');

      console.log(`🚀 Spawning Ralph Agent: ${pythonExecutable} ${scriptPath}`);
      
      const pythonProcess = spawn(pythonExecutable, [scriptPath, errorLog]);

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
         errorOutput += data.toString();
         console.error(`Python stderr: ${data}`);
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Agent process failed with code ${code}: ${errorOutput}`));
        } else {
          resolve(output);
        }
      });
      
      pythonProcess.on('error', (err) => {
          reject(err);
      });
    });
  }
}
