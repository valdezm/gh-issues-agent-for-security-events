import { Octokit } from '@octokit/rest';
import { z } from 'zod';

// Define the schema for GitHub user
const GitHubUserSchema = z.object({
  login: z.string(),
  id: z.number(),
  type: z.string(),
  site_admin: z.boolean().optional(),
});

// Define the schema for a security group owner
const OwnerInfoSchema = z.object({
  userId: z.string(),
  email: z.string().optional(),
  department: z.string().optional(),
  role: z.string().optional(),
});

// Define the schema for GitHub issue creation response
const GitHubIssueResponseSchema = z.object({
  number: z.number(),
  html_url: z.string(),
  id: z.number(),
  node_id: z.string().optional(),
  title: z.string(),
  state: z.string(),
  created_at: z.string(),
  updated_at: z.string().optional(),
});

// Define our tools
export const tools = {
  // Tool to get all users from a GitHub repository
  getGitHubUsers: {
    description: "Get all users who have access to the GitHub repository",
    parameters: z.object({
      owner: z.string().describe("GitHub repository owner (organization or username)"),
      repo: z.string().describe("GitHub repository name"),
    }),
    returns: z.array(GitHubUserSchema),
    async execute({ owner, repo }, { env }) {
      try {
        const octokit = new Octokit({
          auth: env.GITHUB_TOKEN
        });
        
        // Get collaborators for the repository
        const { data: collaborators } = await octokit.repos.listCollaborators({
          owner,
          repo,
        });
        
        return collaborators;
      } catch (error) {
        console.error('Error fetching GitHub users:', error);
        throw new Error(`Failed to get GitHub users: ${error.message}`);
      }
    }
  },
  
  // Tool to get the owner of an AWS security group
  getSecurityGroupOwner: {
    description: "Get the owner information for an AWS security group",
    parameters: z.object({
      securityGroupId: z.string().describe("AWS Security Group ID"),
    }),
    returns: OwnerInfoSchema.nullable(),
    async execute({ securityGroupId }, { env }) {
      console.log(`Looking up owner for security group: ${securityGroupId}`);
      
      // In a real implementation, this would use AWS SDK to query tags or CloudTrail history
      // For now, we'll return mock data based on security group ID patterns
      if (securityGroupId.includes('prod')) {
        return {
          userId: 'securityTeam',
          email: 'security@example.com',
          department: 'Security',
          role: 'Security Engineer'
        };
      } else if (securityGroupId.includes('dev')) {
        return {
          userId: 'alice',
          email: 'alice@example.com',
          department: 'Engineering',
          role: 'Developer'
        };
      } else if (securityGroupId.includes('test')) {
        return {
          userId: 'bob',
          email: 'bob@example.com',
          department: 'QA',
          role: 'Tester'
        };
      } else if (securityGroupId.includes('stage')) {
        return {
          userId: 'charlie',
          email: 'charlie@example.com',
          department: 'DevOps',
          role: 'SRE'
        };
      }
      
      // Return null if no owner found
      return null;
    }
  },
  
  // Tool to create a GitHub issue
  createGitHubIssue: {
    description: "Create a new GitHub issue",
    parameters: z.object({
      owner: z.string().describe("GitHub repository owner (organization or username)"),
      repo: z.string().describe("GitHub repository name"),
      title: z.string().describe("Issue title"),
      body: z.string().describe("Issue body content in markdown"),
      labels: z.array(z.string()).optional().describe("Labels to apply to the issue"),
      assignees: z.array(z.string()).optional().describe("GitHub usernames to assign to the issue"),
    }),
    returns: GitHubIssueResponseSchema,
    async execute({ owner, repo, title, body, labels, assignees }, { env }) {
      try {
        const octokit = new Octokit({
          auth: env.GITHUB_TOKEN
        });
        
        // Create the issue
        const { data } = await octokit.issues.create({
          owner,
          repo,
          title,
          body,
          labels,
          assignees: assignees || []
        });
        
        return {
          number: data.number,
          html_url: data.html_url,
          id: data.id,
          node_id: data.node_id,
          title: data.title,
          state: data.state,
          created_at: data.created_at,
          updated_at: data.updated_at
        };
      } catch (error) {
        console.error('Error creating GitHub issue:', error);
        throw new Error(`Failed to create GitHub issue: ${error.message}`);
      }
    }
  },
  
  // Tool to check if a GitHub user exists in the repository
  checkUserInRepo: {
    description: "Check if a specific GitHub user has access to the repository",
    parameters: z.object({
      owner: z.string().describe("GitHub repository owner (organization or username)"),
      repo: z.string().describe("GitHub repository name"),
      username: z.string().describe("GitHub username to check"),
    }),
    returns: z.boolean(),
    async execute({ owner, repo, username }, { env }) {
      try {
        const octokit = new Octokit({
          auth: env.GITHUB_TOKEN
        });
        
        // Get collaborators for the repository
        const { data: collaborators } = await octokit.repos.listCollaborators({
          owner,
          repo,
        });
        
        // Check if the username exists in the list of collaborators
        return collaborators.some(user => user.login === username);
      } catch (error) {
        console.error('Error checking if user exists in repo:', error);
        throw new Error(`Failed to check if user exists: ${error.message}`);
      }
    }
  },
  
  // Tool to get security group details (for future use)
  getSecurityGroupDetails: {
    description: "Get detailed information about an AWS security group",
    parameters: z.object({
      securityGroupId: z.string().describe("AWS Security Group ID"),
    }),
    returns: z.object({
      id: z.string(),
      name: z.string(),
      vpcId: z.string().optional(),
      description: z.string().optional(),
      tags: z.array(z.object({
        key: z.string(),
        value: z.string()
      })).optional(),
      inboundRules: z.array(z.object({
        port: z.number().or(z.string()),
        source: z.string(),
        protocol: z.string()
      })).optional()
    }),
    async execute({ securityGroupId }, { env }) {
      // This would use the AWS SDK to get details of a specific security group
      // For now, return mock data
      return {
        id: securityGroupId,
        name: `mock-sg-${securityGroupId}`,
        vpcId: 'vpc-12345',
        description: 'Mock security group for demonstration',
        tags: [
          { key: 'Owner', value: securityGroupId.includes('prod') ? 'securityTeam' : 'devTeam' },
          { key: 'Environment', value: securityGroupId.includes('prod') ? 'Production' : 'Development' }
        ],
        inboundRules: [
          { port: 22, source: '0.0.0.0/0', protocol: 'tcp' },
          { port: 3389, source: '0.0.0.0/0', protocol: 'tcp' }
        ]
      };
    }
  },
  
  // Tool to update an existing GitHub issue (for future use)
  updateGitHubIssue: {
    description: "Update an existing GitHub issue",
    parameters: z.object({
      owner: z.string().describe("GitHub repository owner (organization or username)"),
      repo: z.string().describe("GitHub repository name"),
      issue_number: z.number().describe("The issue number to update"),
      title: z.string().optional().describe("New issue title"),
      body: z.string().optional().describe("New issue body content"),
      state: z.enum(['open', 'closed']).optional().describe("State of the issue"),
      labels: z.array(z.string()).optional().describe("New labels to apply"),
      assignees: z.array(z.string()).optional().describe("New assignees"),
    }),
    returns: GitHubIssueResponseSchema,
    async execute({ owner, repo, issue_number, title, body, state, labels, assignees }, { env }) {
      try {
        const octokit = new Octokit({
          auth: env.GITHUB_TOKEN
        });
        
        // Update the issue
        const { data } = await octokit.issues.update({
          owner,
          repo,
          issue_number,
          title,
          body,
          state,
          labels,
          assignees
        });
        
        return {
          number: data.number,
          html_url: data.html_url,
          id: data.id,
          node_id: data.node_id,
          title: data.title,
          state: data.state,
          created_at: data.created_at,
          updated_at: data.updated_at
        };
      } catch (error) {
        console.error('Error updating GitHub issue:', error);
        throw new Error(`Failed to update GitHub issue: ${error.message}`);
      }
    }
  }
};
