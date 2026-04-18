import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function ComparisonDashboard({ results }) {
  const rows = Object.values(results).map((r) => ({
    algorithm: r.algorithm,
    placed: r.metrics.total_vms_placed,
    cpu: r.metrics.avg_cpu_utilization,
    heat: r.metrics.avg_heat_ratio,
    time: r.execution_time_ms,
    complexity: `${r.complexity_time} / ${r.complexity_space}`,
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {Object.values(results).map((r) => (
          <div key={r.algorithm} className="rounded border border-slate-700 p-4">
            <div className="mb-2 text-lg font-semibold capitalize">{r.algorithm}</div>
            <div className="space-y-1 text-sm text-slate-300">
              <div>Placed: {r.metrics.total_vms_placed}</div>
              <div>Avg CPU: {r.metrics.avg_cpu_utilization}%</div>
              <div>Avg Heat: {r.metrics.avg_heat_ratio}%</div>
              <div>Execution: {r.execution_time_ms} ms</div>
              <div>Complexity: {r.complexity_time}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded border border-slate-700 p-4">
        <h3 className="mb-3 text-sm font-semibold">Algorithm Metrics</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="algorithm" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="placed" fill="#4f46e5" />
              <Bar dataKey="cpu" fill="#10b981" />
              <Bar dataKey="heat" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
