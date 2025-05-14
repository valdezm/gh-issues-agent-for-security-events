import { Hono } from 'hono';
import { createIssue } from './github';
import { getSecurityGroupOwner } from './aws';
import { trackIssueCreation, getIssueStats } from './stats';
import { formatIssueBody } from './utils';

// Define types
interface SecurityIssue {
  id: string;
  source: 'GuardDuty' | 'Lacework';
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedAt: string;
  resourceId: string;
  resourceType: string;
  remediationSteps: string[];
}

interface GitHubIssuePayload {
  securityIssue: SecurityIssue;
  resourceId: string;
  remediationSteps: string[];
  assignee?: string;
}

// Initialize app
const app = new Hono();

// Health check endpoint
app.get('/', (c) => {
  return c.json({ status: 'ok', message: 'GitHub Issue Assigner Agent is running' });
});

// Create a new GitHub issue for a security finding
app.post('/issues', async (c) => {
  try {
    const payload: GitHubIssuePayload = await c.req.json();
    
    // Validate input
    if (!payload.securityIssue || !payload.resourceId) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    // If assignee not provided, try to determine from AWS resource
    let assignee = payload.assignee;
    if (!assignee) {
      try {
        // This will be implemented later for AWS integration
        assignee = await getSecurityGroupOwner(payload.resourceId);
      } catch (error) {
        console.error('Error getting resource owner:', error);
        // Continue without assignee if lookup fails
      }
    }
    
    // Format issue body with all details
    const issueBody = formatIssueBody(payload.securityIssue, payload.remediationSteps);
    
    // Create the issue in GitHub
    const issue = await createIssue({
      title: `[${payload.securityIssue.source}] ${payload.securityIssue.title} - ${payload.resourceId}`,
      body: issueBody,
      labels: ['security', payload.securityIssue.severity.toLowerCase(), payload.securityIssue.source.toLowerCase()],
      assignee: assignee
    });
    
    // Track the issue for statistics
    await trackIssueCreation({
      securityIssueId: payload.securityIssue.id,
      githubIssueNumber: issue.number,
      assigned: !!assignee,
      createdAt: new Date().toISOString()
    });
    
    return c.json({
      success: true,
      issueUrl: issue.html_url,
      issueNumber: issue.number,
      assigned: !!assignee,
      assignee: assignee || null
    });
  } catch (error) {
    console.error('Error creating issue:', error);
    return c.json({ error: 'Failed to create issue', details: error.message }, 500);
  }
});

// Get statistics about issues
app.get('/stats', async (c) => {
  try {
    const stats = await getIssueStats();
    return c.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    return c.json({ error: 'Failed to get statistics', details: error.message }, 500);
  }
});

// Export for Cloudflare Workers
export default app;
