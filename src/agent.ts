import { Agent } from "agents";
import { runWorkflow } from "agents/workflows";
import { createGitHubIssueWorkflow } from "./workflows/createGitHubIssue";
import { getIssueStatsWorkflow } from "./workflows/getIssueStats";

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

  // Handle HTTP requests
  async onRequest(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Route based on path
    if (path === "/issues" && request.method === "POST") {
      return this.handleIssueCreation(request);
    } else if (path === "/stats" && request.method === "GET") {
      return this.handleGetStats();
    } else if (path === "/health" || path === "/") {
      return new Response("GitHub Issue Assigner Agent is running", { status: 200 });
    } else {
      return new Response("Not found", { status: 404 });
    }
  }

  // Handle issue creation using the workflow
  async handleIssueCreation(request) {
    try {
      // Parse the incoming security finding
      const payload = await request.json();
      
      // Run the workflow to create a GitHub issue
      const result = await runWorkflow({
        workflow: createGitHubIssueWorkflow,
        input: payload,
        agent: this
      });
      
      // Update agent state based on workflow result
      if (result.success) {
        // Get today's date for statistics
        const today = new Date().toISOString().split('T')[0];
        
        // Initialize or update daily stats
        const dailyStats = this.state.dailyStats || {};
        const todayStats = dailyStats[today] || {
          issues: 0,
          created: 0,
          assigned: 0,
          severityBreakdown: {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0
          }
        };
        
        // Update today's stats
        todayStats.issues++;
        todayStats.created++;
        if (result.assigned) {
          todayStats.assigned++;
        }
        
        // Update severity breakdown
        const severity = result.severity.toLowerCase();
        if (severity === 'low' || severity === 'medium' || severity === 'high' || severity === 'critical') {
          todayStats.severityBreakdown[severity]++;
        }
        
        // Save updated stats
        dailyStats[today] = todayStats;
        
        // Update agent state
        this.setState({
          ...this.state,
          issuesCreated: (this.state.issuesCreated || 0) + 1,
          issuesAssigned: result.assigned ? (this.state.issuesAssigned || 0) + 1 : (this.state.issuesAssigned || 0),
          totalIssues: (this.state.totalIssues || 0) + 1,
          lastProcessedAt: new Date().toISOString(),
          dailyStats
        });
      }
      
      return Response.json(result);
    } catch (error) {
      console.error("Error creating issue:", error);
      return Response.json({ 
        success: false, 
        error: "Failed to create issue", 
        details: error.message 
      }, { status: 500 });
    }
  }
  
  // Handle statistics request using the workflow
  async handleGetStats() {
    try {
      // Run the workflow to get issue statistics
      const stats = await runWorkflow({
        workflow: getIssueStatsWorkflow,
        agent: this
      });
      
      return Response.json(stats);
    } catch (error) {
      console.error("Error getting stats:", error);
      return Response.json({ 
        error: "Failed to get statistics", 
        details: error.message 
      }, { status: 500 });
    }
  }
}
