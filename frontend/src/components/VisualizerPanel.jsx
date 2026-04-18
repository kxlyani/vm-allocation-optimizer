import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

export default function VisualizerPanel({ results }) {
  const firstAlgo = Object.keys(results)[0];
  const [selectedAlgo, setSelectedAlgo] = useState(firstAlgo);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentStep, setCurrentStep] = useState(0);

  const result = results[selectedAlgo];
  const steps = useMemo(() => result?.steps || [], [result]);
  const action = steps[currentStep];

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

  if (!result) return null;

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
        <div className="mb-3 text-sm text-slate-300">Current Action: {action ? `${action.action} ${action.vm_id}${action.server_id ? ` -> ${action.server_id}` : ""}` : "N/A"}</div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Object.entries(result.allocation).map(([sid, vmIds]) => (
            <motion.div
              key={sid}
              animate={{ scale: action?.server_id === sid ? 1.03 : 1 }}
              className="rounded border border-slate-600 bg-slate-900 p-3"
            >
              <div className="mb-2 font-semibold">{sid}</div>
              <div className="flex flex-wrap gap-2">
                {vmIds.map((id) => (
                  <motion.span key={id} layout className="rounded bg-indigo-700 px-2 py-1 text-xs">
                    {id}
                  </motion.span>
                ))}
                {vmIds.length === 0 && <span className="text-xs text-slate-400">No VMs assigned</span>}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="rounded border border-slate-700 p-4">
        <div className="mb-2 text-sm">Unallocated: {result.unallocated.join(", ") || "None"}</div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPlaying((p) => !p)} className="rounded bg-slate-700 px-3 py-1 text-sm">{playing ? "Pause" : "Play"}</button>
          <button type="button" onClick={() => setCurrentStep((s) => Math.max(0, s - 1))} className="rounded bg-slate-700 px-3 py-1 text-sm">Back</button>
          <button type="button" onClick={() => setCurrentStep((s) => Math.min(steps.length - 1, s + 1))} className="rounded bg-slate-700 px-3 py-1 text-sm">Step</button>
          <input type="range" min="1" max="4" step="1" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
          <span className="text-xs">{speed}x</span>
        </div>
      </div>
    </div>
  );
}
