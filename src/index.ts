import { GitHubIssueAssignerAgent } from './agent';

// Export the agent for Cloudflare Workers
export default {
  async fetch(request, env, ctx) {
    // For main fetch handler on the worker
    return new Response("GitHub Issue Assigner Agent is running. Access the agent through its specific endpoints.");
  }
};

// Export the Agent class so Cloudflare can bind it to a Durable Object
export { GitHubIssueAssignerAgent };
