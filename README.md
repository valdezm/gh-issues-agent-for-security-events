# GitHub Issue Assigner Agent

A Cloudflare AI Worker that creates GitHub issues based on security findings from Amazon GuardDuty and Lacework Polygraph.

## Features

- Creates GitHub issues from security findings with AI-enhanced descriptions
- Uses AI to determine optimal assignees based on resource ownership
- Automatically generates remediation steps when not provided
- Tracks statistics on issue creation and assignment
- Provides API for querying issue statistics
- Integrates with AWS for resource ownership information

## How It Works

This agent leverages Cloudflare's AI capabilities to:

1. Analyze security findings and extract key information
2. Generate clear, detailed issue descriptions with proper formatting
3. Create appropriate remediation steps for the detected issues
4. Determine the best GitHub user to assign based on resource ownership
5. Track and report statistics on issue management

## API Endpoints

### Create Issue
```
POST /issues
```

Creates a GitHub issue from a security finding.

**Request Body:**
```json
{
  "securityIssue": {
    "id": "string",
    "source": "GuardDuty" | "Lacework",
    "title": "string",
    "description": "string",
    "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    "detectedAt": "string (ISO date)",
    "resourceId": "string",
    "resourceType": "string"
  },
  "resourceId": "string",
  "remediationSteps": ["string"] (optional),
  "assignee": "string" (optional)
}
```

### Get Statistics
```
GET /stats
```

Returns statistics about issues created and assigned.

**Response:**
```json
{
  "issuesToday": number,
  "issuesCreatedToday": number,
  "issuesAssignedToday": number,
  "severityBreakdown": {
    "low": number,
    "medium": number,
    "high": number,
    "critical": number
  },
  "totalIssues": number,
  "totalCreated": number,
  "totalAssigned": number
}
```

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Configure the `wrangler.toml` file with your GitHub credentials and repository information.

3. Deploy to Cloudflare Workers:
   ```
   npx wrangler deploy
   ```

## Local Development

Start a local development server:
```
npm run dev
```

## GitHub Integration

The agent requires a GitHub Personal Access Token with the following scopes:
- `repo` - For creating issues
- `read:org` - For listing repository users

## AI Components

This agent uses Cloudflare AI to:

1. Analyze security findings for clear issue creation
2. Determine severity and priority of issues
3. Generate detailed remediation steps
4. Select the most appropriate assignee
5. Format the issue for maximum clarity

## Future Enhancements

- Enhanced AWS integration for richer security group information
- User mapping between AWS and GitHub users
- Slack notifications for high-severity issues
- Advanced issue assignment based on resource expertise
- Automatic PR creation for simple security fixes