import { GitHubIssueAssignerAgent } from './agent';

// Export the agent for Cloudflare Workers
export default {
  async fetch(request, env, ctx) {
    // Create a new response object
    return new Response("GitHub Issue Assigner Agent is running. Please use the API endpoints to interact with it.");
  }
};

// Export the Agent class so Cloudflare can bind it to a Durable Object
export { GitHubIssueAssignerAgent };
