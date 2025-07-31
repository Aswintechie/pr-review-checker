/**
 * Python CODEOWNERS parser bridge for Node.js
 * Alternative to the custom JavaScript parser using the mature Python 'codeowners' package
 */

const { spawn } = require('child_process');
const path = require('path');

class PythonCodeownersParser {
  constructor() {
    this.pythonScript = path.join(__dirname, '..', 'codeowners_python_bridge.py');
    this.pythonEnv = path.join(__dirname, '..', 'ml-env', 'bin', 'python');
  }

  /**
   * Parse CODEOWNERS content and get owners for specified files
   * @param {string} codeownersContent - Raw CODEOWNERS file content
   * @param {string[]} changedFiles - Array of file paths to check
   * @returns {Promise<Array>} Array of file ownership results
   */
  async analyzeFiles(codeownersContent, changedFiles) {
    return new Promise((resolve, reject) => {
      // Prepare arguments for Python script
      const args = [
        this.pythonScript,
        '--codeowners', codeownersContent,
        '--files', JSON.stringify(changedFiles)
      ];

      // Spawn Python process with virtual environment
      const pythonProcess = spawn(this.pythonEnv, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const results = JSON.parse(stdout);
            resolve(results);
          } catch (parseError) {
            reject(new Error(`Failed to parse Python output: ${parseError.message}`));
          }
        } else {
          reject(new Error(`Python process failed with code ${code}: ${stderr}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });
  }

  /**
   * Get owners for a single file (compatibility method)
   * @param {string} filePath - File path to check
   * @param {string} codeownersContent - CODEOWNERS content
   * @returns {Promise<string[]>} Array of owner names
   */
  async getOwners(filePath, codeownersContent) {
    const results = await this.analyzeFiles(codeownersContent, [filePath]);
    if (results.length > 0) {
      return results[0].owners || [];
    }
    return [];
  }

  /**
   * Check if the Python environment is available
   * @returns {Promise<boolean>} True if Python bridge is available
   */
  async isAvailable() {
    return new Promise((resolve) => {
      const testProcess = spawn(this.pythonEnv, ['--version'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      testProcess.on('close', (code) => {
        resolve(code === 0);
      });

      testProcess.on('error', () => {
        resolve(false);
      });
    });
  }
}

module.exports = PythonCodeownersParser;