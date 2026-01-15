# CI-Fixer 🤖

**AI that automatically fixes your CI failures. Paste an error, get a PR-ready fix in minutes. Stop debugging pipelines and get back to building.**

CI-Fixer is an intelligent GitHub Action and Node.js service that automatically detects CI/CD workflow failures, analyzes error logs using AI, and creates Pull Requests with suggested fixes.

## Features

- 🔍 **Auto-Detection**: Automatically detects CI workflow failures using GitHub Actions
- 🧠 **AI Analysis**: Uses Google Gemini AI to analyze error logs and identify root causes
- 🔧 **Auto-Fix PRs**: Creates Pull Requests with suggested code fixes and detailed instructions
- 📊 **Status Dashboard**: Real-time dashboard to monitor analyses and fixes
- 🚀 **Easy Setup**: Simple configuration with environment variables

## Quick Start

### Prerequisites

- Node.js 18 or higher
- GitHub repository with Actions enabled
- GitHub Personal Access Token (with `repo` and `workflow` permissions)
- Google Gemini API Key (optional, but recommended for AI analysis)

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

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
GITHUB_TOKEN=your_github_token_here
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

4. **Start the service**

```bash
npm start
```

The service will be available at:
- Main page: http://localhost:3000
- Dashboard: http://localhost:3000/dashboard.html
- Health check: http://localhost:3000/health

### GitHub Action Setup

The GitHub Action is already configured in `.github/workflows/ci-fixer.yml`. It will automatically:

1. Trigger when any workflow in your repository fails
2. Extract error logs from the failed job
3. Send the logs to the CI-Fixer service for analysis
4. Create a Pull Request with suggested fixes

To use it in your repository:

1. Copy `.github/workflows/ci-fixer.yml` to your repository
2. Add the following secrets to your GitHub repository:
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `GITHUB_TOKEN`: Automatically provided by GitHub Actions

## Architecture

```
┌─────────────────┐
│  GitHub Actions │  (Detects CI failures)
└────────┬────────┘
         │
         v
┌─────────────────┐
│  CI-Fixer API   │  (Analyzes errors)
│  (Express)      │
└────────┬────────┘
         │
    ┌────┴────┐
    v         v
┌─────────┐ ┌──────────┐
│ Gemini  │ │ GitHub   │
│ AI      │ │ API      │
└─────────┘ └──────────┘
                │
                v
         ┌─────────────┐
         │ Create PR   │
         └─────────────┘
```

## API Endpoints

### POST /api/analyze

Analyze a CI failure and create a fix.

**Request Body:**
```json
{
  "repository": "owner/repo",
  "workflow": "CI",
  "branch": "main",
  "commit": "abc123",
  "error_log": "Error log content...",
  "job_name": "build",
  "job_url": "https://github.com/..."
}
```

**Response:**
```json
{
  "analysis_id": "owner/repo-1234567890",
  "status": "started",
  "message": "Analysis started. Check status at /api/status/..."
}
```

### GET /api/status/:analysisId

Get the status of an analysis.

**Response:**
```json
{
  "id": "owner/repo-1234567890",
  "status": "completed",
  "repository": "owner/repo",
  "pr_url": "https://github.com/owner/repo/pull/123",
  "pr_number": 123,
  "ai_analysis": {
    "root_cause": "Missing dependency...",
    "error_type": "dependency",
    "fixes": [...],
    "instructions": [...]
  }
}
```

### GET /api/analyses

Get all analyses (recent first).

**Query Parameters:**
- `limit`: Maximum number of results (default: 50)

### GET /api/stats

Get dashboard statistics.

**Response:**
```json
{
  "total": 42,
  "active": 2,
  "completed": 35,
  "successful": 30,
  "failed": 5,
  "success_rate": "85.7"
}
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub Personal Access Token with `repo` and `workflow` permissions |
| `GEMINI_API_KEY` | No | Google Gemini API key for AI analysis (falls back to rule-based if not provided) |
| `PORT` | No | Server port (default: 3000) |
| `CORS_ORIGIN` | No | CORS origin (* for all, or specific domain for production) |
| `NODE_ENV` | No | Environment (development/production) |

### Important Security Notes

⚠️ **Log Sanitization**: Error logs may contain sensitive information such as API keys, passwords, or internal system details. 

- Logs are truncated but NOT sanitized by default
- Ensure your CI workflows don't log secrets
- Use GitHub's secret masking features
- Consider implementing custom sanitization for your use case
- Review logs before they are sent to external AI services

### Getting API Keys

**GitHub Token:**
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `workflow`
4. Generate and copy the token

**Gemini API Key:**
1. Go to https://makersuite.google.com/app/apikey
2. Create a new API key
3. Copy the key

## Error Types Supported

CI-Fixer can analyze and suggest fixes for:

- **Dependency errors**: Missing packages, version conflicts
- **Syntax errors**: Code syntax issues
- **Test failures**: Failed test cases
- **Build errors**: Compilation and build failures
- **Permission errors**: File access and permission issues
- **Timeout errors**: Long-running operations
- **Network errors**: Connection and network issues

## Development

### Project Structure

```
heloc/
├── .github/
│   └── workflows/
│       └── ci-fixer.yml        # GitHub Action workflow
├── src/
│   ├── server.js               # Express API server
│   ├── services/
│   │   ├── aiService.js        # AI analysis service
│   │   └── githubService.js    # GitHub API integration
├── public/
│   ├── index.html              # Landing page
│   └── dashboard.html          # Status dashboard
├── .env.example                # Environment variables template
├── package.json
└── README.md
```

### Running in Development

```bash
npm run dev
```

### Testing the Service

1. **Health Check:**
```bash
curl http://localhost:3000/health
```

2. **Submit Analysis:**
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repository": "test/repo",
    "error_log": "npm ERR! 404 Not Found - GET https://registry.npmjs.org/unknown-package",
    "job_name": "build"
  }'
```

3. **Check Status:**
```bash
curl http://localhost:3000/api/stats
```

## Deployment

### Deploy to Production

1. **Set up a server** (e.g., AWS EC2, DigitalOcean, Heroku)

2. **Install dependencies:**
```bash
npm install --production
```

3. **Set environment variables** in your hosting platform

4. **Start the service:**
```bash
npm start
```

5. **Set up a reverse proxy** (nginx, Apache) for production

6. **Update GitHub Action** to point to your deployed service URL

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t ci-fixer .
docker run -p 3000:3000 --env-file .env ci-fixer
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or suggestions:
- Open an issue: https://github.com/brandonlacoste9-tech/heloc/issues
- Email: support@ci-fixer.dev

---

**CI-Fixer** - Built with ❤️ for developers who want to spend less time debugging and more time building.

