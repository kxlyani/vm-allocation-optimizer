import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import DecisionTreeVisualizer from "./DecisionTreeVisualizer";

const RESOURCE_FIELDS = [
  { key: "cpu", label: "CPU", usedKey: "used_cpu", totalKey: "total_cpu", utilKey: "cpu_utilization_pct" },
  { key: "ram", label: "RAM", usedKey: "used_ram", totalKey: "total_ram", utilKey: "ram_utilization_pct" },
  { key: "storage", label: "Storage", usedKey: "used_storage", totalKey: "total_storage", utilKey: "storage_utilization_pct" },
  { key: "heat", label: "Heat", usedKey: "used_heat", totalKey: "total_heat", utilKey: "heat_utilization_pct" },
];

export default function VisualizerPanel({ results }) {
  const firstAlgo = Object.keys(results)[0];
  const [selectedAlgo, setSelectedAlgo] = useState(firstAlgo);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentStep, setCurrentStep] = useState(0);
  const [collapsePruned, setCollapsePruned] = useState(false);
  const logRef = useRef(null);

  const result = results[selectedAlgo];
  const steps = useMemo(() => result?.steps || [], [result]);
  const safeStep = Math.min(currentStep, Math.max(steps.length - 1, 0));
  const action = steps[safeStep];
  const serverMeta = useMemo(() => {
    const snapshot = action?.snapshot;
    if (!snapshot) return {};
    return Object.keys(snapshot.server_states).reduce((acc, sid) => {
      acc[sid] = snapshot.server_states[sid];
      return acc;
    }, {});
  }, [action]);
  const activeSnapshot = action?.snapshot;
  const viewAllocation = activeSnapshot?.allocation || result?.allocation || {};
  const viewUnallocated = activeSnapshot?.unallocated || result?.unallocated || [];
  const isTreeAlgo = selectedAlgo === "backtracking" || selectedAlgo === "branch_and_bound";
  const displayAction =
    action && action.vm_id !== "final_state"
      ? `${action.action} ${action.vm_id}${action.server_id ? ` -> ${action.server_id}` : ""}`
      : action?.reason || "N/A";

  useEffect(() => {
    setCurrentStep(0);
    setPlaying(false);
  }, [selectedAlgo]);

  useEffect(() => {
    if (!playing || steps.length === 0) return undefined;
    const t = setInterval(() => {
      setCurrentStep((s) => {
        if (s >= steps.length - 1) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 1000 / speed);
    return () => clearInterval(t);
  }, [playing, speed, steps]);

  useEffect(() => {
    const holder = logRef.current;
    if (!holder) return;
    const current = holder.querySelector(`[data-step="${safeStep}"]`);
    current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [safeStep]);

  if (!result) return null;

  const iconForAction = (step) => {
    if (!step) return "•";
    if (step.action === "consider") return "🔍";
    if (step.action === "place") return "✅";
    if (step.action === "backtrack") return "↩";
    if (step.action === "reject" && (step.reason || "").toLowerCase().includes("prune")) return "✂️";
    if (step.action === "reject" && (step.reason || "").toLowerCase().includes("skip branch")) return "✂️";
    if (step.action === "reject") return "❌";
    return "•";
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {Object.keys(results).map((algo) => (
          <button key={algo} type="button" onClick={() => setSelectedAlgo(algo)} className={`rounded px-3 py-1 text-sm ${selectedAlgo === algo ? "bg-indigo-600" : "bg-slate-800"}`}>
            {algo}
          </button>
        ))}
      </div>
      <div className="rounded border border-slate-700 p-4">
        <div className="mb-1 text-sm text-slate-300">Current Action: {displayAction}</div>
        <div className="mb-3 text-xs text-slate-400">
          Step {steps.length === 0 ? 0 : safeStep + 1} / {steps.length}
          {action?.score != null ? ` | score=${action.score}` : ""}
          {action?.upper_bound != null ? ` | ub=${action.upper_bound}` : ""}
        </div>
        <div className="text-xs text-slate-400">Use controls below to animate step-by-step allocation, log timeline, and decision tree exploration.</div>
      </div>
      {isTreeAlgo && (
        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={collapsePruned} onChange={(e) => setCollapsePruned(e.target.checked)} />
            Collapse pruned branches
          </label>
          <DecisionTreeVisualizer
            steps={steps}
            currentStep={safeStep}
            algorithm={selectedAlgo}
            collapsePruned={collapsePruned}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="rounded border border-slate-700 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-200">Server Rack</div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Object.entries(viewAllocation).map(([sid, vmIds]) => {
                const isConsidering = action?.server_id === sid && action?.action === "consider";
                const isPlaced = action?.server_id === sid && action?.action === "place";
                const isBacktracked = action?.server_id === sid && action?.action === "backtrack";
                return (
                  <motion.div
                    key={sid}
                    animate={{
                      scale: isConsidering ? 1.03 : 1,
                      boxShadow: isConsidering
                        ? "0 0 0 2px rgba(59,130,246,0.5)"
                        : isPlaced
                          ? "0 0 0 2px rgba(16,185,129,0.5)"
                          : isBacktracked
                            ? "0 0 0 2px rgba(245,158,11,0.5)"
                            : "0 0 0 0 rgba(0,0,0,0)",
                    }}
                    className="rounded border border-slate-600 bg-slate-900 p-3"
                  >
                    <div className="mb-2 font-semibold">{sid}</div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      {vmIds.map((id) => (
                        <motion.span
                          key={id}
                          layout
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 18 }}
                          className="rounded bg-indigo-700 px-2 py-1 text-xs"
                        >
                          {id}
                        </motion.span>
                      ))}
                      {isBacktracked && action?.vm_id && (
                        <motion.span
                          initial={{ opacity: 1, x: 0 }}
                          animate={{ opacity: 0, x: -30 }}
                          className="rounded bg-amber-600 px-2 py-1 text-xs"
                        >
                          {action.vm_id}
                        </motion.span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {RESOURCE_FIELDS.map((field) => {
                        const state = serverMeta[sid];
                        const used = state?.[field.usedKey] ?? 0;
                        const total = state?.[field.totalKey] ?? 0;
                        const util = state?.[field.utilKey] ?? 0;
                        return (
                          <div key={field.key}>
                            <div className="mb-1 flex justify-between text-[11px] text-slate-300">
                              <span>{field.label}</span>
                              <span>{used} / {total} ({util}%)</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded bg-slate-800">
                              <motion.div className="h-full bg-indigo-500" animate={{ width: `${Math.max(0, Math.min(100, util))}%` }} transition={{ duration: 0.2 }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
          <div className="rounded border border-red-800 bg-red-950/20 p-3">
            <div className="mb-2 text-sm font-semibold text-red-300">Rejected Tray</div>
            <div className="flex flex-wrap gap-2">
              {viewUnallocated.length === 0 && <span className="text-xs text-slate-400">No rejected VMs</span>}
              {viewUnallocated.map((id) => (
                <motion.span key={id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="rounded bg-red-700 px-2 py-1 text-xs">
                  {id}
                </motion.span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded border border-slate-700 p-3">
          <div className="mb-2 text-sm font-semibold text-slate-200">Step Log</div>
          <div ref={logRef} className="h-[420px] overflow-y-auto rounded border border-slate-800 bg-slate-900 p-2">
            {steps.map((step, idx) => (
              <div
                key={`${step.vm_id}-${idx}`}
                data-step={idx}
                className={`mb-1 rounded px-2 py-1 text-xs ${idx === safeStep ? "bg-indigo-700/50" : "bg-slate-800/60"}`}
              >
                <div className="flex items-center justify-between text-slate-300">
                  <span>{iconForAction(step)} {step.action}</span>
                  <span>t+{step.timestamp_ms ?? idx * 16}ms</span>
                </div>
                <div className="text-slate-200">{step.vm_id}{step.server_id ? ` -> ${step.server_id}` : ""}</div>
                {step.reason && <div className="text-slate-400">{step.reason}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded border border-slate-700 p-4">
        <div className="mb-2 text-sm">Playback</div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setPlaying((p) => !p)} className="rounded bg-slate-700 px-3 py-1 text-sm">{playing ? "Pause" : "Play"}</button>
          <button type="button" onClick={() => setCurrentStep((s) => Math.max(0, s - 1))} className="rounded bg-slate-700 px-3 py-1 text-sm">Step Back</button>
          <button type="button" onClick={() => setCurrentStep((s) => Math.min(steps.length - 1, s + 1))} className="rounded bg-slate-700 px-3 py-1 text-sm">Step Forward</button>
          <button type="button" onClick={() => { setPlaying(false); setCurrentStep(Math.max(steps.length - 1, 0)); }} className="rounded bg-slate-700 px-3 py-1 text-sm">Skip End</button>
          <button type="button" onClick={() => { setPlaying(false); setCurrentStep(0); }} className="rounded bg-slate-700 px-3 py-1 text-sm">Reset</button>
          <input type="range" min="0.25" max="8" step="0.25" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
          <span className="text-xs">{speed.toFixed(2)}x</span>
        </div>
        <input
          className="mt-3 w-full"
          type="range"
          min="0"
          max={Math.max(steps.length - 1, 0)}
          value={safeStep}
          onChange={(e) => setCurrentStep(Number(e.target.value))}
          disabled={steps.length === 0}
        />
        <div className="mt-1 text-xs text-slate-400">Step {steps.length === 0 ? 0 : safeStep + 1} of {steps.length}</div>
      </div>
    </div>
  );
}
