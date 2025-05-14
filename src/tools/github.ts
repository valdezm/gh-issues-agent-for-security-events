import { Octokit } from '@octokit/rest';

interface IssueParams {
  title: string;
  body: string;
  labels: string[];
  assignee?: string;
}

/**
 * Creates a GitHub issue with the specified parameters
 */
export async function createGitHubIssue(params: IssueParams, env: any) {
  try {
    const octokit = new Octokit({
      auth: env.GITHUB_TOKEN
    });
    
    // Create the issue
    const { data: issue } = await octokit.issues.create({
      owner: env.GITHUB_REPO_OWNER,
      repo: env.GITHUB_REPO_NAME,
      title: params.title,
      body: params.body,
      labels: params.labels,
      assignees: params.assignee ? [params.assignee] : []
    });
    
    return issue;
  } catch (error) {
    console.error('Error creating GitHub issue:', error);
    throw error;
  }
}

/**
 * Gets all users from the GitHub repository
 */
export async function getRepoUsers(env: any): Promise<string[]> {
  try {
    const octokit = new Octokit({
      auth: env.GITHUB_TOKEN
    });
    
    // Get collaborators for the repository
    const { data: collaborators } = await octokit.repos.listCollaborators({
      owner: env.GITHUB_REPO_OWNER,
      repo: env.GITHUB_REPO_NAME,
    });
    
    return collaborators.map(user => user.login);
  } catch (error) {
    console.error('Error fetching GitHub users:', error);
    throw error;
  }
}

/**
 * Checks if a GitHub user exists in the repository
 */
export async function userExistsInRepo(username: string, env: any): Promise<boolean> {
  try {
    const users = await getRepoUsers(env);
    return users.includes(username);
  } catch (error) {
    console.error('Error checking if user exists:', error);
    return false;
  }
}
