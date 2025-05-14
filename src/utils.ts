// Utility functions for formatting and other common tasks

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

// Format the body of a GitHub issue with all relevant details
export function formatIssueBody(issue: SecurityIssue, remediationSteps: string[]): string {
  let body = `## Security Issue: ${issue.title}\n\n`;
  
  // Add metadata section
  body += '### Metadata\n\n';
  body += `- **Source**: ${issue.source}\n`;
  body += `- **Severity**: ${issue.severity}\n`;
  body += `- **Detected At**: ${issue.detectedAt}\n`;
  body += `- **Resource ID**: ${issue.resourceId}\n`;
  body += `- **Resource Type**: ${issue.resourceType}\n`;
  body += `- **Issue ID**: ${issue.id}\n\n`;
  
  // Add description
  body += '### Description\n\n';
  body += `${issue.description}\n\n`;
  
  // Add remediation steps
  body += '### Remediation Steps\n\n';
  
  if (remediationSteps && remediationSteps.length > 0) {
    for (let i = 0; i < remediationSteps.length; i++) {
      body += `${i + 1}. ${remediationSteps[i]}\n`;
    }
  } else {
    body += '_No remediation steps provided._\n';
  }
  
  // Add footer
  body += '\n\n---\n';
  body += '_This issue was automatically created by the GitHub Issue Assigner Agent based on a security finding._\n';
  
  return body;
}

// Helper function to validate issue payload
export function validateIssuePayload(payload: any): string | null {
  if (!payload) {
    return 'Payload is missing';
  }
  
  if (!payload.securityIssue) {
    return 'Security issue data is missing';
  }
  
  const requiredFields = ['id', 'source', 'title', 'description', 'severity', 'resourceId'];
  for (const field of requiredFields) {
    if (!payload.securityIssue[field]) {
      return `Required field '${field}' is missing in security issue`;
    }
  }
  
  return null; // No validation errors
}

// Format a date as ISO string
export function formatDate(date: Date): string {
  return date.toISOString();
}

// Generate a random ID for testing
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
}
