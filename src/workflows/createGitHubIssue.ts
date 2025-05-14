import { z } from 'zod';
import { tools } from '../tools';

// Define the input schema for the workflow
const IssueCreationInputSchema = z.object({
  securityIssue: z.object({
    id: z.string(),
    source: z.enum(['GuardDuty', 'Lacework']),
    title: z.string().optional(),
    description: z.string().optional(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    detectedAt: z.string().optional(),
    resourceId: z.string().optional(),
    resourceType: z.string().optional(),
  }),
  resourceId: z.string(),
  remediationSteps: z.array(z.string()).optional(),
  assignee: z.string().optional(),
});

// Define the output schema for the workflow
const IssueCreationOutputSchema = z.object({
  success: z.boolean(),
  issueUrl: z.string().optional(),
  issueNumber: z.number().optional(),
  assigned: z.boolean(),
  assignee: z.string().nullable(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  estimatedEffort: z.enum(['SMALL', 'MEDIUM', 'LARGE']).optional(),
  error: z.string().optional(),
});

// Define the workflow for creating GitHub issues
export const createGitHubIssueWorkflow = {
  name: "Create GitHub Issue for Security Finding",
  description: "Analyzes a security finding and creates a detailed GitHub issue with appropriate assignment",
  input: IssueCreationInputSchema,
  output: IssueCreationOutputSchema,
  steps: [
    {
      name: "analyze_security_finding",
      description: "Analyze the security finding to extract key information",
      ai: {
        model: "openai/gpt-4o",
        system: `You are a security expert analyzing cloud security findings. 
                Extract the key information from the finding, keeping the title concise but descriptive.
                Determine severity based on potential impact. Suggest tags that would be helpful for categorization.`,
        prompt: ({input}) => `Analyze this security finding and structure it for a GitHub issue:
                ${JSON.stringify(input.securityIssue, null, 2)}
                
                Consider:
                1. What is the specific vulnerability or risk?
                2. What resource is affected? (${input.resourceId})
                3. How severe is this issue?
                4. What tags would be appropriate for this issue?`,
        schema: z.object({
          title: z.string(),
          description: z.string(),
          severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
          suggestedAssignee: z.string().optional(),
          estimatedEffort: z.enum(["SMALL", "MEDIUM", "LARGE"]),
          tags: z.array(z.string())
        })
      }
    },
    {
      name: "get_github_users",
      description: "Retrieve all users who have access to the GitHub repository",
      tool: tools.getGitHubUsers,
      args: ({env}) => ({
        owner: env.GITHUB_REPO_OWNER,
        repo: env.GITHUB_REPO_NAME
      })
    },
    {
      name: "get_resource_owner",
      description: "Find the owner of the AWS resource",
      tool: tools.getSecurityGroupOwner,
      args: ({input}) => ({
        securityGroupId: input.resourceId
      })
    },
    {
      name: "determine_assignee",
      description: "Determine the best assignee for the issue",
      ai: {
        model: "openai/gpt-4o-mini",
        system: "You are an expert at assigning security issues to the right team members.",
        prompt: ({input, steps}) => {
          const githubUsers = steps.get_github_users.map(user => user.login);
          const resourceOwner = steps.get_resource_owner;
          
          return `Based on this security issue, who would be the best person to assign from this list:
                  ${githubUsers.join(", ")}
                  
                  Issue: ${steps.analyze_security_finding.title}
                  Severity: ${steps.analyze_security_finding.severity}
                  Description: ${steps.analyze_security_finding.description}
                  
                  Resource owner information: ${resourceOwner ? JSON.stringify(resourceOwner) : "No resource owner found"}
                  
                  If the resource owner has a GitHub account in the list, prefer assigning to them.
                  Otherwise, consider the nature of the issue and the appropriate expertise.
                  
                  Reply with just the username of the best assignee, no explanation.`;
        },
        schema: z.string()
      }
    },
    {
      name: "validate_assignee",
      description: "Validate that the determined assignee exists in the repository",
      ai: {
        model: "openai/gpt-4o-mini",
        system: "You're validating GitHub usernames.",
        prompt: ({steps}) => {
          const githubUsers = steps.get_github_users.map(user => user.login);
          const suggestedAssignee = steps.determine_assignee;
          
          return `Does the username "${suggestedAssignee}" exist in this list of GitHub users?
                  ${githubUsers.join(", ")}
                  
                  If yes, return the exact username as it appears in the list.
                  If no, return the username that looks most similar or appropriate from the list.
                  Reply with only the username, no explanation.`;
        },
        schema: z.string()
      }
    },
    {
      name: "generate_remediation_steps",
      description: "Generate remediation steps if not provided",
      ai: {
        model: "openai/gpt-4o",
        system: "You are a cloud security remediation expert. Provide clear, actionable steps to resolve security issues.",
        prompt: ({input, steps}) => {
          if (input.remediationSteps && input.remediationSteps.length > 0) {
            return `Review these existing remediation steps and ensure they are clear, actionable, and complete:
                    ${input.remediationSteps.join("\n")}
                    
                    For the security issue:
                    Title: ${steps.analyze_security_finding.title}
                    Description: ${steps.analyze_security_finding.description}
                    Severity: ${steps.analyze_security_finding.severity}
                    
                    If the steps are already good, return them as is.
                    If they need improvement, provide an improved version.
                    Format as a numbered list of steps.`;
          } else {
            return `Generate step-by-step remediation instructions for this security issue:
                    Title: ${steps.analyze_security_finding.title}
                    Description: ${steps.analyze_security_finding.description}
                    Severity: ${steps.analyze_security_finding.severity}
                    
                    Specifically for resource: ${input.resourceId}
                    The issue was detected by: ${input.securityIssue.source}
                    
                    Provide 3-5 clear steps that would resolve this security issue.
                    Format as a numbered list.`;
          }
        },
        schema: z.string()
      }
    },
    {
      name: "format_issue_body",
      description: "Format the issue body with AI-enhanced content",
      ai: {
        model: "openai/gpt-4o",
        system: "You are a security documentation expert who creates clear, informative GitHub issues.",
        prompt: ({input, steps}) => {
          return `Create a detailed GitHub issue description for this security finding:
                
                Title: ${steps.analyze_security_finding.title}
                Severity: ${steps.analyze_security_finding.severity}
                Description: ${steps.analyze_security_finding.description}
                Resource ID: ${input.resourceId}
                Source: ${input.securityIssue.source}
                
                Include:
                1. A brief summary of the issue
                2. The potential impact of this vulnerability
                3. Technical context about this type of vulnerability
                4. How this issue was detected
                
                Then add a section for remediation steps:
                ${steps.generate_remediation_steps}
                
                Format using markdown with appropriate headers and sections.
                End with a footer that indicates this issue was automatically created by the GitHub Issue Assigner Agent.`;
        },
        schema: z.string()
      }
    },
    {
      name: "create_github_issue",
      description: "Create the GitHub issue with the formatted content",
      tool: tools.createGitHubIssue,
      args: ({input, steps, env}) => ({
        owner: env.GITHUB_REPO_OWNER,
        repo: env.GITHUB_REPO_NAME,
        title: steps.analyze_security_finding.title,
        body: steps.format_issue_body,
        labels: [
          steps.analyze_security_finding.severity.toLowerCase(), 
          input.securityIssue.source.toLowerCase(),
          ...steps.analyze_security_finding.tags
        ],
        assignees: [steps.validate_assignee]
      })
    }
  ],
  // Final function to process the results of all steps
  finalize: ({input, steps}) => {
    // Check if we successfully created the issue
    if (steps.create_github_issue) {
      return {
        success: true,
        issueUrl: steps.create_github_issue.html_url,
        issueNumber: steps.create_github_issue.number,
        assigned: !!steps.validate_assignee,
        assignee: steps.validate_assignee || null,
        severity: steps.analyze_security_finding.severity,
        estimatedEffort: steps.analyze_security_finding.estimatedEffort
      };
    } else {
      return {
        success: false,
        assigned: false,
        assignee: null,
        severity: input.securityIssue.severity,
        error: "Failed to create GitHub issue"
      };
    }
  }
};
