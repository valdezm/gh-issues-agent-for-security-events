interface IssueTrackingData {
  securityIssueId: string;
  githubIssueNumber: number;
  assigned: boolean;
  createdAt: string;
  severity: string;
}

interface IssueStats {
  issuesToday: number;
  issuesCreatedToday: number;
  issuesAssignedToday: number;
  severityBreakdown: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  totalIssues: number;
  totalCreated: number;
  totalAssigned: number;
}

/**
 * Tracks a newly created GitHub issue, updating the agent's state
 */
export async function trackIssueCreation(data: IssueTrackingData, agent: any): Promise<void> {
  try {
    // Get the current date string in YYYY-MM-DD format
    const today = getTodayDateString();
    
    // Initialize daily stats if they don't exist
    const dailyStats = agent.state.dailyStats || {};
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
    
    // Update the stats for today
    todayStats.issues++;
    todayStats.created++;
    if (data.assigned) {
      todayStats.assigned++;
    }
    
    // Update severity breakdown
    const severity = data.severity.toLowerCase();
    if (severity === 'low' || severity === 'medium' || severity === 'high' || severity === 'critical') {
      todayStats.severityBreakdown[severity]++;
    }
    
    // Update the state
    dailyStats[today] = todayStats;
    agent.setState({
      ...agent.state,
      dailyStats
    });
  } catch (error) {
    console.error('Error tracking issue creation:', error);
    throw error;
  }
}

/**
 * Gets statistics about issues
 */
export async function getIssueStats(agent: any): Promise<IssueStats> {
  try {
    const today = getTodayDateString();
    const dailyStats = agent.state.dailyStats || {};
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
    
    // Calculate totals across all days
    let totalIssues = 0;
    let totalCreated = 0;
    let totalAssigned = 0;
    const allTimeSeverity = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };
    
    // Sum up totals from all days
    Object.values(dailyStats).forEach((day: any) => {
      totalIssues += day.issues || 0;
      totalCreated += day.created || 0;
      totalAssigned += day.assigned || 0;
      
      // Add up severity breakdown
      if (day.severityBreakdown) {
        allTimeSeverity.low += day.severityBreakdown.low || 0;
        allTimeSeverity.medium += day.severityBreakdown.medium || 0;
        allTimeSeverity.high += day.severityBreakdown.high || 0;
        allTimeSeverity.critical += day.severityBreakdown.critical || 0;
      }
    });
    
    return {
      issuesToday: todayStats.issues,
      issuesCreatedToday: todayStats.created,
      issuesAssignedToday: todayStats.assigned,
      severityBreakdown: todayStats.severityBreakdown,
      totalIssues,
      totalCreated,
      totalAssigned
    };
  } catch (error) {
    console.error('Error getting issue stats:', error);
    throw error;
  }
}

/**
 * Helper function to get today's date string in YYYY-MM-DD format
 */
function getTodayDateString(): string {
  const date = new Date();
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}
