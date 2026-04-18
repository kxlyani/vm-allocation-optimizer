import { useMemo, useState } from "react";
import ComparisonDashboard from "./components/ComparisonDashboard";
import InputPanel from "./components/InputPanel";
import VisualizerPanel from "./components/VisualizerPanel";

const DEFAULT_INPUT = {
  servers: [],
  vms: [],
  mode: "balanced",
  algorithms: ["greedy", "backtracking", "branch_and_bound", "dp"],
};

export default function App() {
  const [tab, setTab] = useState("input");
  const [results, setResults] = useState(null);
  const [inputData, setInputData] = useState(DEFAULT_INPUT);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const hasResults = useMemo(() => results && Object.keys(results).length > 0, [results]);

  const runOptimization = async () => {
    setLoading(true);
    setError("");
    try {
      const validateRes = await fetch("http://localhost:8000/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputData),
      });
      const validateData = await validateRes.json();
      if (!validateData.valid) {
        setError(validateData.warnings.join(" "));
        setLoading(false);
        return;
      }

      const res = await fetch("http://localhost:8000/api/allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputData),
      });
      const data = await res.json();
      setResults(data.results);
      setTab("visualize");
    } catch (e) {
      setError("Unable to call backend API. Ensure FastAPI is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="flex gap-3 border-b border-slate-800 p-4">
        {["input", "visualize", "compare"].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded px-4 py-2 text-sm capitalize ${tab === item ? "bg-indigo-600" : "bg-slate-800"}`}
          >
            {item}
          </button>
        ))}
      </nav>
      {error && <div className="mx-4 mt-4 rounded bg-red-900/50 p-3 text-sm">{error}</div>}
      <main className="p-4">
        {tab === "input" && <InputPanel data={inputData} setData={setInputData} onRun={runOptimization} loading={loading} />}
        {tab === "visualize" && hasResults && <VisualizerPanel results={results} />}
        {tab === "compare" && hasResults && <ComparisonDashboard results={results} />}
        {(tab !== "input" && !hasResults) && (
          <div className="rounded border border-slate-700 p-6 text-slate-300">
            Run optimization first from the Input tab.
          </div>
        )}
      </main>
    </div>
  );
}
