import dagre from "dagre";
import type { Node, Edge } from "@xyflow/react";
import type { Step } from "./queries";
import type { StepNodeData } from "../components/StepNode";

export type { StepNodeData } from "../components/StepNode";

const NODE_WIDTH = 200;
const NODE_HEIGHT = 70;

function getNamePrefix(name: string): string {
  const lastDash = name.lastIndexOf("-");
  return lastDash > 0 ? name.slice(0, lastDash) : name;
}

export function buildGraph(steps: Step[]): {
  nodes: Node[];
  edges: Edge[];
} {
  if (steps.length === 0) return { nodes: [], edges: [] };

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: "LR",
    nodesep: 40,
    ranksep: 80,
    marginx: 40,
    marginy: 40,
  });

  // Register nodes
  for (const step of steps) {
    dagreGraph.setNode(step.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  // Build edges: sequential by order, with fan-out detection
  const edges: Edge[] = [];
  const edgeSet = new Set<string>();

  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1];
    const curr = steps[i];
    const prevPrefix = getNamePrefix(prev.name);
    const currPrefix = getNamePrefix(curr.name);

    // Fan-out: current step has same prefix as previous — find common ancestor
    if (currPrefix === prevPrefix && i >= 2) {
      let ancestorIdx = i - 1;
      while (
        ancestorIdx > 0 &&
        getNamePrefix(steps[ancestorIdx].name) === currPrefix
      ) {
        ancestorIdx--;
      }
      const ancestor = steps[ancestorIdx];
      const edgeKey = `${ancestor.id}->${curr.id}`;
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        dagreGraph.setEdge(ancestor.id, curr.id);
        edges.push({
          id: edgeKey,
          source: ancestor.id,
          target: curr.id,
          animated: curr.status === "running",
          className: curr.status === "failed" ? "failed" : undefined,
          style: {
            stroke:
              curr.status === "failed"
                ? "var(--status-failed)"
                : curr.status === "running"
                ? "var(--status-running)"
                : "#27272a",
            strokeWidth: 1.5,
          },
        });
      }
    } else {
      // Sequential edge
      const edgeKey = `${prev.id}->${curr.id}`;
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        dagreGraph.setEdge(prev.id, curr.id);
        edges.push({
          id: edgeKey,
          source: prev.id,
          target: curr.id,
          animated: curr.status === "running",
          className: curr.status === "failed" ? "failed" : undefined,
          style: {
            stroke:
              curr.status === "failed"
                ? "var(--status-failed)"
                : curr.status === "running"
                ? "var(--status-running)"
                : "#27272a",
            strokeWidth: 1.5,
          },
        });
      }
    }
  }

  dagre.layout(dagreGraph);

  const nodes: Node[] = steps.map((step) => {
    const nodeWithPosition = dagreGraph.node(step.id);
    const data: StepNodeData = {
      label: step.name,
      status: step.status,
      duration_ms: step.duration_ms,
      attempt: step.attempt,
      input: step.input,
      output: step.output,
      error: step.error,
      stepId: step.id,
    };
    return {
      id: step.id,
      type: "step",
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
      data: data as Record<string, unknown>,
    };
  });

  return { nodes, edges };
}
