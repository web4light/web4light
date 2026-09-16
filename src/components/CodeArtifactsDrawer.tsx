import React, { useState } from "react";
import { motion } from "motion/react";
import JSZip from "jszip";
import {
  X,
  Copy,
  Check,
  Download,
  ShieldCheck,
  ShieldAlert,
  FileCode,
  Package,
  Play,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Terminal,
  Archive,
  Loader2,
  FolderArchive,
} from "lucide-react";
import { SparkGeneratedCode, VerificationResult } from "../types";

interface CodeArtifactsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  codeData: SparkGeneratedCode | null;
  onRunVerify?: (code: string) => Promise<VerificationResult | null>;
}

export const CodeArtifactsDrawer: React.FC<CodeArtifactsDrawerProps> = ({
  isOpen,
  onClose,
  codeData,
  onRunVerify,
}) => {
  const [activeTab, setActiveTab] = useState<"ads" | "adb" | "verifier" | "alire">("ads");
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [zipSuccess, setZipSuccess] = useState(false);
  const [localVerification, setLocalVerification] = useState<VerificationResult | null>(
    codeData?.verification || null
  );

  if (!isOpen) return null;

  const defaultAds = codeData?.adsCode || `-- pragma SPARK_Mode (On);
-- Zatím nebyl vygenerován žádný SPARK kód.
-- Spusťte workflow nebo uzel SPARK Ada Agent pro vygenerování.`;

  const defaultAdb = codeData?.adbCode || `-- pragma SPARK_Mode (On);
-- Tělo balíčku (.adb) se zobrazí po spuštění SPARK Agenta.`;

  // Dynamically extract Ada package name from the specification code
  const extractPackageName = (ads: string): string => {
    const match = ads.match(/package\s+(?:body\s+)?([a-zA-Z0-9_]+)\s+is/i);
    return match ? match[1] : "Message_Buffer";
  };

  const packageName = extractPackageName(defaultAds);
  const fileBaseName = packageName.toLowerCase();
  const gprProjectName = `${fileBaseName}_project`;

  const alireToml = `name = "${fileBaseName.replace(/_/g, "-")}"
description = "Formally verified Ada/SPARK safety-critical package (${packageName})"
version = "1.0.0"
authors = ["SPARK Automate Agent"]
maintainers = ["safety@aerospace.io"]
licenses = "Apache-2.0"

[build-switches]
"*".spark_mode = "on"
"*".gnatprove_mode = "all"
"*".contracts = "enabled"

[[depends-on]]
gnatprove = ">=2022.0.0"`;

  const gnatProject = `project ${gprProjectName} is
   for Source_Dirs use ("src");
   for Object_Dir use "obj";
   for Main use ();

   package Compiler is
      for Default_Switches ("Ada") use ("-gnat2022", "-gnatW8", "-gnata", "-gnatwa");
   end Compiler;

   package Prove is
      for Proof_Switches ("Ada") use ("--level=3", "--report=all", "--warnings=error");
   end Prove;
end ${gprProjectName};`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const adsBlob = new Blob([defaultAds], { type: "text/plain" });
    const adbBlob = new Blob([defaultAdb], { type: "text/plain" });

    // Download ads
    const adsLink = document.createElement("a");
    adsLink.href = URL.createObjectURL(adsBlob);
    adsLink.download = `${fileBaseName}.ads`;
    adsLink.click();

    // Download adb
    setTimeout(() => {
      const adbLink = document.createElement("a");
      adbLink.href = URL.createObjectURL(adbBlob);
      adbLink.download = `${fileBaseName}.adb`;
      adbLink.click();
    }, 200);
  };

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();

      // 1. Package sources in src/ directory (package spec and body)
      const srcFolder = zip.folder("src");
      srcFolder?.file(`${fileBaseName}.ads`, defaultAds);
      srcFolder?.file(`${fileBaseName}.adb`, defaultAdb);

      // 2. Compilation object directory
      const objFolder = zip.folder("obj");
      objFolder?.file(".gitkeep", "");

      // 3. GNAT Project definition file (.gpr)
      zip.file(`${gprProjectName}.gpr`, gnatProject);

      // 4. Alire package manifest (alire.toml)
      zip.file("alire.toml", alireToml);

      // 5. Git ignore for build and proof artifacts
      const gitignoreContent = `obj/
gnatprove/
*.ali
*.o
*.b~*
*.stderr
*.stdout
.alire/
`;
      zip.file(".gitignore", gitignoreContent);

      // 6. Comprehensive README with local GNAT integration instructions
      const readmeContent = `# ${packageName} - Ada / SPARK Safety-Critical Module

Tento balíček byl vygenerován v aplikaci **SPARK Automate - Workflow Studio** a je strukturován pro přímou integraci do lokálního GNAT / SPARK vývojového prostředí.

---

## 📁 Struktura projektu

\`\`\`
.
├── ${gprProjectName}.gpr    # GNAT Project soubor (pravidla pro gprbuild a gnatprove)
├── alire.toml              # Alire manifest pro moderní správu balíčků v Ada
├── README.md               # Návod k integraci a spuštění
├── .gitignore              # Ignorování build a proof artefaktů
├── src/                    # Zdrojové kódy balíčku
│   ├── ${fileBaseName}.ads # Specifikace balíčku (SPARK Mode On, ranged typy, Pre/Post kontrakty)
│   └── ${fileBaseName}.adb # Tělo balíčku (bez dynamické alokace, formálně ověřeno)
└── obj/                    # Adresář pro zkompilované objekty a audit
\`\`\`

---

## 🚀 Spuštění a integrace v lokálním GNAT prostředí

### 1. Moderní postup s Alire (Doporučeno)
Máte-li nainstalovaný [Alire](https://alire.ada.lang.uk/):

\`\`\`bash
# Sestavení projektu
alr build

# Spuštění formální verifikace SPARK (gnatprove) na úrovni 3 (všechny kontrakty a VC)
alr exec -- gnatprove -P ${gprProjectName}.gpr --level=3 --report=all
\`\`\`

### 2. Postup přes přímý GNAT toolchain (GPRbuild + gnatprove)
Máte-li lokální instalaci GNAT FSF nebo GNAT Pro:

\`\`\`bash
# Kompilace balíčku a syntaktická kontrola
gprbuild -P ${gprProjectName}.gpr

# Spuštění formálního důkazu pomocí SMT řešičů (CVC5, Z3, Alt-Ergo)
gnatprove -P ${gprProjectName}.gpr --level=3 --report=all --warnings=error
\`\`\`

### 3. Integrace do stávajícího GNAT projektu
1. Zkopírujte soubory \`src/${fileBaseName}.ads\` a \`src/${fileBaseName}.adb\` do zdrojového adresáře vašeho stávajícího projektu (např. \`src/\`).
2. V Ada zdrojovém kódu připojte balíček klauzulí:
   \`\`\`ada
   with ${packageName};
   use ${packageName}; -- volitelné
   \`\`\`
3. Ujistěte se, že váš projekt obsahuje přepínače \`-gnat2022\`, \`-gnatW8\` a \`-gnata\` (povolení assertů a runtime ověřování kontraktů).
`;
      zip.file("README.md", readmeContent);

      // 7. Verification audit report if available
      if (verificationToDisplay) {
        zip.file("verification_report.json", JSON.stringify(verificationToDisplay, null, 2));
      }

      // Generate .zip file blob
      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      // Trigger automatic browser download
      const url = URL.createObjectURL(zipBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = `${fileBaseName}_gnat_project.zip`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);

      setZipSuccess(true);
      setTimeout(() => setZipSuccess(false), 3500);
    } catch (err) {
      console.error("Chyba při generování GNAT .zip archivu:", err);
    } finally {
      setIsZipping(false);
    }
  };

  const handleManualVerify = async () => {
    if (!onRunVerify) return;
    setIsVerifying(true);
    const fullCode = `${defaultAds}\n\n${defaultAdb}`;
    const result = await onRunVerify(fullCode);
    if (result) {
      setLocalVerification(result);
    }
    setIsVerifying(false);
  };

  const verificationToDisplay = localVerification || codeData?.verification;

  return (
    <motion.div
      initial={{ x: 500, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 500, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-y-0 right-0 z-40 w-full max-w-2xl bg-[#0D0D0D] border-l border-[#1A1A1A] shadow-2xl flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A1A] bg-[#050505]/90">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#F27D26]/15 text-[#F27D26] border border-[#F27D26]/30">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#EDEDED] flex items-center gap-2">
              Ada / SPARK Code Artifacts
              {verificationToDisplay && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-mono flex items-center gap-1 ${
                    verificationToDisplay.overallPassed
                      ? "bg-[#00FF85]/15 text-[#00FF85] border border-[#00FF85]/30"
                      : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {verificationToDisplay.overallPassed ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" /> gnatprove PASSED
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3" /> Rules Violated
                    </>
                  )}
                </span>
              )}
            </h3>
            <p className="text-xs text-[#71717A]">Specifikace (.ads), tělo (.adb) a formální audit</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            title="Stáhnout kompletní strukturovaný GNAT projekt (.zip)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F27D26]/15 hover:bg-[#F27D26]/25 text-[#F27D26] hover:text-[#FFA057] transition-colors border border-[#F27D26]/30 text-xs font-semibold disabled:opacity-50"
          >
            {isZipping ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : zipSuccess ? (
              <Check className="w-3.5 h-3.5 text-[#00FF85]" />
            ) : (
              <Archive className="w-3.5 h-3.5" />
            )}
            <span>{zipSuccess ? "ZIP stažen" : "GNAT .ZIP"}</span>
          </button>
          <button
            onClick={handleDownload}
            title="Stáhnout samostatné Ada soubory (.ads + .adb)"
            className="p-2 rounded-lg bg-[#181818] hover:bg-[#222222] text-[#A1A1AA] hover:text-white transition-colors border border-[#222222]"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#71717A] hover:text-[#EDEDED] hover:bg-[#1A1A1A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between px-6 pt-3 border-b border-[#1A1A1A] bg-[#0A0A0A]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("ads")}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "ads"
                ? "border-[#F27D26] text-[#F27D26]"
                : "border-transparent text-[#71717A] hover:text-[#EDEDED]"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Specifikace (.ads)
          </button>
          <button
            onClick={() => setActiveTab("adb")}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "adb"
                ? "border-[#F27D26] text-[#F27D26]"
                : "border-transparent text-[#71717A] hover:text-[#EDEDED]"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Tělo modulu (.adb)
          </button>
          <button
            onClick={() => setActiveTab("verifier")}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "verifier"
                ? "border-[#F27D26] text-[#F27D26]"
                : "border-transparent text-[#71717A] hover:text-[#EDEDED]"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            gnatprove VC Audit
          </button>
          <button
            onClick={() => setActiveTab("alire")}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "alire"
                ? "border-[#F27D26] text-[#F27D26]"
                : "border-transparent text-[#71717A] hover:text-[#EDEDED]"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Alire Project
          </button>
        </div>

        {activeTab !== "verifier" && (
          <button
            onClick={() =>
              handleCopy(
                activeTab === "ads"
                  ? defaultAds
                  : activeTab === "adb"
                  ? defaultAdb
                  : `${alireToml}\n\n-- spark_module.gpr:\n${gnatProject}`
              )
            }
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[#181818] hover:bg-[#222222] text-[#A1A1AA] rounded-md transition-colors border border-[#222222]"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#00FF85]" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Zkopírováno" : "Kopírovat"}
          </button>
        )}
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#080808]">
        {activeTab === "ads" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#71717A]">
              <span>Formální specifikace balíčku s Pre/Post kontrakty a ranged subtypy</span>
              <span className="font-mono text-[#F27D26]">package spec</span>
            </div>
            <pre className="p-4 rounded-xl bg-[#050505] border border-[#1A1A1A] text-xs font-mono text-[#00FF85] whitespace-pre-wrap leading-relaxed overflow-x-auto selection:bg-[#00FF85]/30">
              {defaultAds}
            </pre>
          </div>
        )}

        {activeTab === "adb" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#71717A]">
              <span>Implementace těla balíčku bez dynamické alokace a bez výjimek</span>
              <span className="font-mono text-[#38BDF8]">package body</span>
            </div>
            <pre className="p-4 rounded-xl bg-[#050505] border border-[#1A1A1A] text-xs font-mono text-[#38BDF8] whitespace-pre-wrap leading-relaxed overflow-x-auto selection:bg-[#38BDF8]/30">
              {defaultAdb}
            </pre>
          </div>
        )}

        {activeTab === "verifier" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#050505] border border-[#1A1A1A]">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    verificationToDisplay?.overallPassed ? "bg-[#00FF85]/15 text-[#00FF85]" : "bg-rose-500/15 text-rose-400"
                  }`}
                >
                  {verificationToDisplay?.overallPassed ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#EDEDED]">
                    {verificationToDisplay?.overallPassed ? "Formální audit 100% úspěšný" : "Detekováno porušení pravidel SPARK"}
                  </h4>
                  <p className="text-xs text-[#71717A]">
                    Skóre formální verifikace:{" "}
                    <strong className="text-[#F27D26]">{verificationToDisplay?.score ?? 100}%</strong>
                  </p>
                </div>
              </div>

              {onRunVerify && (
                <button
                  onClick={handleManualVerify}
                  disabled={isVerifying}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-[#F27D26] hover:bg-[#FFA057] text-[#050505] rounded-lg transition-colors disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin" : ""}`} />
                  {isVerifying ? "Ověřuji..." : "Spustit Audit"}
                </button>
              )}
            </div>

            {/* Rules Breakdown */}
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-[#71717A] uppercase tracking-wider">
                Kontrola 10 Nepřekročitelných pravidel
              </h5>
              <div className="space-y-1.5">
                {verificationToDisplay?.rulesChecked?.map((rc) => (
                  <div
                    key={rc.rule}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#050505] border border-[#1A1A1A] text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          rc.passed ? "bg-[#00FF85]/15 text-[#00FF85]" : "bg-rose-500/15 text-rose-400"
                        }`}
                      >
                        {rc.passed ? "✓" : "✗"}
                      </span>
                      <span className="font-medium text-[#EDEDED]">{rc.title}</span>
                    </div>
                    <span className={`text-[11px] ${rc.passed ? "text-[#71717A]" : "text-rose-400 font-semibold"}`}>
                      {rc.details}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Verification Conditions (VCs) */}
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-[#71717A] uppercase tracking-wider">
                Verification Conditions (VCs / SMT Solvers)
              </h5>
              <div className="rounded-xl border border-[#1A1A1A] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#050505] text-[#71717A] border-b border-[#1A1A1A] font-mono">
                    <tr>
                      <th className="p-2.5">VC ID</th>
                      <th className="p-2.5">Formální podmínka</th>
                      <th className="p-2.5">Stav solveru</th>
                      <th className="p-2.5 text-right">Čas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A1A1A] bg-[#0A0A0A]">
                    {verificationToDisplay?.vcs?.map((vc) => (
                      <tr key={vc.id} className="hover:bg-[#141414] font-mono">
                        <td className="p-2.5 text-[#F27D26] font-semibold">{vc.id}</td>
                        <td className="p-2.5 text-[#D4D4D8]">{vc.check}</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded bg-[#00FF85]/15 text-[#00FF85] text-[11px] border border-[#00FF85]/30">
                            {vc.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-right text-[#71717A]">{vc.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "alire" && (
          <div className="space-y-4">
            {/* Structured Project ZIP Download Banner */}
            <div className="p-4 rounded-xl bg-[#0C0C0C] border border-[#1F1F1F] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-[#F27D26]/15 text-[#F27D26] border border-[#F27D26]/30">
                  <FolderArchive className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-[#EDEDED] flex items-center gap-1.5">
                    Strukturovaný lokální GNAT projekt (.zip)
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#00FF85]/15 text-[#00FF85] border border-[#00FF85]/30 font-mono">
                      ready to build
                    </span>
                  </h5>
                  <p className="text-[11px] text-[#71717A] mt-0.5">
                    Obsahuje <span className="text-[#F27D26] font-mono">src/{fileBaseName}.ads</span>, <span className="text-[#38BDF8] font-mono">{fileBaseName}.adb</span>, <span className="text-[#EDEDED] font-mono">{gprProjectName}.gpr</span>, <span className="text-[#EDEDED] font-mono">alire.toml</span> a podrobný návod <span className="text-[#EDEDED] font-mono">README.md</span>.
                  </p>
                </div>
              </div>
              <button
                onClick={handleDownloadZip}
                disabled={isZipping}
                className="shrink-0 px-3.5 py-2 bg-[#F27D26] hover:bg-[#FFA057] text-[#050505] font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-md shadow-[#F27D26]/20 disabled:opacity-60"
              >
                {isZipping ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : zipSuccess ? (
                  <Check className="w-3.5 h-3.5 text-[#050505]" />
                ) : (
                  <Archive className="w-3.5 h-3.5" />
                )}
                <span>{isZipping ? "Příprava .ZIP..." : zipSuccess ? "Staženo!" : "Stáhnout .ZIP projekt"}</span>
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs text-[#71717A] font-mono">alire.toml (Alire Package Definition)</span>
              <pre className="p-4 rounded-xl bg-[#050505] border border-[#1A1A1A] text-xs font-mono text-[#F27D26] whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {alireToml}
              </pre>
            </div>
            <div className="space-y-2">
              <span className="text-xs text-[#71717A] font-mono">{gprProjectName}.gpr (GNAT Project File)</span>
              <pre className="p-4 rounded-xl bg-[#050505] border border-[#1A1A1A] text-xs font-mono text-[#38BDF8] whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {gnatProject}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#1A1A1A] bg-[#050505] flex flex-col sm:flex-row items-center justify-between text-xs text-[#71717A] gap-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#F27D26] shrink-0" />
          <span className="text-[11px]">Kompatibilní s GNAT Community / Alire / gnatprove -gnatW8</span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleDownload}
            title="Stáhnout pouze samostatné soubory .ads a .adb"
            className="px-3 py-2 bg-[#181818] hover:bg-[#222222] text-[#A1A1AA] hover:text-[#EDEDED] font-medium rounded-lg transition-colors flex items-center gap-1.5 border border-[#222222]"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Samostatné</span> .ads + .adb
          </button>
          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            title="Stáhnout kompletní strukturovaný GNAT projekt se složkami src/, obj/, .gpr souborem a alire.toml"
            className="px-4 py-2 bg-gradient-to-r from-[#F27D26] to-[#E06A14] hover:from-[#FFA057] hover:to-[#F27D26] text-[#050505] font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-[#F27D26]/20 disabled:opacity-60"
          >
            {isZipping ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : zipSuccess ? (
              <Check className="w-4 h-4 text-[#050505]" />
            ) : (
              <Archive className="w-4 h-4" />
            )}
            <span>
              {isZipping
                ? "Vytvářím .ZIP..."
                : zipSuccess
                ? "Projekt .ZIP stažen!"
                : "Stáhnout GNAT Projekt (.zip)"}
            </span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
