# GitHub Issue Assigner Agent

A Cloudflare Workers agent that creates GitHub issues based on security findings from Amazon GuardDuty and Lacework Polygraph.

## Features

- Creates GitHub issues from security findings with detailed information
- Automatically assigns issues to relevant GitHub users
- Tracks statistics on issue creation and assignment
- Provides API for querying issue statistics
- Integrates with AWS for resource ownership information (future enhancement)

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
    "resourceType": "string",
    "remediationSteps": ["string"]
  },
  "resourceId": "string",
  "remediationSteps": ["string"],
  "assignee": "string (optional)"
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
   npm run deploy
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

## Future Enhancements

- AWS integration for security group ownership
- User mapping between AWS and GitHub
- Slack notifications for issue creation
- Advanced issue assignment based on resource expertise
