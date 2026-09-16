import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Search,
  Layers,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  ArrowRight,
  CheckCircle2,
  Play,
  Maximize2,
  FileCode,
  Tag,
  Plus,
  Compass,
  Zap,
} from "lucide-react";
import { Workflow, WorkflowNode } from "../types";
import { WORKFLOW_TEMPLATES } from "../data/templates";
import { WorkflowPreviewThumbnail } from "./WorkflowPreviewThumbnail";

interface WorkflowTemplatesModalProps {
  isOpen: boolean;
  currentWorkflowId: string;
  onClose: () => void;
  onSelectTemplate: (template: Workflow) => void;
  onNewWorkflow: () => void;
}

type CategoryFilter = "all" | "aviation" | "cicd" | "automotive" | "medical";

const CATEGORY_TABS: Array<{ id: CategoryFilter; label: string; icon: any; count?: number }> = [
  { id: "all", label: "Všechny Šablony", icon: Layers },
  { id: "aviation", label: "Aero & DO-178C", icon: ShieldCheck },
  { id: "cicd", label: "CI/CD & Verifikace", icon: Zap },
  { id: "automotive", label: "Automotive ASIL-D", icon: Cpu },
  { id: "medical", label: "Medical IEC 62304", icon: ShieldAlert },
];

export const WorkflowTemplatesModal: React.FC<WorkflowTemplatesModalProps> = ({
  isOpen,
  currentWorkflowId,
  onClose,
  onSelectTemplate,
  onNewWorkflow,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [inspectedTemplate, setInspectedTemplate] = useState<Workflow | null>(null);
  const [inspectedNode, setInspectedNode] = useState<WorkflowNode | null>(null);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return WORKFLOW_TEMPLATES.filter((tmpl) => {
      const matchCat =
        selectedCategory === "all" ||
        (selectedCategory === "aviation" && tmpl.category === "aviation") ||
        (selectedCategory === "cicd" && tmpl.category === "cicd") ||
        (selectedCategory === "automotive" && tmpl.category === "automotive") ||
        (selectedCategory === "medical" && tmpl.category === "medical");

      const matchSearch =
        !searchQuery.trim() ||
        tmpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tmpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tmpl.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        tmpl.safetyStandard?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000000]/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-[#0D0D0D] border border-[#1F1F1F] rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A1A] bg-[#070707]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#F27D26]/15 text-[#F27D26] border border-[#F27D26]/30 shadow-lg shadow-[#F27D26]/10">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#EDEDED] tracking-tight">
                    Knihovna Bezpečnostních Šablon
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F27D26]/15 text-[#F27D26] font-mono font-semibold border border-[#F27D26]/30">
                    Ada/SPARK 2022
                  </span>
                </div>
                <p className="text-xs text-[#71717A] mt-0.5">
                  Vyberte certifikovanou architekturu s formálními důkazy (gnatprove) a interaktivním náhledem grafu
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

          {/* Sub-header: Search and Category Tabs */}
          <div className="px-6 py-3.5 border-b border-[#1A1A1A] bg-[#0A0A0A] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {CATEGORY_TABS.map((tab) => {
                const Icon = tab.icon;
                const isSelected = selectedCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedCategory(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      isSelected
                        ? "bg-[#F27D26] text-[#050505] font-bold shadow-md shadow-[#F27D26]/20"
                        : "bg-[#121212] text-[#A1A1AA] hover:text-white border border-[#1E1E1E] hover:border-[#2A2A2A]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search Box */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Hledat šablony (PID, CAN, Discord, Level A)..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#050505] border border-[#1E1E1E] rounded-lg text-[#EDEDED] focus:outline-none focus:border-[#F27D26] text-xs font-medium placeholder:text-[#52525B]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Modal Body: Template Cards Grid */}
          <div className="flex-1 overflow-y-auto p-6 bg-[#060606] space-y-6">
            {filteredTemplates.length === 0 ? (
              <div className="py-16 text-center text-[#71717A] space-y-2">
                <Compass className="w-10 h-10 mx-auto text-[#3F3F46]" />
                <p className="text-sm font-medium">Nenalezena žádná šablona odpovídající hledání "{searchQuery}"</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                  className="text-xs text-[#F27D26] hover:underline"
                >
                  Zobrazit všechny šablony
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {filteredTemplates.map((template) => {
                  const isCurrent = currentWorkflowId === template.id;

                  return (
                    <div
                      key={template.id}
                      className={`flex flex-col rounded-2xl bg-[#0D0D0D] border transition-all overflow-hidden shadow-lg ${
                        isCurrent
                          ? "border-[#F27D26]/50 ring-1 ring-[#F27D26]/30 shadow-[#F27D26]/5"
                          : "border-[#1A1A1A] hover:border-[#2E2E2E]"
                      }`}
                    >
                      {/* Interactive Graph Thumbnail Header */}
                      <div className="relative p-2.5 bg-[#080808] border-b border-[#171717]">
                        <WorkflowPreviewThumbnail
                          workflow={template}
                          height={190}
                          interactive={true}
                          animateFlow={false}
                          onNodeClick={(node) => {
                            setInspectedTemplate(template);
                            setInspectedNode(node);
                          }}
                        />

                        {/* Top Right Safety Standard Badge */}
                        {template.safetyStandard && (
                          <div className="absolute top-4 right-4 z-20">
                            <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#0E0E0E]/90 text-[#38BDF8] border border-[#38BDF8]/40 font-mono font-semibold flex items-center gap-1 backdrop-blur-md shadow-md">
                              <ShieldCheck className="w-3 h-3 text-[#38BDF8]" />
                              {template.safetyStandard}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card Content & Metadata */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          {/* Title & Current Active Status */}
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="text-sm font-bold text-[#EDEDED] leading-snug tracking-tight">
                              {template.name}
                            </h4>
                            {isCurrent && (
                              <span className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] font-semibold border border-[#10B981]/30 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Aktivní
                              </span>
                            )}
                          </div>

                          {/* Description */}
                          <p className="text-xs text-[#A1A1AA] mt-2 leading-relaxed line-clamp-2">
                            {template.description}
                          </p>

                          {/* Tags */}
                          {template.tags && template.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {template.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] px-2 py-0.5 rounded-md bg-[#141414] text-[#71717A] border border-[#202020] font-mono flex items-center gap-1"
                                >
                                  <Tag className="w-2.5 h-2.5 text-[#52525B]" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Pipeline Node Breakdown & Actions */}
                        <div className="pt-3 border-t border-[#171717] flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs text-[#71717A] font-mono">
                            <span>{template.nodes.length} uzlů</span>
                            <span>•</span>
                            <span>{template.edges.length} propojení</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Inspect Graph Button */}
                            <button
                              onClick={() => {
                                setInspectedTemplate(template);
                                setInspectedNode(template.nodes[0] || null);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#A1A1AA] hover:text-[#EDEDED] bg-[#141414] hover:bg-[#1C1C1C] border border-[#222222] rounded-xl transition-all"
                            >
                              <Maximize2 className="w-3 h-3 text-[#F27D26]" />
                              <span>Náhled</span>
                            </button>

                            {/* Load Template Button */}
                            <button
                              onClick={() => {
                                onSelectTemplate(template);
                                onClose();
                              }}
                              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all shadow-md ${
                                isCurrent
                                  ? "bg-[#1A1A1A] text-[#EDEDED] border border-[#2E2E2E] hover:bg-[#222]"
                                  : "bg-gradient-to-r from-[#F27D26] to-[#E06A14] hover:from-[#FFA057] hover:to-[#F27D26] text-[#050505] shadow-[#F27D26]/20"
                              }`}
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>{isCurrent ? "Znovu načíst" : "Načíst šablonu"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-6 py-3.5 border-t border-[#1A1A1A] bg-[#070707] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onNewWorkflow();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#D4D4D8] hover:text-white bg-[#121212] hover:bg-[#1A1A1A] border border-[#202020] rounded-xl transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>Čisté workflow</span>
              </button>
            </div>

            <div className="text-xs text-[#71717A] flex items-center gap-2">
              <span>Vyberte šablonu pro přímé nahrání do plátna</span>
            </div>
          </div>
        </motion.div>

        {/* Detailed Graph Inspector Sub-Modal */}
        {inspectedTemplate && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-[#000000]/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-[#0D0D0D] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A1A] bg-[#080808]">
                <div>
                  <h4 className="text-base font-bold text-[#EDEDED] flex items-center gap-2">
                    <span>{inspectedTemplate.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#38BDF8]/15 text-[#38BDF8] font-mono">
                      {inspectedTemplate.safetyStandard || "Ada/SPARK"}
                    </span>
                  </h4>
                  <p className="text-xs text-[#71717A] mt-0.5">{inspectedTemplate.description}</p>
                </div>
                <button
                  onClick={() => setInspectedTemplate(null)}
                  className="p-2 rounded-lg text-[#71717A] hover:text-[#EDEDED] hover:bg-[#1A1A1A]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 bg-[#050505] flex-1 overflow-y-auto space-y-4">
                {/* Large Preview Canvas */}
                <div className="p-2 rounded-xl bg-[#080808] border border-[#1F1F1F]">
                  <WorkflowPreviewThumbnail
                    workflow={inspectedTemplate}
                    height={280}
                    interactive={true}
                    animateFlow={true}
                    selectedNodeId={inspectedNode?.id}
                    onNodeClick={(node) => setInspectedNode(node)}
                  />
                </div>

                {/* Node Flow Detail List */}
                <div>
                  <h5 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2.5">
                    Struktura pipeline uzlů ({inspectedTemplate.nodes.length} uzlů)
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {inspectedTemplate.nodes.map((n, idx) => {
                      const isSelected = inspectedNode?.id === n.id;
                      return (
                        <div
                          key={n.id}
                          onClick={() => setInspectedNode(n)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                            isSelected
                              ? "bg-[#141414] border-[#F27D26] text-[#EDEDED]"
                              : "bg-[#0A0A0A] border-[#1C1C1C] text-[#A1A1AA] hover:border-[#2E2E2E]"
                          }`}
                        >
                          <div className="w-6 h-6 rounded-lg bg-[#141414] border border-[#222] text-[#F27D26] font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-[#EDEDED] truncate">{n.data.label}</span>
                              <span className="text-[10px] font-mono text-[#71717A]">{n.data.category}</span>
                            </div>
                            <p className="text-[11px] text-[#71717A] mt-0.5 line-clamp-1">{n.data.description}</p>
                            {n.data.config?.packageName && (
                              <div className="mt-1 text-[10px] text-[#F27D26] font-mono">
                                Pkg: {n.data.config.packageName}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Inspector Actions */}
              <div className="px-6 py-4 border-t border-[#1A1A1A] bg-[#080808] flex items-center justify-between">
                <button
                  onClick={() => setInspectedTemplate(null)}
                  className="px-4 py-2 text-xs font-medium text-[#A1A1AA] hover:text-white"
                >
                  Zavřít náhled
                </button>

                <button
                  onClick={() => {
                    onSelectTemplate(inspectedTemplate);
                    setInspectedTemplate(null);
                    onClose();
                  }}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-[#050505] bg-gradient-to-r from-[#F27D26] to-[#E06A14] hover:from-[#FFA057] hover:to-[#F27D26] rounded-xl shadow-lg shadow-[#F27D26]/20 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Načíst tuto šablonu do plátna</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
