import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Zap,
  Sparkles,
  GitFork,
  Grid,
  Magnet,
  Check,
  History,
} from "lucide-react";
import { WorkflowNode, WorkflowEdge, NodeType } from "../types";
import { WorkflowNodeCard } from "./WorkflowNodeCard";

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  isRunning?: boolean;
  snapToGridEnabled?: boolean;
  isHistoryOpen?: boolean;
  historyCount?: number;
  onToggleHistory?: () => void;
  onToggleSnapToGrid?: () => void;
  onAutoArrange?: () => void;
  onSnapAllToGrid?: () => void;
  onSelectNode: (nodeId: string | null) => void;
  onUpdateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  onConnect: (source: string, target: string, sourcePort?: string, targetPort?: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onOpenConfig: (node: WorkflowNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onCloneNode: (node: WorkflowNode) => void;
  onRunSingleNode?: (node: WorkflowNode) => void;
  onOpenNodePalette: () => void;
  onOpenCopilot?: () => void;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  nodes,
  edges,
  selectedNodeId,
  isRunning,
  snapToGridEnabled = true,
  isHistoryOpen = false,
  historyCount,
  onToggleHistory,
  onToggleSnapToGrid,
  onAutoArrange,
  onSnapAllToGrid,
  onSelectNode,
  onUpdateNodePosition,
  onConnect,
  onDeleteEdge,
  onOpenConfig,
  onDeleteNode,
  onCloneNode,
  onRunSingleNode,
  onOpenNodePalette,
  onOpenCopilot,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 100, y: 80 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Quick temporary toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  // Dragging node state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Interactive connection state
  const [connectingSource, setConnectingSource] = useState<{
    nodeId: string;
    portId: string;
  } | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Fit View / Center all nodes within the canvas
  const fitView = () => {
    if (!containerRef.current || nodes.length === 0) {
      setPan({ x: 100, y: 80 });
      setZoom(1);
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
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

    const padding = 100;
    const totalW = Math.max(120, maxX - minX + padding * 2);
    const totalH = Math.max(120, maxY - minY + padding * 2);

    const scaleX = rect.width / totalW;
    const scaleY = rect.height / totalH;
    const targetZoom = Math.max(0.4, Math.min(1.15, Math.min(scaleX, scaleY)));

    const targetPanX = (rect.width - totalW * targetZoom) / 2 - (minX - padding) * targetZoom;
    const targetPanY = (rect.height - totalH * targetZoom) / 2 - (minY - padding) * targetZoom;

    setZoom(Number(targetZoom.toFixed(2)));
    setPan({ x: Math.round(targetPanX), y: Math.round(targetPanY) });
    showToast("Přizpůsobeno zobrazení");
  };

  // Keyboard shortcuts: Shift+A for Auto-Arrange, G for Snap to Grid, F for Fit View
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.shiftKey && (e.key === "A" || e.key === "a")) {
        e.preventDefault();
        onAutoArrange?.();
        showToast("✓ Graf hierarchicky uspořádán (Auto-Arrange)");
      } else if ((e.key === "g" || e.key === "G") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onToggleSnapToGrid?.();
        showToast(
          !snapToGridEnabled
            ? "✓ Přichytávání k mřížce zapnuto (20px)"
            : "Přichytávání k mřížce vypnuto (plynulé)"
        );
      } else if ((e.key === "f" || e.key === "F") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        fitView();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onAutoArrange, onToggleSnapToGrid, snapToGridEnabled, nodes]);

  // Handle Pan Mouse Events
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === "svg") {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      onSelectNode(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    } else if (draggingNodeId) {
      const newX = (e.clientX - pan.x) / zoom - dragOffset.x;
      const newY = (e.clientY - pan.y) / zoom - dragOffset.y;
      onUpdateNodePosition(draggingNodeId, {
        x: snapToGridEnabled ? Math.round(newX / 20) * 20 : Math.round(newX),
        y: snapToGridEnabled ? Math.round(newY / 20) * 20 : Math.round(newY),
      });
    }

    if (connectingSource) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setCursorPos({
          x: (e.clientX - rect.left - pan.x) / zoom,
          y: (e.clientY - rect.top - pan.y) / zoom,
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
    setConnectingSource(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.min(Math.max(0.4, prev * zoomFactor), 2));
  };

  const startNodeDrag = (nodeId: string, e: React.MouseEvent) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setDraggingNodeId(nodeId);
    setDragOffset({
      x: (e.clientX - pan.x) / zoom - node.position.x,
      y: (e.clientY - pan.y) / zoom - node.position.y,
    });
  };

  const handleStartConnection = (nodeId: string, portId: string) => {
    setConnectingSource({ nodeId, portId });
  };

  const handleEndConnection = (targetNodeId: string, targetPortId: string) => {
    if (connectingSource && connectingSource.nodeId !== targetNodeId) {
      onConnect(connectingSource.nodeId, targetNodeId, connectingSource.portId, targetPortId);
    }
    setConnectingSource(null);
  };

  // Node position helper for edge wires (standard 288px width, 120px approx height)
  const getNodeCenter = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return {
      outputX: node.position.x + 288,
      outputY: node.position.y + 60,
      inputX: node.position.x,
      inputY: node.position.y + 60,
    };
  };

  const resetView = () => {
    setPan({ x: 100, y: 80 });
    setZoom(1);
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className="relative flex-1 w-full h-full overflow-hidden bg-[#050505] cursor-crosshair select-none"
    >
      {/* Background Matrix / Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: `radial-gradient(#F27D26 1px, transparent 1px)`,
          backgroundSize: `${(snapToGridEnabled ? 20 : 24) * zoom}px ${(snapToGridEnabled ? 20 : 24) * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      {/* Floating Canvas Controls */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-1.5 p-1.5 rounded-xl bg-[#121212]/95 border border-[#222222] backdrop-blur-md shadow-2xl">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.15, 2))}
          title="Přiblížit (+)"
          className="p-2 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#1A1A1A] transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-mono text-[#A1A1AA] px-1 min-w-[42px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.15, 0.4))}
          title="Oddálit (-)"
          className="p-2 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#1A1A1A] transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={fitView}
          title="Přizpůsobit zobrazení všem uzlům (Fit View) [F]"
          className="p-2 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#1A1A1A] transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-[#262626] mx-0.5" />

        {/* Auto-Arrange (Hierarchical DAG Layout) */}
        <button
          onClick={() => {
            onAutoArrange?.();
            showToast("✓ Graf hierarchicky uspořádán (Auto-Arrange)");
          }}
          title="Automaticky uspořádat uzly podle propojení do hierarchického DAG grafu [Shift+A]"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#181818] hover:bg-[#222222] border border-[#2E2E2E] hover:border-[#F27D26]/50 text-xs font-semibold text-[#EDEDED] hover:text-[#F27D26] transition-all group"
        >
          <GitFork className="w-3.5 h-3.5 text-[#F27D26] group-hover:rotate-45 transition-transform" />
          <span className="hidden sm:inline">Uspořádat</span>
        </button>

        {/* Snap to Grid Toggle */}
        <button
          onClick={() => {
            onToggleSnapToGrid?.();
            showToast(
              !snapToGridEnabled
                ? "✓ Přichytávání k mřížce zapnuto (20px)"
                : "Přichytávání k mřížce vypnuto (plynulé)"
            );
          }}
          title={`Přichytávání k mřížce (Snap to Grid) [G]: ${snapToGridEnabled ? "Zapnuto (20px)" : "Vypnuto (volný posun)"}`}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
            snapToGridEnabled
              ? "bg-[#F27D26]/15 border-[#F27D26]/40 text-[#F27D26]"
              : "bg-[#181818] border-[#2E2E2E] text-[#71717A] hover:text-[#A1A1AA]"
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Mřížka</span>
          <span
            className={`text-[9px] font-mono px-1 py-0.5 rounded font-bold ${
              snapToGridEnabled
                ? "bg-[#F27D26]/20 text-[#F27D26]"
                : "bg-[#222222] text-[#71717A]"
            }`}
          >
            {snapToGridEnabled ? "20px" : "Vyp"}
          </span>
        </button>

        {/* Snap All Nodes to Grid quick action */}
        {onSnapAllToGrid && (
          <button
            onClick={() => {
              onSnapAllToGrid();
              showToast("✓ Všechny uzly zarovnány do mřížky 20px");
            }}
            title="Zarovnat všechny existující uzly do mřížky 20px"
            className="p-2 rounded-lg text-[#A1A1AA] hover:text-[#EDEDED] hover:bg-[#1A1A1A] transition-colors"
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>
        )}

        {onToggleHistory && (
          <>
            <div className="w-[1px] h-5 bg-[#262626] mx-0.5" />
            <button
              onClick={onToggleHistory}
              title="Časová osa historie verzí (Timeline Slider)"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                isHistoryOpen
                  ? "bg-[#F27D26]/15 border-[#F27D26]/40 text-[#F27D26]"
                  : "bg-[#181818] border-[#2E2E2E] text-[#A1A1AA] hover:text-white"
              }`}
            >
              <History className="w-3.5 h-3.5 text-[#F27D26]" />
              <span className="hidden md:inline">Historie</span>
              {historyCount !== undefined && historyCount > 0 && (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#222222] text-[#A1A1AA]">
                  v{historyCount}
                </span>
              )}
            </button>
          </>
        )}
      </div>

      {/* Toast notification banner */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 transform animate-in fade-in slide-in-from-top-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#121212]/95 border border-[#F27D26]/50 shadow-2xl backdrop-blur-md text-[#EDEDED] text-xs font-semibold">
            <Check className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Quick Floating Action Buttons */}
      <div className="absolute bottom-6 right-6 z-30 flex items-center gap-3">
        <button
          onClick={onOpenNodePalette}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F27D26] to-[#E06A14] hover:from-[#FFA057] hover:to-[#F27D26] text-[#050505] font-bold text-xs shadow-xl shadow-[#F27D26]/25 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Přidat Uzel
        </button>

        {onOpenCopilot && (
          <button
            onClick={onOpenCopilot}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#121212]/95 hover:bg-[#1A1A1A] border border-[#F27D26]/40 text-[#EDEDED] font-bold text-xs shadow-2xl backdrop-blur-md transition-all hover:scale-105 active:scale-95 group"
          >
            <Sparkles className="w-4 h-4 text-[#F27D26] animate-pulse group-hover:rotate-12 transition-transform" />
            <span>AI Copilot</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#F27D26]/20 text-[#F27D26] font-mono font-bold">
              Gemini
            </span>
          </button>
        )}
      </div>

      {/* Transformable Graph Surface */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
        className="absolute inset-0 pointer-events-auto"
      >
        {/* SVG Bezier Edges / Connection Cables */}
        <svg className="absolute inset-0 w-[5000px] h-[5000px] pointer-events-none z-10 overflow-visible">
          <defs>
            <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F27D26" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>
          </defs>

          {/* Rendered Workflow Edges */}
          {edges.map((edge) => {
            const sourcePos = getNodeCenter(edge.source);
            const targetPos = getNodeCenter(edge.target);

            const dx = Math.abs(targetPos.inputX - sourcePos.outputX) * 0.5;
            const pathData = `M ${sourcePos.outputX} ${sourcePos.outputY} C ${sourcePos.outputX + dx} ${
              sourcePos.outputY
            }, ${targetPos.inputX - dx} ${targetPos.inputY}, ${targetPos.inputX} ${targetPos.inputY}`;

            return (
              <g key={edge.id} className="pointer-events-auto group">
                {/* Background click target */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={14}
                  className="cursor-pointer"
                  onClick={() => onDeleteEdge(edge.id)}
                />
                {/* Visual cable */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="url(#edgeGradient)"
                  strokeWidth={2.5}
                  className="group-hover:stroke-rose-400 transition-colors"
                />
                {/* Animated data particle when running */}
                {isRunning && (
                  <circle r="4" fill="#F27D26" filter="url(#glow)">
                    <animateMotion path={pathData} dur="1.8s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}

          {/* Active Connection Cable (while dragging) */}
          {connectingSource && (
            <path
              d={`M ${getNodeCenter(connectingSource.nodeId).outputX} ${
                getNodeCenter(connectingSource.nodeId).outputY
              } C ${getNodeCenter(connectingSource.nodeId).outputX + 80} ${
                getNodeCenter(connectingSource.nodeId).outputY
              }, ${cursorPos.x - 80} ${cursorPos.y}, ${cursorPos.x} ${cursorPos.y}`}
              fill="none"
              stroke="#F27D26"
              strokeWidth={2.5}
              strokeDasharray="6,4"
              className="animate-pulse"
            />
          )}
        </svg>

        {/* Nodes Layer */}
        <div className="absolute inset-0 z-20">
          {nodes.map((node) => (
            <div
              key={node.id}
              onMouseDown={(e) => {
                e.stopPropagation();
                onSelectNode(node.id);
                startNodeDrag(node.id, e);
              }}
            >
              <WorkflowNodeCard
                node={node}
                isSelected={selectedNodeId === node.id}
                isDragging={draggingNodeId === node.id}
                onSelect={onSelectNode}
                onOpenConfig={onOpenConfig}
                onDelete={onDeleteNode}
                onClone={onCloneNode}
                onRunSingle={onRunSingleNode}
                onStartConnection={handleStartConnection}
                onEndConnection={handleEndConnection}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
