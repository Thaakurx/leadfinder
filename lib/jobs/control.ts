// In-memory pause/cancel signaling for running search jobs, keyed by
// Search id. Cached on globalThis so it survives Next.js dev-mode module
// reloads. Only meaningful within a single long-running Node process (see
// the note in lib/jobs/discovery.ts about serverless deployments).
export type JobControlState = "running" | "paused" | "cancelled";

const globalForControl = globalThis as unknown as {
  __jobControl?: Map<string, JobControlState>;
};
const controlMap = globalForControl.__jobControl ?? new Map<string, JobControlState>();
globalForControl.__jobControl = controlMap;

export function setJobControl(searchId: string, state: JobControlState) {
  controlMap.set(searchId, state);
}

export function getJobControl(searchId: string): JobControlState {
  return controlMap.get(searchId) ?? "running";
}

export function clearJobControl(searchId: string) {
  controlMap.delete(searchId);
}

/** Blocks while paused; resolves once running again or cancelled. */
export async function waitWhilePaused(
  searchId: string,
  pollMs = 500
): Promise<"continue" | "cancelled"> {
  while (getJobControl(searchId) === "paused") {
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return getJobControl(searchId) === "cancelled" ? "cancelled" : "continue";
}
