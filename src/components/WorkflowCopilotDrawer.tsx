import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  X,
  Wand2,
  ShieldCheck,
  ShieldAlert,
  Lightbulb,
  MessageSquare,
  ArrowRight,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Zap,
  Layers,
  ChevronRight,
  Flame,
  Check,
  Send,
  Sliders,
  Compass,
} from "lucide-react";
import { Workflow, WorkflowNode, WorkflowEdge, NodeType } from "../types";
import { WorkflowPreviewThumbnail } from "./WorkflowPreviewThumbnail";
import { NODE_DEFINITIONS } from "../data/nodeDefinitions";

interface WorkflowCopilotDrawerProps {
  isOpen: boolean;
  currentWorkflow: Workflow;
  selectedNodeId: string | null;
  onClose: () => void;
  onApplyWorkflow: (workflow: Workflow) => void;
  onAddNodeAndConnect: (nodeType: NodeType, sourceNodeId?: string, config?: Record<string, any>) => void;
  onUpdateWorkflow: (updater: (prev: Workflow) => Workflow) => void;
  onSelectNode: (nodeId: string | null) => void;
}

type CopilotTab = "generate" | "audit" | "suggestions" | "chat";

const PROMPT_PRESETS = [
  {
    title: "DO-178C DAL-A Letový Výškoměr",
    prompt: "Vytvoř bezpečný pipeline pro DO-178C Level A: Webhook přijme telemetrii výšky, SPARK Agent vygeneruje modul pro filtraci dat s pevnou řádovou čárkou a nulovou heap alokací, gnatprove ověří VC na Level 4 a výsledek odešli na Discord a do REST API.",
    standard: "DO-178C Level A",
  },
  {
    title: "ISO 26262 ASIL-D CAN-Bus Telemetrie",
    prompt: "Automotive ASIL-D pipeline: CAN-bus trigger přijímá pakety, SPARK Agent navrhne bezpečný kruhový buffer pro 256 zpráv bez možnosti přetečení, gnatprove provede důkaz invariancí a v případě selhání odešli nouzový alert na Slack.",
    standard: "ISO 26262 ASIL-D",
  },
  {
    title: "IEC 62304 Medical Infuzní Monitor",
    prompt: "Lékařský monitor infuze třídy C: Snímání senzorů tlaku, SPARK modul pro hlídání maximální dávky s Pre/Post kontrakty a okamžitým Stop signálem při překročení limitů.",
    standard: "IEC 62304 Class C",
  },
  {
    title: "GitHub PR → SPARK Agent → gnatprove Gate",
    prompt: "Automatický CI/CD audit: GitHub Webhook při otevření Issue vygeneruje Ada balíček, ověří 10 SPARK pravidel, a pokud audit projde, vytvoří Pull Request s novým kódem.",
    standard: "SPARK Gold",
  },
  {
    title: "Periodický No-Heap Cron Auditor",
    prompt: "Cron každých 6 hodin zkontroluje repozitář na zakázaná slova (new, raise, access, goto) a pošle souhrnný report do #ada-safety-channel na Slacku.",
    standard: "MISRA Ada / SPARK",
  },
];

interface ChatMessage {
  id: string;
  sender: "user" | "copilot";
  text: string;
  timestamp: string;
  action?: {
    type: "add_node" | "connect" | "apply_workflow";
    payload: any;
  };
}

export const WorkflowCopilotDrawer: React.FC<WorkflowCopilotDrawerProps> = ({
  isOpen,
  currentWorkflow,
  selectedNodeId,
  onClose,
  onApplyWorkflow,
  onAddNodeAndConnect,
  onUpdateWorkflow,
  onSelectNode,
}) => {
  const [activeTab, setActiveTab] = useState<CopilotTab>("generate");

  // Generator state
  const [genPrompt, setGenPrompt] = useState("");
  const [genSafetyStandard, setGenSafetyStandard] = useState("DO-178C Level A");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedWorkflow, setGeneratedWorkflow] = useState<Workflow | null>(null);
  const [genExplanation, setGenExplanation] = useState("");

  // Audit state
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<any | null>(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "m_welcome",
      sender: "copilot",
      text: "Ahoj! Jsem tvůj SPARK Copilot. Pomohu ti sestavit certifikovatelné Ada/SPARK 2022 workflow, optimalizovat gnatprove verifikační brány a nastavit bezpečné integrace. Co dnes stavíme?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (activeTab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeTab]);

  // Load contextual suggestions when tab changes or selection changes
  useEffect(() => {
    if (isOpen && activeTab === "suggestions") {
      loadSuggestions();
    }
  }, [isOpen, activeTab, selectedNodeId, currentWorkflow.nodes.length]);

  const loadSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const res = await fetch("/api/workflow/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "suggest_next",
          currentWorkflow,
          selectedNodeId,
        }),
      });
      const data = await res.json();
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
      } else {
        // Fallback smart suggestions
        generateFallbackSuggestions();
      }
    } catch (e) {
      generateFallbackSuggestions();
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const generateFallbackSuggestions = () => {
    const selected = currentWorkflow.nodes.find((n) => n.id === selectedNodeId) || currentWorkflow.nodes[currentWorkflow.nodes.length - 1];
    const fallbackList = [];

    if (!selected || selected.type.startsWith("trigger_")) {
      fallbackList.push({
        nodeType: "spark_agent",
        label: "SPARK Ada Agent",
        category: "spark_ai",
        icon: "Cpu",
        reason: "Zpracování vstupního požadavku a generování Ada kódu s kontrakty",
        benefit: "Automaticky aplikuje pravidla gnatprove a ranged typy",
        recommendedConfig: { model: "gemini-3.7-flash", temperature: 0.2 },
      });
    }

    if (selected?.type === "spark_agent") {
      fallbackList.push({
        nodeType: "spark_verifier",
        label: "gnatprove Verifier",
        category: "spark_ai",
        icon: "ShieldCheck",
        reason: "Statická a formální verifikace generovaného Ada kódu",
        benefit: "Garantuje 100% absenci runtime chyb a platnost Pre/Post kontraktů",
        recommendedConfig: { proofLevel: 4, strictSubtypes: true },
      });
    }

    if (selected?.type === "spark_verifier") {
      fallbackList.push({
        nodeType: "condition_filter",
        label: "Audit Pass Filter",
        category: "logic",
        icon: "GitBranch",
        reason: "Větvení toku podle výsledku verifikace (True = Pass, False = Fail)",
        benefit: "Zabrání nasazení neověřeného kódu do produkce",
        recommendedConfig: { condition: "verification.overallPassed == true" },
      });
    }

    fallbackList.push({
      nodeType: "discord_webhook",
      label: "Discord Alert",
      category: "integration",
      icon: "MessageSquare",
      reason: "Odeslání auditního záznamu a kódu do týmového kanálu",
      benefit: "Okamžitý přehled pro vývojový a certifikační tým",
      recommendedConfig: { channel: "#spark-ci-alerts" },
    });

    fallbackList.push({
      nodeType: "github_action",
      label: "GitHub Commit / PR",
      category: "integration",
      icon: "GitPullRequest",
      reason: "Automatické uložení verifikovaného Ada balíčku do repozitáře",
      benefit: "Plná integrace do CI/CD pipeline",
      recommendedConfig: { createPR: true, branch: "spark-modules" },
    });

    setSuggestions(fallbackList.slice(0, 3));
  };

  // Run Workflow Generator
  const handleGenerateWorkflow = async () => {
    if (!genPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/workflow/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "generate",
          prompt: genPrompt,
          safetyStandard: genSafetyStandard,
        }),
      });
      const data = await res.json();
      if (data.workflow) {
        setGeneratedWorkflow(data.workflow);
        setGenExplanation(data.explanation || "");
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Run Safety Audit
  const handleRunAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await fetch("/api/workflow/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "audit",
          currentWorkflow,
        }),
      });
      const data = await res.json();
      if (data.audit) {
        setAuditResult(data.audit);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAuditing(false);
    }
  };

  // Auto-Fix an audit finding
  const handleApplyAutoFix = (finding: any) => {
    const action = finding.autoFixAction;
    if (!action) return;

    if (action.actionType === "add_node") {
      const nodeType = action.nodeType as NodeType;
      const targetId = action.targetNodeId || currentWorkflow.nodes[currentWorkflow.nodes.length - 1]?.id;
      onAddNodeAndConnect(nodeType, targetId, action.configPatch);
    }

    // Remove finding from list or recalculate score
    setAuditResult((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        findings: prev.findings.filter((f: any) => f.id !== finding.id),
        safetyScore: Math.min(100, (prev.safetyScore || 70) + 10),
      };
    });
  };

  // Send Chat message
  const handleSendChat = async () => {
    if (!chatInput.trim() || isSendingChat) return;

    const userText = chatInput.trim();
    const newMsg: ChatMessage = {
      id: "msg_" + Date.now(),
      sender: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput("");
    setIsSendingChat(true);

    try {
      const res = await fetch("/api/workflow/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          prompt: userText,
          currentWorkflow,
          selectedNodeId,
        }),
      });
      const data = await res.json();
      const replyText = data.reply || "Omlouvám se, nepodařilo se mi zpracovat dotaz.";

      // Parse structured actions like [ACTION:ADD_NODE:{...}]
      let parsedAction: any = undefined;
      let cleanText = replyText;

      const actionMatch = replyText.match(/\[ACTION:(ADD_NODE|CONNECT|APPLY_WORKFLOW):([\s\S]*?)\]/);
      if (actionMatch) {
        try {
          const actionType = actionMatch[1].toLowerCase();
          const actionPayload = JSON.parse(actionMatch[2]);
          parsedAction = { type: actionType, payload: actionPayload };
          cleanText = replyText.replace(actionMatch[0], "").trim();
        } catch (e) {
          // ignore parse error
        }
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: "msg_copilot_" + Date.now(),
          sender: "copilot",
          text: cleanText,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          action: parsedAction,
        },
      ]);
    } catch (e: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: "msg_err_" + Date.now(),
          sender: "copilot",
          text: "Chyba při komunikaci se serverem: " + (e.message || "Unknown error"),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleExecuteChatAction = (action: ChatMessage["action"]) => {
    if (!action) return;
    if (action.type === "add_node") {
      const { type, label, category, config } = action.payload;
      const targetId = selectedNodeId || currentWorkflow.nodes[currentWorkflow.nodes.length - 1]?.id;
      onAddNodeAndConnect(type as NodeType, targetId, config);
    } else if (action.type === "apply_workflow") {
      onApplyWorkflow(action.payload);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl flex flex-col bg-[#0A0A0A] border-l border-[#1F1F1F] shadow-2xl overflow-hidden select-none">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1A1A1A] bg-[#070707]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#F27D26]/20 to-[#E06A14]/10 text-[#F27D26] border border-[#F27D26]/30 shadow-md shadow-[#F27D26]/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#F27D26] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#EDEDED] tracking-tight">SPARK AI Copilot</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] font-mono font-bold border border-[#10B981]/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
                  Gemini 3.7 Flash
                </span>
              </div>
              <p className="text-xs text-[#71717A] mt-0.5">
                Inteligentní asistent pro stavbu a formální verifikaci SPARK pipeline
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#71717A] hover:text-[#EDEDED] hover:bg-[#1A1A1A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-[#1A1A1A] bg-[#0D0D0D] px-4 py-1.5 gap-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("generate")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "generate"
                ? "bg-[#F27D26] text-[#050505] shadow-md shadow-[#F27D26]/20 font-bold"
                : "text-[#A1A1AA] hover:text-white hover:bg-[#141414]"
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Generátor</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("audit");
              if (!auditResult) handleRunAudit();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "audit"
                ? "bg-[#F27D26] text-[#050505] shadow-md shadow-[#F27D26]/20 font-bold"
                : "text-[#A1A1AA] hover:text-white hover:bg-[#141414]"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Audit Bezpečnosti</span>
          </button>

          <button
            onClick={() => setActiveTab("suggestions")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "suggestions"
                ? "bg-[#F27D26] text-[#050505] shadow-md shadow-[#F27D26]/20 font-bold"
                : "text-[#A1A1AA] hover:text-white hover:bg-[#141414]"
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Co přidat dál?</span>
          </button>

          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "chat"
                ? "bg-[#F27D26] text-[#050505] shadow-md shadow-[#F27D26]/20 font-bold"
                : "text-[#A1A1AA] hover:text-white hover:bg-[#141414]"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat Copilot</span>
          </button>
        </div>

        {/* Tab 1: Text-to-Workflow Generator */}
        {activeTab === "generate" && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#060606]">
            {/* Presets Grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                  Rychlé Šablony Požadavků
                </span>
                <span className="text-[10px] text-[#52525B]">Kliknutím předvyplníte</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PROMPT_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setGenPrompt(preset.prompt);
                      setGenSafetyStandard(preset.standard);
                    }}
                    className="text-[11px] px-2.5 py-1.5 rounded-lg bg-[#121212] hover:bg-[#1C1C1C] border border-[#202020] hover:border-[#F27D26]/40 text-[#D4D4D8] hover:text-white transition-all text-left flex items-center gap-1.5"
                  >
                    <Flame className="w-3 h-3 text-[#F27D26]" />
                    <span>{preset.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Input Box */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#EDEDED]">Popište požadované workflow:</label>
                <select
                  value={genSafetyStandard}
                  onChange={(e) => setGenSafetyStandard(e.target.value)}
                  className="bg-[#121212] border border-[#222222] rounded-lg text-[11px] text-[#38BDF8] px-2 py-1 focus:outline-none focus:border-[#38BDF8]"
                >
                  <option value="DO-178C Level A">DO-178C Level A (Aviation)</option>
                  <option value="DO-178C Level B">DO-178C Level B (Aviation)</option>
                  <option value="ISO 26262 ASIL-D">ISO 26262 ASIL-D (Automotive)</option>
                  <option value="IEC 62304 Class C">IEC 62304 Class C (Medical)</option>
                  <option value="SPARK Gold">SPARK Gold (General High-Assurance)</option>
                </select>
              </div>

              <textarea
                value={genPrompt}
                onChange={(e) => setGenPrompt(e.target.value)}
                placeholder="Např: Vytvoř pipeline pro zpracování dat z pitotovy trubice, ověř v SPARKu s rozsahem 0..1200 km/h, aplikuj gnatprove Level 4 a v případě chyby pošli alert na Discord a do Alire balíčku..."
                rows={4}
                className="w-full p-3 bg-[#0D0D0D] border border-[#222222] focus:border-[#F27D26] rounded-xl text-xs text-[#EDEDED] placeholder:text-[#52525B] focus:outline-none leading-relaxed resize-none font-medium"
              />

              <button
                onClick={handleGenerateWorkflow}
                disabled={isGenerating || !genPrompt.trim()}
                className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
                  isGenerating || !genPrompt.trim()
                    ? "bg-[#171717] text-[#52525B] cursor-not-allowed border border-[#222]"
                    : "bg-gradient-to-r from-[#F27D26] to-[#E06A14] hover:from-[#FFA057] hover:to-[#F27D26] text-[#050505] shadow-[#F27D26]/20 active:scale-[0.98]"
                }`}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#050505]" />
                    <span>Gemini navrhuje DAG pipeline a VC kontrakty...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Vygenerovat Kompletní Workflow</span>
                  </>
                )}
              </button>
            </div>

            {/* Generated Workflow Preview Result */}
            {generatedWorkflow && (
              <div className="space-y-3 pt-4 border-t border-[#1A1A1A]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#EDEDED]">{generatedWorkflow.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#38BDF8]/15 text-[#38BDF8] font-mono">
                      {generatedWorkflow.safetyStandard}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#71717A] font-mono">
                    {generatedWorkflow.nodes.length} uzlů, {generatedWorkflow.edges.length} propojení
                  </span>
                </div>

                <p className="text-xs text-[#A1A1AA] leading-relaxed bg-[#0E0E0E] p-3 rounded-xl border border-[#1C1C1C]">
                  {genExplanation || generatedWorkflow.description}
                </p>

                {/* Interactive Vector Thumbnail */}
                <div className="p-2 rounded-xl bg-[#090909] border border-[#1F1F1F]">
                  <WorkflowPreviewThumbnail
                    workflow={generatedWorkflow}
                    height={180}
                    interactive={true}
                    animateFlow={true}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      onApplyWorkflow(generatedWorkflow);
                      onClose();
                    }}
                    className="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-[#F27D26] to-[#E06A14] hover:from-[#FFA057] hover:to-[#F27D26] text-[#050505] font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#F27D26]/20 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Nahrát do plátna</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Safety Audit & Compliance */}
        {activeTab === "audit" && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#060606]">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#EDEDED]">Audit Shody s DO-178C & SPARK</h4>
                <p className="text-[11px] text-[#71717A]">Statická analýza topologie grafu a verifikačních pravidel</p>
              </div>
              <button
                onClick={handleRunAudit}
                disabled={isAuditing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1C1C1C] text-xs font-medium text-[#EDEDED] border border-[#242424]"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#F27D26] ${isAuditing ? "animate-spin" : ""}`} />
                <span>Přeskenovat</span>
              </button>
            </div>

            {isAuditing ? (
              <div className="py-16 text-center space-y-3">
                <ShieldCheck className="w-10 h-10 mx-auto text-[#F27D26] animate-bounce" />
                <p className="text-xs font-medium text-[#A1A1AA]">Provádím hloubkovou kontrolu SPARK pravidel...</p>
              </div>
            ) : auditResult ? (
              <div className="space-y-4">
                {/* Score Gauge Card */}
                <div className="p-4 rounded-2xl bg-[#0D0D0D] border border-[#1F1F1F] flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">
                      Bezpečnostní Skóre Architektury
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-[#EDEDED]">{auditResult.safetyScore}%</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                          auditResult.overallVerdict === "PASS"
                            ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30"
                            : "bg-[#F27D26]/15 text-[#F27D26] border border-[#F27D26]/30"
                        }`}
                      >
                        {auditResult.overallVerdict || "VERIFIED"}
                      </span>
                    </div>
                    <p className="text-xs text-[#A1A1AA]">{auditResult.summary}</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-[#141414] border border-[#222] flex items-center justify-center text-[#F27D26] font-mono font-bold text-lg">
                    {auditResult.safetyScore >= 90 ? "A+" : auditResult.safetyScore >= 75 ? "B" : "C"}
                  </div>
                </div>

                {/* Findings List */}
                <div className="space-y-2.5">
                  <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                    Nalezené body ke zlepšení ({auditResult.findings?.length || 0})
                  </span>

                  {auditResult.findings?.map((finding: any) => (
                    <div
                      key={finding.id}
                      className="p-3.5 rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {finding.severity === "critical" ? (
                            <AlertTriangle className="w-4 h-4 text-[#EF4444] flex-shrink-0" />
                          ) : (
                            <ShieldAlert className="w-4 h-4 text-[#F59E0B] flex-shrink-0" />
                          )}
                          <span className="text-xs font-bold text-[#EDEDED]">{finding.title}</span>
                        </div>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase ${
                            finding.severity === "critical"
                              ? "bg-[#EF4444]/15 text-[#EF4444]"
                              : "bg-[#F59E0B]/15 text-[#F59E0B]"
                          }`}
                        >
                          {finding.severity}
                        </span>
                      </div>

                      <p className="text-[11px] text-[#A1A1AA] leading-relaxed">{finding.description}</p>

                      <div className="pt-2 border-t border-[#171717] flex items-center justify-between">
                        <span className="text-[10px] text-[#71717A] font-mono">Doporučení: {finding.suggestedFix}</span>
                        {finding.autoFixAction && (
                          <button
                            onClick={() => handleApplyAutoFix(finding)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F27D26]/15 hover:bg-[#F27D26]/25 text-[#F27D26] text-[11px] font-bold border border-[#F27D26]/30 transition-all"
                          >
                            <Zap className="w-3 h-3" />
                            <span>Opravit</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-[#71717A]">
                <button
                  onClick={handleRunAudit}
                  className="px-4 py-2 bg-[#F27D26] text-[#050505] font-bold text-xs rounded-xl shadow-lg"
                >
                  Spustit Audit Nyní
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Smart Next Node Recommendations */}
        {activeTab === "suggestions" && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#060606]">
            <div>
              <h4 className="text-xs font-bold text-[#EDEDED]">Chytrá Doporučení pro Stavbu</h4>
              <p className="text-[11px] text-[#71717A]">
                {selectedNodeId
                  ? `Doporučené uzly navazující na vybraný uzel (${currentWorkflow.nodes.find((n) => n.id === selectedNodeId)?.data.label})`
                  : "Doporučené uzly pro rozšíření současného workflow"}
              </p>
            </div>

            {isLoadingSuggestions ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 mx-auto text-[#F27D26] animate-spin" />
                <p className="text-xs text-[#A1A1AA]">Analyzuji topologii grafu...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.map((sug, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#0D0D0D] border border-[#1F1F1F] hover:border-[#F27D26]/40 transition-all space-y-3 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#141414] border border-[#262626] text-[#F27D26] flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[#EDEDED]">{sug.label}</span>
                          <span className="text-[10px] text-[#71717A] ml-2 font-mono">type: {sug.nodeType}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const targetId = selectedNodeId || currentWorkflow.nodes[currentWorkflow.nodes.length - 1]?.id;
                          onAddNodeAndConnect(sug.nodeType, targetId, sug.recommendedConfig);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F27D26] text-[#050505] font-bold text-xs shadow-md shadow-[#F27D26]/20 group-hover:scale-105 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Přidat a propojit</span>
                      </button>
                    </div>

                    <p className="text-xs text-[#A1A1AA] leading-relaxed">{sug.reason}</p>

                    {sug.benefit && (
                      <div className="flex items-center gap-1.5 text-[11px] text-[#10B981] font-mono bg-[#10B981]/5 px-2.5 py-1 rounded-md border border-[#10B981]/20">
                        <Check className="w-3 h-3 text-[#10B981]" />
                        <span>{sug.benefit}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Interactive Chat Copilot */}
        {activeTab === "chat" && (
          <div className="flex-1 flex flex-col bg-[#060606] overflow-hidden">
            {/* Chat History Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed space-y-2 ${
                      msg.sender === "user"
                        ? "bg-[#F27D26] text-[#050505] font-medium rounded-br-none"
                        : "bg-[#0F0F0F] text-[#EDEDED] border border-[#1F1F1F] rounded-bl-none shadow-md"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {/* Interactive Action Button embedded in message */}
                    {msg.action && (
                      <div className="pt-2 border-t border-[#222222]">
                        <button
                          onClick={() => handleExecuteChatAction(msg.action)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F27D26] text-[#050505] font-bold text-[11px] shadow-md shadow-[#F27D26]/20 transition-all hover:scale-105 active:scale-95"
                        >
                          <Sparkles className="w-3 h-3 fill-current" />
                          <span>Provést akci na plátně</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-[#52525B] mt-1 font-mono px-1">{msg.timestamp}</span>
                </div>
              ))}

              {isSendingChat && (
                <div className="flex items-center gap-2 text-xs text-[#71717A] bg-[#0F0F0F] border border-[#1A1A1A] p-2.5 rounded-2xl w-fit">
                  <Sparkles className="w-3.5 h-3.5 text-[#F27D26] animate-spin" />
                  <span>SPARK Copilot přemýšlí...</span>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-3 border-t border-[#1A1A1A] bg-[#090909]">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChat();
                    }
                  }}
                  placeholder="Zeptejte se na SPARK pravidla, kontrakty nebo navrhněte změnu..."
                  className="flex-1 px-3.5 py-2 bg-[#050505] border border-[#222222] focus:border-[#F27D26] rounded-xl text-xs text-[#EDEDED] placeholder:text-[#52525B] focus:outline-none"
                />
                <button
                  onClick={handleSendChat}
                  disabled={!chatInput.trim() || isSendingChat}
                  className="p-2.5 rounded-xl bg-[#F27D26] hover:bg-[#FFA057] disabled:bg-[#1C1C1C] text-[#050505] disabled:text-[#52525B] transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
