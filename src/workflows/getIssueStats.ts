import { z } from 'zod';

// Define the output schema for the workflow
const StatsOutputSchema = z.object({
  issuesToday: z.number(),
  issuesCreatedToday: z.number(),
  issuesAssignedToday: z.number(),
  severityBreakdown: z.object({
    low: z.number(),
    medium: z.number(),
    high: z.number(),
    critical: z.number(),
  }),
  totalIssues: z.number(),
  totalCreated: z.number(),
  totalAssigned: z.number(),
  recentActivity: z.array(
    z.object({
      date: z.string(),
      issuesCreated: z.number(),
      issuesAssigned: z.number(),
    })
  ).optional(),
});

// Define the workflow for retrieving issue statistics
export const getIssueStatsWorkflow = {
  name: "Get Issue Statistics",
  description: "Retrieves statistics about GitHub issues created by the agent",
  output: StatsOutputSchema,
  steps: [
    {
      name: "retrieve_agent_state",
      description: "Retrieve the current agent state containing statistics",
      execute: async ({agent}) => {
        // Return the agent's state, focusing on statistics
        const state = agent.state || {};
        const dailyStats = state.dailyStats || {};
        
        return {
          state,
          dailyStats
        };
      }
    },
    {
      name: "calculate_statistics",
      description: "Calculate comprehensive statistics from the agent state",
      execute: async ({steps}) => {
        const { state, dailyStats } = steps.retrieve_agent_state;
        
        // Get today's date string
        const today = new Date().toISOString().split('T')[0];
        
        // Initialize statistics
        const stats = {
          issuesToday: 0,
          issuesCreatedToday: 0,
          issuesAssignedToday: 0,
          severityBreakdown: {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0
          },
          totalIssues: state.totalIssues || 0,
          totalCreated: state.issuesCreated || 0,
          totalAssigned: state.issuesAssigned || 0,
          recentActivity: []
        };
        
        // Calculate today's statistics
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
        
        stats.issuesToday = todayStats.issues || 0;
        stats.issuesCreatedToday = todayStats.created || 0;
        stats.issuesAssignedToday = todayStats.assigned || 0;
        stats.severityBreakdown = todayStats.severityBreakdown || {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0
        };
        
        // Calculate recent activity (last 7 days)
        const recentActivity = [];
        const now = new Date();
        
        for (let i = 0; i < 7; i++) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          const dayStats = dailyStats[dateStr] || {
            created: 0,
            assigned: 0
          };
          
          recentActivity.push({
            date: dateStr,
            issuesCreated: dayStats.created || 0,
            issuesAssigned: dayStats.assigned || 0
          });
        }
        
        stats.recentActivity = recentActivity;
        
        return stats;
      }
    },
    {
      name: "analyze_trends",
      description: "Analyze trends in issue creation and assignment",
      ai: {
        model: "openai/gpt-4o-mini",
        system: "You are a data analyst examining security issue trends.",
        prompt: ({steps}) => {
          const stats = steps.calculate_statistics;
          
          return `Analyze these security issue statistics and identify key trends:
                  ${JSON.stringify(stats, null, 2)}
                  
                  Consider:
                  1. How today's issues compare to recent averages
                  2. The distribution of severity levels
                  3. The assignment rate
                  
                  Provide a brief analysis of the patterns you see.`;
        },
        schema: z.object({
          summary: z.string(),
          keyMetrics: z.record(z.string(), z.string()),
          recommendations: z.array(z.string()).optional()
        })
      }
    }
  ],
  // Final function to process the results of all steps
  finalize: ({steps}) => {
    // Get the statistics from the calculation step
    const stats = steps.calculate_statistics;
    
    // Add analysis if available
    if (steps.analyze_trends) {
      stats.analysis = steps.analyze_trends;
    }
    
    return stats;
  }
};
