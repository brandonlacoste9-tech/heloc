# 🤖 CI-Fixer

**AI-powered automatic CI failure fixes. Stop debugging pipelines and get back to building.**

CI-Fixer listens for CI workflow failures, uses AI (Gemini) to analyze error logs, and automatically creates Pull Requests with suggested code fixes.

## Features

- 🔍 **Intelligent Error Analysis**: Uses Google Gemini AI to understand error logs
- 🔧 **Automatic Fixes**: Generates code fixes based on error patterns
- 🚀 **PR Creation**: Automatically creates pull requests with fixes
- 📊 **Status Dashboard**: Web interface to monitor and test the system
- 🔔 **GitHub Integration**: Listens to workflow_run events via webhooks
- ⚡ **Fast Processing**: Asynchronous error handling and analysis

## Architecture

```
┌─────────────────┐
│  GitHub Actions │
│   (CI Failure)  │
└────────┬────────┘
         │
         │ webhook
         ▼
┌─────────────────┐
│  CI-Fixer API   │
│  (Express.js)   │
└────────┬────────┘
         │
         ├──► Gemini AI (Analysis)
         │
         └──► GitHub API (Create PR)
```

## Quick Start

### Prerequisites

- Node.js 18+ 
- GitHub Personal Access Token (with `repo` and `workflow` permissions)
- Google Gemini API Key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/brandonlacoste9-tech/heloc.git
   cd heloc
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your credentials:
   ```env
   GITHUB_TOKEN=your_github_token_here
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```

4. **Start the server**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

5. **Access the dashboard**
   
   Open your browser to `http://localhost:3000`

## GitHub Action Setup

The repository includes a GitHub Action (`.github/workflows/ci-fixer.yml`) that:
- Triggers on any workflow failure
- Collects error logs
- Creates an issue with the failure details
- Can be extended to automatically create fix PRs

To enable:
1. The action is automatically active in your repository
2. For automatic PR creation, deploy the CI-Fixer service
3. Configure a webhook pointing to your service endpoint

## API Endpoints

### `GET /api/health`
Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

### `POST /api/webhook/ci-failure`
Webhook endpoint for GitHub workflow_run events

**Request Body:** GitHub webhook payload

**Response:**
```json
{
  "message": "CI failure received, processing..."
}
```

### `POST /api/analyze`
Manually analyze an error log

**Request:**
```json
{
  "errorLog": "your error log text here"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "root_cause": "Description of the issue",
    "affected_files": ["file1.js", "file2.py"],
    "suggested_fixes": [
      {
        "file": "path/to/file.js",
        "description": "What to change",
        "fixed_code": "corrected code"
      }
    ],
    "explanation": "Why this fixes the issue"
  }
}
```

### `POST /api/create-pr`
Create a pull request with fixes

**Request:**
```json
{
  "owner": "username",
  "repo": "repository",
  "branch": "main",
  "fixes": [
    {
      "file": "src/app.js",
      "description": "Fix syntax error",
      "original_code": "old code",
      "fixed_code": "new code"
    }
  ],
  "title": "Fix: CI failure in workflow",
  "description": "Automated fix description"
}
```

**Response:**
```json
{
  "success": true,
  "pr_url": "https://github.com/owner/repo/pull/123",
  "pr_number": 123
}
```

## Usage Examples

### Test Error Analysis

Use the dashboard at `http://localhost:3000` or via API:

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "errorLog": "Error: Cannot find module '\''express'\''\n    at Function.Module._resolveFilename"
  }'
```

### Webhook Configuration

1. Go to your GitHub repository settings
2. Navigate to Webhooks → Add webhook
3. Set Payload URL to: `https://your-domain.com/api/webhook/ci-failure`
4. Content type: `application/json`
5. Select "Let me select individual events"
6. Check "Workflow runs"
7. Save webhook

## Deployment

### Deploy to Cloud

**Heroku:**
```bash
heroku create your-ci-fixer
heroku config:set GITHUB_TOKEN=your_token
heroku config:set GEMINI_API_KEY=your_key
git push heroku main
```

**Railway/Render:**
1. Connect your GitHub repository
2. Add environment variables
3. Deploy

**Docker:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GITHUB_TOKEN` | GitHub Personal Access Token | Yes |
| `GEMINI_API_KEY` | Google Gemini API Key | Yes |
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `WEBHOOK_SECRET` | Webhook verification secret | No |

## Development

### Project Structure

```
.
├── .github/
│   └── workflows/
│       └── ci-fixer.yml      # GitHub Action workflow
├── src/
│   ├── server.js             # Express server
│   ├── ai-analyzer.js        # Gemini AI integration
│   └── github-client.js      # GitHub API client
├── public/
│   └── index.html            # Dashboard UI
├── package.json
├── .env.example
└── README.md
```

### Adding Features

The modular architecture makes it easy to extend:

- **Add new AI models**: Modify `src/ai-analyzer.js`
- **Custom fix patterns**: Extend the analysis logic
- **Additional endpoints**: Add routes in `src/server.js`
- **Enhanced UI**: Update `public/index.html`

## Troubleshooting

### "GEMINI_API_KEY not configured"
- Ensure `.env` file exists with valid API key
- Restart the server after updating `.env`

### "GITHUB_TOKEN not configured"
- Create a Personal Access Token in GitHub settings
- Grant `repo` and `workflow` permissions
- Add to `.env` file

### Webhook not receiving events
- Verify webhook URL is publicly accessible
- Check webhook delivery logs in GitHub settings
- Ensure webhook is configured for "Workflow runs" events

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue on GitHub
- Check existing documentation
- Review the dashboard for system status

---

**CI-Fixer** - Stop debugging, start building. 🚀
