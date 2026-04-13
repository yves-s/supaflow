import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type NodeTypes,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import StepNode, { type StepNodeData } from "./StepNode";

const nodeTypes: NodeTypes = {
  step: StepNode as NodeTypes[string],
};

interface FlowGraphProps {
  nodes: Node[];
  edges: Edge[];
  onNodeClick: NodeMouseHandler;
}

export default function FlowGraph({ nodes, edges, onNodeClick }: FlowGraphProps) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      nodesDraggable={false}
      nodesConnectable={false}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      proOptions={{ hideAttribution: true }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={24}
        size={1}
        color="var(--border-subtle)"
      />
      <Controls showInteractive={false} />
      <MiniMap
        nodeColor={(node) => {
          const data = node.data as StepNodeData;
          const map: Record<string, string> = {
            completed: "#10b981",
            failed: "#ef4444",
            running: "#f59e0b",
            pending: "#3f3f46",
          };
          return map[data?.status] ?? "#3f3f46";
        }}
        maskColor="rgba(10, 10, 11, 0.7)"
      />
    </ReactFlow>
  );
}
