import { Octokit } from '@octokit/rest';

interface IssueParams {
  title: string;
  body: string;
  labels: string[];
  assignee?: string;
}

// Initialize GitHub client
let octokit: Octokit;

function getOctokit() {
  if (!octokit) {
    octokit = new Octokit({
      auth: env.GITHUB_TOKEN
    });
  }
  return octokit;
}

// Get all users from the GitHub repository
export async function getRepoUsers(): Promise<string[]> {
  try {
    const github = getOctokit();
    
    // Get collaborators for the repository
    const { data: collaborators } = await github.repos.listCollaborators({
      owner: env.GITHUB_REPO_OWNER,
      repo: env.GITHUB_REPO_NAME,
    });
    
    return collaborators.map(user => user.login);
  } catch (error) {
    console.error('Error fetching GitHub users:', error);
    throw error;
  }
}

// Create a new issue in GitHub
export async function createIssue(params: IssueParams) {
  try {
    const github = getOctokit();
    
    // Create the issue
    const { data: issue } = await github.issues.create({
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

// Find the best user to assign based on resource
export async function findBestAssignee(resourceId: string): Promise<string | undefined> {
  // First get all users in the repo
  const users = await getRepoUsers();
  
  // In the future, this function can be expanded to match users with resources
  // based on ownership data from AWS or other sources
  
  // For now, we'll return undefined to indicate we don't know who to assign to
  return undefined;
}

// Check if a GitHub user exists in the repository
export async function userExistsInRepo(username: string): Promise<boolean> {
  try {
    const users = await getRepoUsers();
    return users.includes(username);
  } catch (error) {
    console.error('Error checking if user exists:', error);
    return false;
  }
}

// Variables declared in wrangler.toml
declare const env: {
  GITHUB_TOKEN: string;
  GITHUB_REPO_OWNER: string;
  GITHUB_REPO_NAME: string;
};
