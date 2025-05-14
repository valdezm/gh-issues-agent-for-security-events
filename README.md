# GitHub Issue Assigner Agent

A Cloudflare AI Agent that creates GitHub issues from security findings detected by Amazon GuardDuty and Lacework Polygraph.

## Features

- Uses Cloudflare AI Workflows to orchestrate issue creation and management
- Analyzes security findings to generate detailed, clear GitHub issues
- Determines appropriate assignees based on resource ownership and expertise
- Generates remediation steps with AI assistance when not provided
- Provides real-time statistics on issue creation and assignment
- Maintains persistent state for historical tracking

## How It Works

This agent uses Cloudflare's AI Agents framework with workflow orchestration to:

1. **Receive Security Findings**: Accepts findings from GuardDuty or Lacework
2. **Analyze Findings**: Uses AI to extract key information and assess severity
3. **Identify Resource Owners**: Checks AWS resources to find ownership information
4. **Create Detailed Issues**: Formats complete GitHub issues with remediation steps
5. **Assign Appropriately**: Determines the best GitHub user to assign the issue to
6. **Track Statistics**: Maintains comprehensive statistics on issue management

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
    "title": "string (optional)",
    "description": "string (optional)",
    "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    "detectedAt": "string (ISO date)",
    "resourceId": "string (optional)",
    "resourceType": "string (optional)"
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

## AI Workflow

The agent uses a structured workflow with the following steps:

1. **Analyze Security Finding**: AI evaluates the security finding to extract key information
2. **Get GitHub Users**: Retrieves all users who have access to the repository
3. **Get Resource Owner**: Identifies the owner of the AWS resource
4. **Determine Assignee**: AI determines the best person to assign based on context
5. **Validate Assignee**: Ensures the assignee exists in the repository
6. **Generate Remediation Steps**: Creates or validates steps to resolve the issue
7. **Format Issue Body**: AI crafts a detailed issue description in markdown
8. **Create GitHub Issue**: Creates the issue in GitHub with all gathered information

## Tools

The agent has access to these tools:

- `getGitHubUsers`: Get all users with access to the repository
- `getSecurityGroupOwner`: Find the owner of an AWS security group
- `createGitHubIssue`: Create a new issue in GitHub
- `checkUserInRepo`: Verify if a user has access to the repository
- `getSecurityGroupDetails`: Get details about a security group
- `updateGitHubIssue`: Update an existing issue

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

## AWS Integration

For full functionality with AWS resources, the agent needs AWS credentials with appropriate permissions:
- `ec2:DescribeSecurityGroups` - For security group details
- `cloudtrail:LookupEvents` - For resource ownership history
- Other permissions as needed for resource access

## Future Enhancements

- Automatic PR creation for simple security fixes
- Integration with Slack for notifications
- Support for additional security finding sources
- Resource tagging recommendations for better ownership tracking
- Historical trend analysis and reporting