import { Workflow, WorkflowSnapshot } from "../types";

export const STORAGE_KEY_HISTORY = "spark_automate_workflow_history";
export const MAX_SNAPSHOTS = 50;

/**
 * Compare two workflows for significant functional or visual changes.
 */
export function areWorkflowsEqual(a: Workflow, b: Workflow): boolean {
  if (a.id !== b.id || a.name !== b.name) return false;
  if (a.nodes.length !== b.nodes.length || a.edges.length !== b.edges.length) return false;

  // Quick check on node positions & ids
  for (let i = 0; i < a.nodes.length; i++) {
    const na = a.nodes[i];
    const nb = b.nodes[i];
    if (
      na.id !== nb.id ||
      na.type !== nb.type ||
      na.position.x !== nb.position.x ||
      na.position.y !== nb.position.y ||
      na.data.label !== nb.data.label ||
      JSON.stringify(na.data.config) !== JSON.stringify(nb.data.config)
    ) {
      return false;
    }
  }

  // Quick check on edges
  for (let i = 0; i < a.edges.length; i++) {
    const ea = a.edges[i];
    const eb = b.edges[i];
    if (ea.source !== eb.source || ea.target !== eb.target) {
      return false;
    }
  }

  return true;
}

/**
 * Formats a timestamp into human-readable format (e.g. 14:05:22).
 */
export function formatTime(ts: number): string {
  const d = new Date(ts);
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  const secs = String(d.getSeconds()).padStart(2, "0");
  return `${hours}:${mins}:${secs}`;
}

/**
 * Creates a clean detached snapshot copy of a workflow.
 */
export function createSnapshot(workflow: Workflow, label?: string): WorkflowSnapshot {
  const now = Date.now();
  const clonedWf: Workflow = JSON.parse(JSON.stringify(workflow));

  return {
    id: `snap_${now}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: now,
    timeFormatted: formatTime(now),
    label: label || `Verze (${clonedWf.nodes.length} uzlů)`,
    workflow: clonedWf,
    nodeCount: clonedWf.nodes.length,
    edgeCount: clonedWf.edges.length,
  };
}

/**
 * Loads snapshots array from localStorage.
 */
export function loadSnapshotsFromStorage(): WorkflowSnapshot[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn("Failed to load workflow history from localStorage", err);
  }
  return [];
}

/**
 * Saves snapshots array to localStorage.
 */
export function saveSnapshotsToStorage(snapshots: WorkflowSnapshot[]): void {
  try {
    // Keep at most MAX_SNAPSHOTS
    const trimmed = snapshots.slice(-MAX_SNAPSHOTS);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn("Failed to save workflow history to localStorage", err);
  }
}
