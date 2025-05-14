// Module for tracking and reporting issue statistics

interface IssueTrackingData {
  securityIssueId: string;
  githubIssueNumber: number;
  assigned: boolean;
  createdAt: string;
}

interface IssueStats {
  issuesToday: number;
  issuesCreatedToday: number;
  issuesAssignedToday: number;
  totalIssues: number;
  totalCreated: number;
  totalAssigned: number;
}

// KV namespace declared in wrangler.toml
declare const ISSUE_STATS: KVNamespace;

// Track a newly created GitHub issue
export async function trackIssueCreation(data: IssueTrackingData): Promise<void> {
  try {
    // Store the issue data with the security issue ID as the key
    await ISSUE_STATS.put(`issue:${data.securityIssueId}`, JSON.stringify(data));
    
    // Update daily counter for total issues
    const today = getTodayDateString();
    const issuesCountKey = `count:issues:${today}`;
    const currentCount = parseInt(await ISSUE_STATS.get(issuesCountKey) || '0');
    await ISSUE_STATS.put(issuesCountKey, (currentCount + 1).toString());
    
    // Update daily counter for created GitHub issues
    const createdCountKey = `count:created:${today}`;
    const currentCreatedCount = parseInt(await ISSUE_STATS.get(createdCountKey) || '0');
    await ISSUE_STATS.put(createdCountKey, (currentCreatedCount + 1).toString());
    
    // Update daily counter for assigned issues if applicable
    if (data.assigned) {
      const assignedCountKey = `count:assigned:${today}`;
      const currentAssignedCount = parseInt(await ISSUE_STATS.get(assignedCountKey) || '0');
      await ISSUE_STATS.put(assignedCountKey, (currentAssignedCount + 1).toString());
    }
    
    // Update total counters
    await incrementCounter('total:issues');
    await incrementCounter('total:created');
    if (data.assigned) {
      await incrementCounter('total:assigned');
    }
  } catch (error) {
    console.error('Error tracking issue creation:', error);
    throw error;
  }
}

// Get statistics about issues
export async function getIssueStats(): Promise<IssueStats> {
  try {
    const today = getTodayDateString();
    
    // Get daily counts
    const issuesToday = parseInt(await ISSUE_STATS.get(`count:issues:${today}`) || '0');
    const issuesCreatedToday = parseInt(await ISSUE_STATS.get(`count:created:${today}`) || '0');
    const issuesAssignedToday = parseInt(await ISSUE_STATS.get(`count:assigned:${today}`) || '0');
    
    // Get total counts
    const totalIssues = parseInt(await ISSUE_STATS.get('total:issues') || '0');
    const totalCreated = parseInt(await ISSUE_STATS.get('total:created') || '0');
    const totalAssigned = parseInt(await ISSUE_STATS.get('total:assigned') || '0');
    
    return {
      issuesToday,
      issuesCreatedToday,
      issuesAssignedToday,
      totalIssues,
      totalCreated,
      totalAssigned
    };
  } catch (error) {
    console.error('Error getting issue stats:', error);
    throw error;
  }
}

// Helper function to get today's date string in YYYY-MM-DD format
function getTodayDateString(): string {
  const date = new Date();
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

// Helper function to increment a counter
async function incrementCounter(key: string): Promise<void> {
  const currentValue = parseInt(await ISSUE_STATS.get(key) || '0');
  await ISSUE_STATS.put(key, (currentValue + 1).toString());
}
