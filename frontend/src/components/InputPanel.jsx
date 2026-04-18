import { useState } from "react";

const SAMPLE_SERVER = { id: "S1", cpu: 32, ram: 128, storage: 2000, heat_limit: 100, location: "Zone-A" };
const SAMPLE_VM = { id: "VM1", cpu: 4, ram: 16, storage: 200, heat_value: 15, preferred_zone: "Zone-A" };

export default function InputPanel({ data, setData, onRun, loading }) {
  const [bulkJSON, setBulkJSON] = useState("");

  const addServer = () => setData({ ...data, servers: [...data.servers, { ...SAMPLE_SERVER, id: `S${data.servers.length + 1}` }] });
  const addVM = () => setData({ ...data, vms: [...data.vms, { ...SAMPLE_VM, id: `VM${data.vms.length + 1}` }] });

  const updateRow = (type, index, field, value) => {
    const next = [...data[type]];
    next[index] = { ...next[index], [field]: ["id", "location", "preferred_zone"].includes(field) ? value : Number(value) };
    setData({ ...data, [type]: next });
  };

  const removeRow = (type, index) => {
    const next = data[type].filter((_, i) => i !== index);
    setData({ ...data, [type]: next });
  };

  const loadJSON = () => {
    try {
      const parsed = JSON.parse(bulkJSON);
      setData({
        ...data,
        servers: parsed.servers || [],
        vms: parsed.vms || [],
      });
    } catch {
      // no-op, user can correct JSON
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded border border-slate-700 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Servers</h2>
          <button type="button" onClick={addServer} className="rounded bg-emerald-700 px-3 py-1 text-sm">Add Server</button>
        </div>
        <div className="space-y-2">
          {data.servers.map((s, idx) => (
            <div key={s.id + idx} className="grid grid-cols-7 gap-2">
              {["id", "cpu", "ram", "storage", "heat_limit", "location"].map((f) => (
                <input key={f} value={s[f]} onChange={(e) => updateRow("servers", idx, f, e.target.value)} className="rounded bg-slate-900 p-2 text-sm" />
              ))}
              <button type="button" onClick={() => removeRow("servers", idx)} className="rounded bg-red-800 px-3">X</button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded border border-slate-700 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">VM Requests</h2>
          <button type="button" onClick={addVM} className="rounded bg-emerald-700 px-3 py-1 text-sm">Add VM</button>
        </div>
        <div className="space-y-2">
          {data.vms.map((v, idx) => (
            <div key={v.id + idx} className="grid grid-cols-8 gap-2">
              {["id", "cpu", "ram", "storage", "heat_value", "preferred_zone"].map((f) => (
                <input key={f} value={v[f]} onChange={(e) => updateRow("vms", idx, f, e.target.value)} className="rounded bg-slate-900 p-2 text-sm" />
              ))}
              <button type="button" onClick={() => removeRow("vms", idx)} className="rounded bg-red-800 px-3">X</button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded border border-slate-700 p-4">
        <div className="mb-2 text-sm font-medium">Optimization Mode</div>
        <div className="flex gap-4">
          {["balanced", "cpu_minimization", "heat_minimization", "latency_maximization"].map((m) => (
            <label key={m} className="flex items-center gap-2 text-sm">
              <input type="radio" name="mode" checked={data.mode === m} onChange={() => setData({ ...data, mode: m })} />
              {m}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded border border-slate-700 p-4">
        <div className="mb-2 text-sm font-medium">Algorithms</div>
        <div className="flex gap-4">
          {["greedy", "backtracking", "branch_and_bound", "dp"].map((algo) => (
            <label key={algo} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={data.algorithms.includes(algo)}
                onChange={(e) =>
                  setData({
                    ...data,
                    algorithms: e.target.checked ? [...data.algorithms, algo] : data.algorithms.filter((a) => a !== algo),
                  })
                }
              />
              {algo}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded border border-slate-700 p-4">
        <div className="mb-2 text-sm font-medium">Bulk JSON Import</div>
        <textarea value={bulkJSON} onChange={(e) => setBulkJSON(e.target.value)} rows={5} className="w-full rounded bg-slate-900 p-2 text-sm" />
        <button type="button" onClick={loadJSON} className="mt-2 rounded bg-slate-700 px-3 py-1 text-sm">Load JSON</button>
      </section>

      <button type="button" onClick={onRun} disabled={loading || data.algorithms.length === 0} className="rounded bg-indigo-600 px-5 py-2 font-medium disabled:opacity-50">
        {loading ? "Running..." : "Run Optimization"}
      </button>
    </div>
  );
}
