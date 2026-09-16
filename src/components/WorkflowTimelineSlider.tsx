import React, { useState, useEffect, useRef } from "react";
import {
  History,
  ChevronLeft,
  ChevronRight,
  BookmarkPlus,
  RotateCcw,
  Clock,
  Trash2,
  Check,
  Sparkles,
  Layers,
  Eye,
  Calendar,
  X,
  Sliders,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { WorkflowSnapshot } from "../types";

interface WorkflowTimelineSliderProps {
  snapshots: WorkflowSnapshot[];
  currentIndex: number;
  isOpen: boolean;
  onSelectIndex: (index: number) => void;
  onCreateSnapshot: (label?: string) => void;
  onClearHistory: () => void;
  onDeleteSnapshot?: (snapshotId: string) => void;
  onClose: () => void;
}

export const WorkflowTimelineSlider: React.FC<WorkflowTimelineSliderProps> = ({
  snapshots,
  currentIndex,
  isOpen,
  onSelectIndex,
  onCreateSnapshot,
  onClearHistory,
  onDeleteSnapshot,
  onClose,
}) => {
  const [isListOpen, setIsListOpen] = useState(false);
  const [isCustomPromptOpen, setIsCustomPromptOpen] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);

  const total = snapshots.length;
  const currentSnapshot = snapshots[currentIndex] || snapshots[total - 1];
  const isLatest = currentIndex === total - 1;

  // Keyboard navigation for timeline slider: Left/Right arrows when timeline is active
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

      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        if (currentIndex > 0) onSelectIndex(currentIndex - 1);
      } else if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        if (currentIndex < total - 1) onSelectIndex(currentIndex + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, total, onSelectIndex]);

  if (!isOpen || total === 0) return null;

  const handleManualSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onCreateSnapshot(customLabel.trim() || undefined);
    setCustomLabel("");
    setIsCustomPromptOpen(false);
  };

  return (
    <>
      {/* Floating Bottom Timeline Bar */}
      <div
        className={`fixed bottom-14 left-1/2 -translate-x-1/2 z-30 transition-all duration-300 ${
          isMinimized ? "w-auto" : "w-[94%] max-w-4xl"
        }`}
      >
        <div className="bg-[#0D0D0D]/95 border border-[#262626] hover:border-[#383838] rounded-2xl shadow-2xl backdrop-blur-xl p-3 text-[#EDEDED] flex flex-col gap-2.5 transition-all">
          {/* Header Row: Title, Status Badge, Minimize & Close */}
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[#F27D26]/15 border border-[#F27D26]/30 text-[#F27D26]">
                <History className="w-4 h-4 animate-spin-slow" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                    Historie Workflow
                  </span>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1F1F1F] border border-[#2E2E2E] text-[#A1A1AA]">
                    v{currentIndex + 1} / {total}
                  </span>

                  {isLatest ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-[#3FB950] bg-[#3FB950]/10 border border-[#3FB950]/30 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3FB950] animate-ping" />
                      Aktuální stav
                    </span>
                  ) : (
                    <button
                      onClick={() => onSelectIndex(total - 1)}
                      title="Klikněte pro návrat k nejnovějšímu stavu workflow"
                      className="flex items-center gap-1 text-[10px] font-semibold text-[#F27D26] bg-[#F27D26]/15 hover:bg-[#F27D26]/25 border border-[#F27D26]/40 px-2 py-0.5 rounded-full transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Historický náhled (Vrátit se k nejnovější)</span>
                    </button>
                  )}
                </div>

                {!isMinimized && currentSnapshot && (
                  <p className="text-[11px] text-[#8E8E93] truncate max-w-md mt-0.5">
                    <span className="text-[#D4D4D8] font-medium">{currentSnapshot.label}</span>
                    <span className="mx-1.5 opacity-40">·</span>
                    <span className="font-mono">{currentSnapshot.timeFormatted}</span>
                    <span className="mx-1.5 opacity-40">·</span>
                    <span>{currentSnapshot.nodeCount} uzlů, {currentSnapshot.edgeCount} spojů</span>
                  </p>
                )}
              </div>
            </div>

            {/* Right Quick Actions */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsCustomPromptOpen(true)}
                title="Vytvořit pojmenovaný snímek aktuálního stavu"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1C1C1C] hover:bg-[#252525] border border-[#333333] hover:border-[#F27D26]/50 text-xs text-[#EDEDED] hover:text-[#F27D26] transition-all"
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-[#F27D26]" />
                <span className="hidden sm:inline">Uložit snímek</span>
              </button>

              <button
                onClick={() => setIsListOpen(true)}
                title="Zobrazit přehled všech uložených verzí v historii"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1C1C1C] hover:bg-[#252525] border border-[#333333] text-xs text-[#A1A1AA] hover:text-white transition-all"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Všechny verze</span>
              </button>

              <button
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Rozbalit panel historie" : "Zmenšit panel"}
                className="p-1.5 rounded-lg text-[#8E8E93] hover:text-white hover:bg-[#1C1C1C] transition-colors"
              >
                {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              <button
                onClick={onClose}
                title="Zavřít panel historie"
                className="p-1.5 rounded-lg text-[#8E8E93] hover:text-white hover:bg-[#1C1C1C] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Expanded Timeline Controls & Slider */}
          {!isMinimized && (
            <div className="flex items-center gap-3 px-1 pt-1 border-t border-[#1C1C1C]">
              {/* Step Back Button */}
              <button
                onClick={() => onSelectIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex <= 0}
                title="Starší verze [Alt + ←]"
                className="p-1.5 rounded-lg bg-[#181818] border border-[#2B2B2B] text-[#D4D4D8] hover:text-white hover:border-[#F27D26]/40 disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Interactive Timeline Range Slider */}
              <div className="flex-1 flex flex-col gap-1 relative group">
                <input
                  type="range"
                  min={0}
                  max={total - 1}
                  step={1}
                  value={currentIndex}
                  onChange={(e) => onSelectIndex(Number(e.target.value))}
                  className="w-full h-2 bg-[#1C1C1C] rounded-lg appearance-none cursor-pointer accent-[#F27D26] hover:bg-[#252525] transition-all focus:outline-none focus:ring-1 focus:ring-[#F27D26]"
                />

                {/* Ticks / Marker Dots for snapshots */}
                {total > 1 && total <= 30 && (
                  <div className="flex justify-between px-1 pointer-events-none -mt-0.5">
                    {snapshots.map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 h-1 rounded-full transition-all ${
                          i === currentIndex
                            ? "bg-[#F27D26] scale-150"
                            : i < currentIndex
                            ? "bg-[#444444]"
                            : "bg-[#222222]"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Step Forward Button */}
              <button
                onClick={() => onSelectIndex(Math.min(total - 1, currentIndex + 1))}
                disabled={currentIndex >= total - 1}
                title="Novější verze [Alt + →]"
                className="p-1.5 rounded-lg bg-[#181818] border border-[#2B2B2B] text-[#D4D4D8] hover:text-white hover:border-[#F27D26]/40 disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Quick Jump to Initial and Latest */}
              <div className="flex items-center gap-1 border-l border-[#222222] pl-2">
                <button
                  onClick={() => onSelectIndex(0)}
                  disabled={currentIndex === 0}
                  title="Přejít na první snímek (v1)"
                  className="px-2 py-1 rounded bg-[#161616] hover:bg-[#202020] text-[10px] font-mono text-[#8E8E93] hover:text-[#EDEDED] disabled:opacity-30 transition-colors"
                >
                  v1
                </button>
                <button
                  onClick={() => onSelectIndex(total - 1)}
                  disabled={currentIndex === total - 1}
                  title="Přejít na nejnovější snímek (Head)"
                  className="px-2 py-1 rounded bg-[#161616] hover:bg-[#202020] text-[10px] font-mono text-[#8E8E93] hover:text-[#F27D26] disabled:opacity-30 transition-colors"
                >
                  v{total}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Named Snapshot Creation */}
      {isCustomPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#121212] border border-[#282828] rounded-2xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#F27D26]/20 text-[#F27D26]">
                  <BookmarkPlus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Vytvořit snímek workflow</h3>
              </div>
              <button
                onClick={() => setIsCustomPromptOpen(false)}
                className="p-1 rounded-lg text-[#888888] hover:text-white hover:bg-[#202020]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualSave} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-[#A1A1AA] mb-1 block">
                  Název nebo poznámka ke snímku
                </label>
                <input
                  type="text"
                  autoFocus
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder={`např. Před refaktoringem, Verze pro audit, Kontrolní bod...`}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2E2E2E] focus:border-[#F27D26] rounded-xl text-xs text-white placeholder-[#555555] outline-none"
                />
              </div>

              <div className="text-[11px] text-[#71717A] bg-[#181818] p-2.5 rounded-xl border border-[#222222] flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#F27D26] flex-shrink-0" />
                <span>
                  Snímek zachytí kompletní stav všech uzlů, propojení a konfigurací do lokálního úložiště.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCustomPromptOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-[#A1A1AA] hover:bg-[#202020]"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#F27D26] hover:bg-[#FA8C38] text-xs font-bold text-black flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Uložit do historie</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Full History List / Version Browser */}
      {isListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#121212] border border-[#262626] rounded-2xl w-full max-w-2xl max-h-[80vh] shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#222222] bg-[#0E0E0E]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#F27D26]/15 text-[#F27D26]">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Přehled verzí workflow (Historie)</h3>
                  <p className="text-[11px] text-[#8E8E93]">
                    Celkem {total} {total === 1 ? "snímek" : total < 5 ? "snímky" : "snímků"} uložených v localStorage
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {total > 1 && (
                  <button
                    onClick={() => {
                      if (window.confirm("Opravdu chcete vymazat celou historii snímků kromě aktuální verze?")) {
                        onClearHistory();
                        setIsListOpen(false);
                      }
                    }}
                    title="Smazat starší snímky"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-400 hover:text-red-200 text-xs font-medium transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Vyčistit</span>
                  </button>
                )}
                <button
                  onClick={() => setIsListOpen(false)}
                  className="p-1.5 rounded-xl text-[#8E8E93] hover:text-white hover:bg-[#202020]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Snapshot List Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {snapshots
                .map((snap, idx) => ({ snap, idx }))
                .reverse()
                .map(({ snap, idx }) => {
                  const isSelected = idx === currentIndex;
                  const isHead = idx === total - 1;

                  return (
                    <div
                      key={snap.id}
                      onClick={() => {
                        onSelectIndex(idx);
                        setIsListOpen(false);
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${
                        isSelected
                          ? "bg-[#F27D26]/15 border-[#F27D26]/60 shadow-lg shadow-[#F27D26]/5"
                          : "bg-[#161616] hover:bg-[#1F1F1F] border-[#262626] hover:border-[#383838]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs font-mono px-2 py-1 rounded-lg font-bold ${
                            isSelected
                              ? "bg-[#F27D26] text-black"
                              : "bg-[#222222] text-[#A1A1AA] group-hover:text-white"
                          }`}
                        >
                          v{idx + 1}
                        </span>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white group-hover:text-[#F27D26] transition-colors">
                              {snap.label}
                            </span>
                            {isHead && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-[#3FB950]/20 text-[#3FB950] border border-[#3FB950]/40">
                                Poslední změna
                              </span>
                            )}
                            {isSelected && !isHead && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/40">
                                Zobrazeno
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#71717A]">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3" />
                              {snap.timeFormatted}
                            </span>
                            <span>·</span>
                            <span>{snap.nodeCount} uzlů</span>
                            <span>·</span>
                            <span>{snap.edgeCount} spojů</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <span className="text-xs font-bold text-[#F27D26] flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            Aktivní
                          </span>
                        ) : (
                          <span className="text-xs text-[#71717A] group-hover:text-white transition-colors flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            Přepnout
                          </span>
                        )}
                        {onDeleteSnapshot && total > 1 && !isHead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSnapshot(snap.id);
                            }}
                            title="Odstranit tento snímek"
                            className="p-1 rounded text-[#555555] hover:text-red-400 hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[#0C0C0C] border-t border-[#222222] flex items-center justify-between text-xs text-[#71717A]">
              <span>Klávesové zkratky: Alt + ← / Alt + → pro procházení verzí</span>
              <button
                onClick={() => setIsListOpen(false)}
                className="px-3 py-1 rounded-lg bg-[#1C1C1C] hover:bg-[#252525] text-white"
              >
                Zavřít
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
