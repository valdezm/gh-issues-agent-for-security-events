import { Agent } from "agents";
import { openai } from "@ai-sdk/openai";
import { generateText, generateObject } from "ai";
import { z } from "zod";
import { createGitHubIssue } from "./tools/github";
import { getSecurityGroupOwner } from "./tools/aws";
import { trackIssueCreation, getIssueStats } from "./tools/stats";

// Define our agent class that extends from the Cloudflare Agents framework
export class GitHubIssueAssignerAgent extends Agent {
  // Initialize state for tracking
  initialState = {
    issuesCreated: 0,
    issuesAssigned: 0,
    totalIssues: 0,
    lastProcessedAt: null,
    dailyStats: {}
  };

  // Handle HTTP requests to create issues
  async onRequest(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Route based on path
    if (path === "/issues" && request.method === "POST") {
      return this.handleIssueCreation(request);
    } else if (path === "/stats" && request.method === "GET") {
      return this.handleGetStats();
    } else {
      return new Response("Not found", { status: 404 });
    }
  }

  // Handle issue creation with AI assistance
  async handleIssueCreation(request) {
    try {
      // Parse the incoming security finding
      const payload = await request.json();
      
      // Use AI to analyze the security finding and generate a structured representation
      const { object: analyzedIssue } = await generateObject({
        model: openai("gpt-4o"),
        schema: z.object({
          title: z.string(),
          description: z.string(),
          severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
          suggestedAssignee: z.string().optional(),
          estimatedEffort: z.enum(["SMALL", "MEDIUM", "LARGE"]),
          tags: z.array(z.string())
        }),
        system: `You are a security expert analyzing cloud security findings. 
                Extract the key information from the finding, keeping the title concise but descriptive.
                Determine severity based on potential impact. Suggest tags that would be helpful for categorization.`,
        prompt: `Analyze this security finding and structure it for a GitHub issue:
                ${JSON.stringify(payload, null, 2)}
                
                Consider:
                1. What is the specific vulnerability or risk?
                2. What resource is affected? (${payload.resourceId})
                3. How severe is this issue?
                4. What tags would be appropriate for this issue?`
      });
      
      // Generate remediation steps if not provided
      let remediationSteps = payload.remediationSteps || [];
      if (remediationSteps.length === 0) {
        const { text: remediation } = await generateText({
          model: openai("gpt-4o"),
          system: "You are a cloud security remediation expert. Provide clear, actionable steps to resolve security issues.",
          prompt: `Generate step-by-step remediation instructions for this security issue:
                  ${JSON.stringify(analyzedIssue, null, 2)}
                  
                  Specifically for resource: ${payload.resourceId}
                  The issue was detected by: ${payload.securityIssue?.source || "Unknown"}
                  
                  Provide 3-5 clear steps that would resolve this security issue.`
        });
        
        // Convert the generated text into an array of steps
        remediationSteps = remediation
          .split("\n")
          .filter(step => step.trim().length > 0 && !step.trim().startsWith("#"));
      }
      
      // Find the best assignee using AI and resource owner information
      let assignee = payload.assignee;
      if (!assignee) {
        // Try to find the owner of the security group
        const resourceOwner = await getSecurityGroupOwner(payload.resourceId, this.env);
        
        // Use AI to determine the best assignee based on issue details and available users
        if (resourceOwner) {
          assignee = resourceOwner;
        } else {
          // If no direct owner is found, use AI to suggest an assignee from the list of users
          const githubUsers = await this.getGitHubUsers();
          
          const { text: suggestedAssignee } = await generateText({
            model: openai("gpt-4o-mini"),
            system: "You are an expert at assigning security issues to the right team members.",
            prompt: `Based on this security issue, who would be the best person to assign from this list:
                    ${githubUsers.join(", ")}
                    
                    Issue: ${analyzedIssue.title}
                    Severity: ${analyzedIssue.severity}
                    Description: ${analyzedIssue.description}
                    
                    Reply with just the username, no explanation.`
          });
          
          assignee = suggestedAssignee.trim();
        }
      }
      
      // Create the GitHub issue with enhanced description
      const issueResult = await createGitHubIssue({
        title: analyzedIssue.title,
        body: this.formatIssueBody(analyzedIssue, remediationSteps),
        labels: [
          analyzedIssue.severity.toLowerCase(), 
          ...(payload.securityIssue?.source ? [payload.securityIssue.source.toLowerCase()] : []),
          ...analyzedIssue.tags
        ],
        assignee: assignee
      }, this.env);
      
      // Track statistics about the issue creation
      await trackIssueCreation({
        securityIssueId: payload.securityIssue?.id || `manual-${Date.now()}`,
        githubIssueNumber: issueResult.number,
        assigned: !!assignee,
        createdAt: new Date().toISOString(),
        severity: analyzedIssue.severity
      }, this);
      
      // Update agent state
      this.setState({
        ...this.state,
        issuesCreated: this.state.issuesCreated + 1,
        issuesAssigned: assignee ? this.state.issuesAssigned + 1 : this.state.issuesAssigned,
        totalIssues: this.state.totalIssues + 1,
        lastProcessedAt: new Date().toISOString()
      });
      
      return Response.json({
        success: true,
        issueUrl: issueResult.html_url,
        issueNumber: issueResult.number,
        assigned: !!assignee,
        assignee: assignee || null,
        severity: analyzedIssue.severity,
        estimatedEffort: analyzedIssue.estimatedEffort
      });
    } catch (error) {
      console.error("Error creating issue:", error);
      return Response.json({ error: "Failed to create issue", details: error.message }, { status: 500 });
    }
  }
  
  // Handle statistics request
  async handleGetStats() {
    try {
      const stats = await getIssueStats(this);
      return Response.json(stats);
    } catch (error) {
      console.error("Error getting stats:", error);
      return Response.json({ error: "Failed to get statistics", details: error.message }, { status: 500 });
    }
  }
  
  // Format the issue body with AI-enhanced content
  async formatIssueBody(issue, remediationSteps) {
    // Use AI to generate a more detailed and helpful issue description
    const { text: enhancedDescription } = await generateText({
      model: openai("gpt-4o"),
      system: "You are a security documentation expert who creates clear, informative GitHub issues.",
      prompt: `Create a detailed GitHub issue description for this security finding:
              
              Title: ${issue.title}
              Severity: ${issue.severity}
              Base Description: ${issue.description}
              
              Include:
              1. A brief summary of the issue
              2. The potential impact of this vulnerability
              3. Technical context about this type of vulnerability
              4. How this issue was detected
              
              Format using markdown with appropriate headers and sections.`
    });
    
    let body = enhancedDescription;
    
    // Add remediation steps section
    body += "\n\n## Remediation Steps\n\n";
    if (remediationSteps && remediationSteps.length > 0) {
      for (let i = 0; i < remediationSteps.length; i++) {
        body += `${i + 1}. ${remediationSteps[i]}\n`;
      }
    } else {
      body += "_No specific remediation steps provided._\n";
    }
    
    // Add footer
    body += "\n\n---\n";
    body += "_This issue was automatically created by the GitHub Issue Assigner Agent based on a security finding._\n";
    
    return body;
  }
  
  // Get GitHub users for the repository
  async getGitHubUsers() {
    try {
      // Use GitHub API to get users (implement in github.js tool)
      // For now, return mock data
      return ["alice", "bob", "charlie", "securityTeam"];
    } catch (error) {
      console.error("Error fetching GitHub users:", error);
      return [];
    }
  }
}
