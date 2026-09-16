import { WorkflowNode, WorkflowEdge } from "../types";

export interface LayoutOptions {
  horizontalGap?: number;
  verticalGap?: number;
  nodeWidth?: number;
  nodeHeight?: number;
  startX?: number;
  startY?: number;
  gridSize?: number;
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  horizontalGap: 92, // 288 + 92 = 380px column step
  verticalGap: 50,   // ~150 + 50 = 200px row step
  nodeWidth: 288,
  nodeHeight: 150,
  startX: 80,
  startY: 120,
  gridSize: 20,
};

/**
 * Snaps a number to the nearest grid step.
 */
export function snapToGrid(value: number, gridSize = 20): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Snaps all nodes in the workflow to the nearest grid coordinates.
 */
export function snapAllNodesToGrid(
  nodes: WorkflowNode[],
  gridSize = 20
): WorkflowNode[] {
  return nodes.map((node) => ({
    ...node,
    position: {
      x: snapToGrid(node.position.x, gridSize),
      y: snapToGrid(node.position.y, gridSize),
    },
  }));
}

/**
 * Calculates a clean, hierarchical Directed Acyclic Graph (DAG) layout for the workflow.
 * Ranks nodes into topological layers from left to right, sorts nodes within layers
 * using the barycenter heuristic to minimize wire crossings, centers columns vertically,
 * and snaps all positions to the grid.
 */
export function autoArrangeWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  userOptions?: LayoutOptions
): WorkflowNode[] {
  if (!nodes || nodes.length === 0) return [];
  if (nodes.length === 1) {
    return [
      {
        ...nodes[0],
        position: {
          x: snapToGrid(userOptions?.startX ?? DEFAULT_OPTIONS.startX),
          y: snapToGrid(userOptions?.startY ?? DEFAULT_OPTIONS.startY),
        },
      },
    ];
  }

  const opts = { ...DEFAULT_OPTIONS, ...userOptions };
  const colStep = opts.nodeWidth + opts.horizontalGap; // 380px
  const rowStep = opts.nodeHeight + opts.verticalGap;  // 200px

  const nodeMap = new Map<string, WorkflowNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  // Build adjacency graph
  const outEdges = new Map<string, string[]>();
  const inEdges = new Map<string, string[]>();
  const undirectedAdj = new Map<string, Set<string>>();

  nodes.forEach((n) => {
    outEdges.set(n.id, []);
    inEdges.set(n.id, []);
    undirectedAdj.set(n.id, new Set());
  });

  edges.forEach((e) => {
    if (nodeMap.has(e.source) && nodeMap.has(e.target)) {
      outEdges.get(e.source)!.push(e.target);
      inEdges.get(e.target)!.push(e.source);
      undirectedAdj.get(e.source)!.add(e.target);
      undirectedAdj.get(e.target)!.add(e.source);
    }
  });

  // 1. Group nodes into connected components
  const visited = new Set<string>();
  const components: string[][] = [];

  nodes.forEach((n) => {
    if (!visited.has(n.id)) {
      const comp: string[] = [];
      const queue = [n.id];
      visited.add(n.id);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        comp.push(curr);

        const neighbors = undirectedAdj.get(curr);
        if (neighbors) {
          neighbors.forEach((nbr) => {
            if (!visited.has(nbr)) {
              visited.add(nbr);
              queue.push(nbr);
            }
          });
        }
      }
      components.push(comp);
    }
  });

  // Sort components so triggers or larger components appear first
  components.sort((a, b) => {
    const aHasTrigger = a.some((id) => nodeMap.get(id)?.data?.category === "trigger");
    const bHasTrigger = b.some((id) => nodeMap.get(id)?.data?.category === "trigger");
    if (aHasTrigger && !bHasTrigger) return -1;
    if (!aHasTrigger && bHasTrigger) return 1;
    return b.length - a.length;
  });

  const updatedPositions = new Map<string, { x: number; y: number }>();
  let currentComponentStartY = opts.startY;

  // 2. Process each connected component
  components.forEach((compNodeIds) => {
    const compNodeSet = new Set(compNodeIds);

    // Isolated single node in component
    if (compNodeIds.length === 1) {
      const nodeId = compNodeIds[0];
      updatedPositions.set(nodeId, {
        x: snapToGrid(opts.startX, opts.gridSize),
        y: snapToGrid(currentComponentStartY, opts.gridSize),
      });
      currentComponentStartY += rowStep;
      return;
    }

    // Determine root nodes in this component (in-degree === 0 inside this component)
    let roots = compNodeIds.filter((id) => {
      const parents = (inEdges.get(id) || []).filter((p) => compNodeSet.has(p));
      return parents.length === 0;
    });

    // If there is a cycle and no root found, pick trigger nodes or node with lowest in-degree
    if (roots.length === 0) {
      const trigger = compNodeIds.find((id) => nodeMap.get(id)?.data?.category === "trigger");
      if (trigger) {
        roots = [trigger];
      } else {
        const sortedByInDegree = [...compNodeIds].sort(
          (a, b) => (inEdges.get(a)?.length || 0) - (inEdges.get(b)?.length || 0)
        );
        roots = [sortedByInDegree[0]];
      }
    }

    // Compute layer (rank) for each node using BFS with cycle detection
    const layers = new Map<string, number>();
    roots.forEach((r) => layers.set(r, 0));

    const queue = [...roots];
    const pathDepth = new Map<string, number>();
    roots.forEach((r) => pathDepth.set(r, 0));

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const currLayer = layers.get(curr) ?? 0;
      const children = (outEdges.get(curr) || []).filter((c) => compNodeSet.has(c));

      for (const child of children) {
        const newLayer = currLayer + 1;
        const existingLayer = layers.get(child);

        // Update layer if deeper path found, capped at component size to avoid infinite loops
        if (existingLayer === undefined || newLayer > existingLayer) {
          if (newLayer < compNodeIds.length) {
            layers.set(child, newLayer);
            queue.push(child);
          }
        }
      }
    }

    // Ensure all nodes in this component have a layer assigned
    compNodeIds.forEach((id) => {
      if (!layers.has(id)) {
        // Fallback layer based on parents or 0
        const parents = (inEdges.get(id) || []).filter((p) => layers.has(p));
        if (parents.length > 0) {
          const maxPLayer = Math.max(...parents.map((p) => layers.get(p)!));
          layers.set(id, maxPLayer + 1);
        } else {
          layers.set(id, 0);
        }
      }
    });

    // Group nodes by layer
    const maxLayer = Math.max(...Array.from(layers.values()));
    const layerBuckets: string[][] = Array.from({ length: maxLayer + 1 }, () => []);

    compNodeIds.forEach((id) => {
      const l = layers.get(id) ?? 0;
      layerBuckets[l].push(id);
    });

    // 3. Reorder nodes within each layer (Barycenter heuristic) to minimize edge crossings
    for (let l = 1; l <= maxLayer; l++) {
      const prevLayerNodes = layerBuckets[l - 1];
      const prevIndexMap = new Map<string, number>();
      prevLayerNodes.forEach((id, idx) => prevIndexMap.set(id, idx));

      layerBuckets[l].sort((a, b) => {
        const aParents = (inEdges.get(a) || []).filter((p) => prevIndexMap.has(p));
        const bParents = (inEdges.get(b) || []).filter((p) => prevIndexMap.has(p));

        const aAvg =
          aParents.length > 0
            ? aParents.reduce((sum, p) => sum + prevIndexMap.get(p)!, 0) / aParents.length
            : 999;
        const bAvg =
          bParents.length > 0
            ? bParents.reduce((sum, p) => sum + prevIndexMap.get(p)!, 0) / bParents.length
            : 999;

        return aAvg - bAvg;
      });
    }

    // Find the maximum number of nodes in any layer of this component to estimate height
    const maxNodesInLayer = Math.max(...layerBuckets.map((b) => b.length));
    const compTotalHeight = Math.max(1, maxNodesInLayer) * rowStep;
    const compCenterY = currentComponentStartY + compTotalHeight / 2;

    // 4. Assign positions with vertical centering per column
    layerBuckets.forEach((bucket, layerIndex) => {
      const colX = opts.startX + layerIndex * colStep;
      const bucketHeight = (bucket.length - 1) * rowStep;
      const bucketStartY = compCenterY - bucketHeight / 2;

      bucket.forEach((nodeId, rowIndex) => {
        const rawY = bucketStartY + rowIndex * rowStep;
        updatedPositions.set(nodeId, {
          x: snapToGrid(colX, opts.gridSize),
          y: snapToGrid(rawY, opts.gridSize),
        });
      });
    });

    // Move next component start Y down
    currentComponentStartY += compTotalHeight + opts.verticalGap * 2;
  });

  // Return new array with updated node positions
  return nodes.map((node) => {
    const newPos = updatedPositions.get(node.id);
    if (newPos) {
      return {
        ...node,
        position: newPos,
      };
    }
    return node;
  });
}

/**
 * Calculates bounding box of all nodes in a workflow.
 */
export function getWorkflowBoundingBox(nodes: WorkflowNode[], padding = 100) {
  if (!nodes || nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 1000, maxY: 600, width: 1000, height: 600 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach((n) => {
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + 288);
    maxY = Math.max(maxY, n.position.y + 160);
  });

  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}
