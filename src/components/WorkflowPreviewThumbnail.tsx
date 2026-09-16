import React, { useState, useMemo } from "react";
import { Workflow, WorkflowNode, WorkflowEdge, NodeCategory } from "../types";
import { NodeIcon } from "./NodeIcon";
import { Cpu, ShieldCheck, Sparkles, Zap, ArrowRight, Play, Eye } from "lucide-react";

interface WorkflowPreviewThumbnailProps {
  workflow: Workflow;
  width?: string | number;
  height?: string | number;
  interactive?: boolean;
  animateFlow?: boolean;
  selectedNodeId?: string | null;
  onNodeClick?: (node: WorkflowNode) => void;
  className?: string;
  compact?: boolean;
}

const CATEGORY_COLORS: Record<NodeCategory, { border: string; bg: string; text: string; header: string }> = {
  trigger: {
    border: "#10B981",
    bg: "rgba(16, 185, 129, 0.12)",
    text: "#34D399",
    header: "#059669",
  },
  spark_ai: {
    border: "#F27D26",
    bg: "rgba(242, 125, 38, 0.15)",
    text: "#FFA057",
    header: "#E06A14",
  },
  integration: {
    border: "#38BDF8",
    bg: "rgba(56, 189, 248, 0.12)",
    text: "#7DD3FC",
    header: "#0284C7",
  },
  logic: {
    border: "#A855F7",
    bg: "rgba(168, 85, 247, 0.12)",
    text: "#C084FC",
    header: "#7E22CE",
  },
  output: {
    border: "#EC4899",
    bg: "rgba(236, 72, 153, 0.12)",
    text: "#F472B6",
    header: "#BE185D",
  },
};

export const WorkflowPreviewThumbnail: React.FC<WorkflowPreviewThumbnailProps> = ({
  workflow,
  width = "100%",
  height = 200,
  interactive = true,
  animateFlow = false,
  selectedNodeId,
  onNodeClick,
  className = "",
  compact = false,
}) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(animateFlow);

  const NODE_W = compact ? 190 : 220;
  const NODE_H = compact ? 64 : 76;

  // Calculate layout bounds and viewBox with automatic auto-fit
  const { viewBox, nodesWithCoords, minX, minY, widthBound, heightBound } = useMemo(() => {
    if (!workflow.nodes || workflow.nodes.length === 0) {
      return {
        viewBox: "0 0 600 240",
        nodesWithCoords: [],
        minX: 0,
        minY: 0,
        widthBound: 600,
        heightBound: 240,
      };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    workflow.nodes.forEach((n) => {
      if (n.position.x < minX) minX = n.position.x;
      if (n.position.x > maxX) maxX = n.position.x;
      if (n.position.y < minY) minY = n.position.y;
      if (n.position.y > maxY) maxY = n.position.y;
    });

    const padX = 60;
    const padY = 50;
    const actualWidth = maxX - minX + NODE_W;
    const actualHeight = maxY - minY + NODE_H;

    const vbX = minX - padX;
    const vbY = minY - padY;
    const vbW = Math.max(actualWidth + padX * 2, 450);
    const vbH = Math.max(actualHeight + padY * 2, 180);

    return {
      viewBox: `${vbX} ${vbY} ${vbW} ${vbH}`,
      nodesWithCoords: workflow.nodes,
      minX: vbX,
      minY: vbY,
      widthBound: vbW,
      heightBound: vbH,
    };
  }, [workflow, NODE_W, NODE_H]);

  // Map of nodes for fast lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, WorkflowNode>();
    workflow.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [workflow.nodes]);

  // Edges linked to hovered node
  const connectedEdgeIds = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>();
    const set = new Set<string>();
    workflow.edges.forEach((e) => {
      if (e.source === hoveredNodeId || e.target === hoveredNodeId) {
        set.add(e.id);
      }
    });
    return set;
  }, [hoveredNodeId, workflow.edges]);

  const hoveredNode = hoveredNodeId ? nodeMap.get(hoveredNodeId) : null;

  return (
    <div
      className={`relative group overflow-hidden rounded-xl bg-[#080808] border border-[#1C1C1C] flex flex-col justify-center items-center select-none ${className}`}
      style={{ width, height: typeof height === "number" ? `${height}px` : height }}
    >
      {/* Background Subtle Grid Pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`thumb-grid-${workflow.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#F27D26" opacity="0.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#thumb-grid-${workflow.id})`} />
      </svg>

      {/* SVG Canvas for Graph Visualization */}
      <svg
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full relative z-10"
      >
        <defs>
          {/* Gradients for Wires */}
          <linearGradient id={`edge-grad-${workflow.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F27D26" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.8" />
          </linearGradient>

          <linearGradient id={`edge-glow-${workflow.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFA057" />
            <stop offset="100%" stopColor="#7DD3FC" />
          </linearGradient>

          {/* Marker arrow */}
          <marker
            id={`arrowhead-${workflow.id}`}
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 6 3, 0 6" fill="#F27D26" opacity="0.8" />
          </marker>
        </defs>

        {/* 1. Draw Edges / Connector Bézier Wires */}
        <g className="edges-layer">
          {workflow.edges.map((edge) => {
            const src = nodeMap.get(edge.source);
            const tgt = nodeMap.get(edge.target);
            if (!src || !tgt) return null;

            const x1 = src.position.x + NODE_W;
            const y1 = src.position.y + NODE_H / 2;
            const x2 = tgt.position.x;
            const y2 = tgt.position.y + NODE_H / 2;

            const dx = Math.abs(x2 - x1);
            const curvature = Math.max(dx * 0.45, 40);
            const pathData = `M ${x1} ${y1} C ${x1 + curvature} ${y1}, ${x2 - curvature} ${y2}, ${x2} ${y2}`;

            const isConnected = connectedEdgeIds.has(edge.id);
            const isDimmed = hoveredNodeId && !isConnected;

            return (
              <g key={edge.id}>
                {/* Background thicker glow path on hover */}
                {isConnected && (
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#F27D26"
                    strokeWidth="6"
                    strokeOpacity="0.25"
                    strokeLinecap="round"
                  />
                )}

                {/* Base Wire Path */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={isConnected ? "#F27D26" : isDimmed ? "#262626" : "#3A3A3C"}
                  strokeWidth={isConnected ? 2.5 : 1.8}
                  strokeDasharray={edge.sourcePort === "false" ? "4 4" : undefined}
                  className="transition-colors duration-200"
                />

                {/* Flow Simulation Packets */}
                {(isSimulating || isConnected) && (
                  <circle r="3" fill={isConnected ? "#FFA057" : "#F27D26"}>
                    <animateMotion
                      path={pathData}
                      dur={isConnected ? "1.8s" : "2.8s"}
                      repeatCount="indefinite"
                      keyPoints="0;1"
                      keyTimes="0;1"
                      calcMode="linear"
                    />
                  </circle>
                )}
              </g>
            );
          })}
        </g>

        {/* 2. Draw Nodes */}
        <g className="nodes-layer">
          {workflow.nodes.map((node) => {
            const isHovered = hoveredNodeId === node.id;
            const isSelected = selectedNodeId === node.id;
            const isDimmed = hoveredNodeId && !isHovered && !connectedEdgeIds.size;
            const colors = CATEGORY_COLORS[node.data.category] || CATEGORY_COLORS.spark_ai;
            const isSparkAI = node.data.category === "spark_ai";

            return (
              <g
                key={node.id}
                transform={`translate(${node.position.x}, ${node.position.y})`}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => interactive && setHoveredNodeId(node.id)}
                onMouseLeave={() => interactive && setHoveredNodeId(null)}
                onClick={() => onNodeClick && onNodeClick(node)}
                opacity={isDimmed ? 0.45 : 1}
              >
                {/* Node Box Glow if Selected or Hovered */}
                {(isHovered || isSelected) && (
                  <rect
                    x="-4"
                    y="-4"
                    width={NODE_W + 8}
                    height={NODE_H + 8}
                    rx="12"
                    fill="none"
                    stroke={colors.border}
                    strokeWidth="2"
                    strokeOpacity="0.4"
                  />
                )}

                {/* Main Node Card Body */}
                <rect
                  x="0"
                  y="0"
                  width={NODE_W}
                  height={NODE_H}
                  rx="9"
                  fill="#0E0E0E"
                  stroke={isHovered || isSelected ? colors.border : "#242424"}
                  strokeWidth={isHovered || isSelected ? "1.8" : "1.2"}
                />

                {/* Top Category Accent Line */}
                <rect
                  x="0"
                  y="0"
                  width={NODE_W}
                  height="3.5"
                  rx="2"
                  fill={colors.border}
                />

                {/* Left Category Icon Container */}
                <rect
                  x="10"
                  y={compact ? "14" : "16"}
                  width={compact ? "32" : "38"}
                  height={compact ? "32" : "38"}
                  rx="7"
                  fill={colors.bg}
                  stroke={colors.border}
                  strokeWidth="0.8"
                  strokeOpacity="0.6"
                />

                {/* Icon Placeholder or Category Symbol */}
                <text
                  x={compact ? "26" : "29"}
                  y={compact ? "35" : "40"}
                  textAnchor="middle"
                  fill={colors.text}
                  fontSize={compact ? "11" : "13"}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {node.type.startsWith("spark") ? "SP" : node.type.startsWith("trigger") ? "IN" : "OP"}
                </text>

                {/* Node Title */}
                <text
                  x={compact ? "50" : "56"}
                  y={compact ? "28" : "34"}
                  fill="#F4F4F5"
                  fontSize={compact ? "11" : "12.5"}
                  fontWeight="600"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                >
                  {node.data.label.length > (compact ? 16 : 18)
                    ? node.data.label.substring(0, compact ? 15 : 17) + "…"
                    : node.data.label}
                </text>

                {/* Node Subtitle / Category / Status */}
                <text
                  x={compact ? "50" : "56"}
                  y={compact ? "46" : "54"}
                  fill="#A1A1AA"
                  fontSize={compact ? "9" : "10"}
                  fontFamily="ui-monospace, monospace"
                >
                  {node.data.category.toUpperCase()} • {node.type.replace(/_/g, " ")}
                </text>

                {/* Left Input Port Dot */}
                <circle
                  cx="0"
                  cy={NODE_H / 2}
                  r="4"
                  fill="#0E0E0E"
                  stroke={colors.border}
                  strokeWidth="1.5"
                />

                {/* Right Output Port Dot */}
                <circle
                  cx={NODE_W}
                  cy={NODE_H / 2}
                  r="4"
                  fill={colors.border}
                  stroke="#0E0E0E"
                  strokeWidth="1"
                />
              </g>
            );
          })}
        </g>
      </svg>

      {/* Floating Interactive Tooltip when hovering a node */}
      {interactive && hoveredNode && (
        <div
          className="absolute bottom-2 left-2 right-2 z-20 bg-[#121212]/95 border border-[#2B2B2B] backdrop-blur-md rounded-lg p-2 text-xs flex items-center justify-between shadow-2xl transition-all pointer-events-none"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px]"
              style={{
                backgroundColor: CATEGORY_COLORS[hoveredNode.data.category]?.bg || "#222",
                color: CATEGORY_COLORS[hoveredNode.data.category]?.text || "#FFF",
              }}
            >
              {hoveredNode.data.icon ? (
                <NodeIcon name={hoveredNode.data.icon} className="w-3.5 h-3.5" />
              ) : (
                "N"
              )}
            </div>
            <div className="truncate">
              <div className="font-semibold text-[#EDEDED] flex items-center gap-1.5">
                <span>{hoveredNode.data.label}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-[#1F1F1F] text-[#A1A1AA] font-mono">
                  {hoveredNode.type}
                </span>
              </div>
              <p className="text-[10px] text-[#A1A1AA] truncate">{hoveredNode.data.description}</p>
            </div>
          </div>

          <div className="text-[10px] text-[#F27D26] font-mono whitespace-nowrap pl-2">
            {hoveredNode.data.config?.packageName
              ? `Pkg: ${hoveredNode.data.config.packageName}`
              : hoveredNode.data.config?.proofLevel
              ? `Level: ${hoveredNode.data.config.proofLevel}`
              : hoveredNode.data.category}
          </div>
        </div>
      )}

      {/* Top Overlay Badge with Node & Edge Metrics */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 pointer-events-none">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#121212]/90 border border-[#222222] text-[#A1A1AA] font-mono flex items-center gap-1 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F27D26]" />
          {workflow.nodes.length} uzlů
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#121212]/90 border border-[#222222] text-[#A1A1AA] font-mono flex items-center gap-1 backdrop-blur-sm">
          <ArrowRight className="w-2.5 h-2.5 text-[#38BDF8]" />
          {workflow.edges.length} propojení
        </span>
      </div>

      {/* Flow Simulation Toggle Button on top right */}
      {interactive && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsSimulating(!isSimulating);
          }}
          title={isSimulating ? "Zastavit simulaci toku" : "Spustit animaci datového toku"}
          className={`absolute top-2 right-2 z-20 p-1.5 rounded-lg border text-xs transition-all backdrop-blur-sm ${
            isSimulating
              ? "bg-[#F27D26]/20 border-[#F27D26]/50 text-[#F27D26]"
              : "bg-[#121212]/80 border-[#222222] text-[#71717A] hover:text-[#EDEDED] hover:bg-[#1A1A1A]"
          }`}
        >
          <Play className={`w-3 h-3 ${isSimulating ? "fill-current" : ""}`} />
        </button>
      )}
    </div>
  );
};
