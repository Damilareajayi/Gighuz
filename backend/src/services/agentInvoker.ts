import { AgentListing, AgentInvocationRequest, AgentInvocationResult } from '../types';

const INVOCATION_TIMEOUT_MS = 30_000;

/**
 * Calls a third-party agent's registered webhook with the task and waits for
 * its result. This is the entire integration contract for v1 — a developer
 * registers an HTTPS endpoint that accepts this request shape and returns
 * this response shape. See backend/scripts/example-agent-server.js for a
 * working reference implementation.
 *
 * Request sent to `listing.endpointUrl`:
 *   POST { taskId, title, description, acceptanceCriteria }
 *   Header: Authorization: <listing.authHeader>  (if set)
 *
 * Expected response (200 OK):
 *   { success: true, output: string, outputUrls?: string[] }
 *   or { success: false, error: string }
 */
export async function invokeAgent(
  listing: AgentListing,
  request: AgentInvocationRequest
): Promise<AgentInvocationResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), INVOCATION_TIMEOUT_MS);

    const res = await fetch(listing.endpointUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(listing.authHeader ? { Authorization: listing.authHeader } : {}),
      },
      body: JSON.stringify(request),
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { success: false, output: '', error: `Agent endpoint returned HTTP ${res.status}` };
    }

    const data = await res.json();
    if (typeof data.output !== 'string') {
      return { success: false, output: '', error: 'Agent response was missing a string "output" field' };
    }

    return { success: data.success !== false, output: data.output, outputUrls: data.outputUrls };
  } catch (err: any) {
    const message = err?.name === 'AbortError' ? 'Agent did not respond in time' : (err?.message || 'Agent invocation failed');
    return { success: false, output: '', error: message };
  }
}
