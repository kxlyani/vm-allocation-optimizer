import { useMemo, useState } from "react";

const NODE_WIDTH = 170;
const LEVEL_HEIGHT = 100;

function isPruned(step) {
  const reason = (step?.reason || "").toLowerCase();
  return reason.includes("prune") || reason.includes("skip branch");
}

function buildTree(steps) {
  const nodes = [
    { id: "root", label: "Start", depth: 0, createdAt: -1, action: "root", parentId: null, score: 0, children: [], pruned: false },
  ];
  const edges = [];
  const backtrackEdges = [];
  const nodeMap = { root: nodes[0] };
  const stack = ["root"];
  let completeNodeId = null;

  steps.forEach((step, idx) => {
    if (step.action === "consider") {
      return;
    }

    if (step.action === "backtrack") {
      const from = stack[stack.length - 1];
      const to = stack.length > 1 ? stack[stack.length - 2] : "root";
      if (from && to) {
        backtrackEdges.push({ id: `b-${idx}`, from, to, createdAt: idx });
      }
      if (stack.length > 1) {
        stack.pop();
      }
      return;
    }

    if (step.vm_id === "final_state") {
      const parent = stack[stack.length - 1] || "root";
      const id = `final-${idx}`;
      const node = {
        id,
        label: "Complete",
        depth: stack.length,
        createdAt: idx,
        action: "complete",
        parentId: parent,
        score: step.score ?? null,
        upper_bound: step.upper_bound ?? null,
        snapshot: step.snapshot,
        server_id: null,
        vm_id: "final_state",
        pruned: false,
        children: [],
      };
      nodes.push(node);
      nodeMap[id] = node;
      nodeMap[parent].children.push(id);
      edges.push({ id: `e-${idx}`, from: parent, to: id, createdAt: idx, label: "" });
      completeNodeId = id;
      return;
    }

    const parent = stack[stack.length - 1] || "root";
    const id = `n-${idx}`;
    const label = `${step.vm_id} -> ${step.server_id || "unassigned"}`;
    const node = {
      id,
      label: isPruned(step) ? `✂ ${label}` : label,
      depth: stack.length,
      createdAt: idx,
      action: step.action,
      parentId: parent,
      score: step.score ?? null,
      upper_bound: step.upper_bound ?? null,
      reason: step.reason,
      snapshot: step.snapshot,
      server_id: step.server_id,
      vm_id: step.vm_id,
      pruned: isPruned(step),
      children: [],
    };
    nodes.push(node);
    nodeMap[id] = node;
    nodeMap[parent].children.push(id);

    const parentScore = nodeMap[parent].score ?? 0;
    const delta = step.score != null ? (step.score - parentScore).toFixed(2) : "";
    edges.push({ id: `e-${idx}`, from: parent, to: id, createdAt: idx, label: delta ? `Δ ${delta}` : "" });

    if (step.action === "place") {
      stack.push(id);
    }
  });

  const leaves = nodes.filter((n) => n.id !== "root" && n.children.length === 0 && !n.pruned && n.action !== "complete");
  const leafSet = new Set(leaves.map((n) => n.id));

  const optimalPath = new Set();
  if (completeNodeId) {
    let cur = completeNodeId;
    while (cur) {
      optimalPath.add(cur);
      cur = nodeMap[cur]?.parentId;
    }
  }

  const widthByDepth = {};
  nodes.forEach((n) => {
    widthByDepth[n.depth] = (widthByDepth[n.depth] || 0) + 1;
  });

  const levelCounter = {};
  nodes.forEach((n) => {
    levelCounter[n.depth] = (levelCounter[n.depth] || 0) + 1;
    const idxAtDepth = levelCounter[n.depth] - 1;
    n.x = idxAtDepth * (NODE_WIDTH + 24) + 20;
    n.y = n.depth * LEVEL_HEIGHT + 20;
  });

  const totalWidth = Math.max(...Object.values(widthByDepth), 1) * (NODE_WIDTH + 24) + 100;
  const totalHeight = (Math.max(...nodes.map((n) => n.depth), 0) + 2) * LEVEL_HEIGHT;
  return { nodes, edges, backtrackEdges, leafSet, optimalPath, totalWidth, totalHeight };
}

function nodeColor(node, currentStep, currentNodeId, leafSet, optimalPath) {
  if (optimalPath.has(node.id)) return "bg-amber-500";
  if (node.createdAt > currentStep) return "bg-slate-500";
  if (node.pruned) return "bg-red-500";
  if (leafSet.has(node.id)) return "bg-emerald-500";
  if (node.id === currentNodeId) return "bg-blue-500";
  return "bg-slate-600";
}

export default function DecisionTreeVisualizer({ steps, currentStep, algorithm, collapsePruned }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const { nodes, edges, backtrackEdges, leafSet, optimalPath, totalWidth, totalHeight } = useMemo(
    () => buildTree(steps || []),
    [steps],
  );

  const visibleNodeIds = useMemo(() => {
    if (!collapsePruned) return new Set(nodes.map((n) => n.id));
    return new Set(nodes.filter((n) => !n.pruned && (!n.parentId || !nodes.find((x) => x.id === n.parentId)?.pruned)).map((n) => n.id));
  }, [nodes, collapsePruned]);

  const currentNodeId = useMemo(() => {
    const active = [...nodes].reverse().find((n) => n.createdAt <= currentStep && n.id !== "root");
    return active?.id || "root";
  }, [nodes, currentStep]);

  const onWheel = (e) => {
    e.preventDefault();
    setScale((prev) => Math.min(2.5, Math.max(0.4, prev + (e.deltaY < 0 ? 0.1 : -0.1))));
  };

  const onMouseDown = (e) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };
  const onMouseMove = (e) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const onMouseUp = () => setDragging(false);

  const showBound = algorithm === "branch_and_bound";
  const showBacktrack = algorithm === "backtracking";

  return (
    <div className="relative rounded border border-slate-700 bg-slate-950 p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
        <span>Decision Tree ({algorithm})</span>
        <span>Zoom: {scale.toFixed(2)}x</span>
      </div>
      <div className="h-[420px] overflow-hidden rounded border border-slate-800 bg-slate-900" onWheel={onWheel} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
        <svg width="100%" height="100%" onMouseDown={onMouseDown}>
          <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
            {edges
              .filter((e) => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to))
              .map((e) => {
                const from = nodes.find((n) => n.id === e.from);
                const to = nodes.find((n) => n.id === e.to);
                if (!from || !to) return null;
                return (
                  <g key={e.id}>
                    <line x1={from.x + NODE_WIDTH / 2} y1={from.y + 28} x2={to.x + NODE_WIDTH / 2} y2={to.y} stroke="#64748b" strokeWidth="1.5" />
                    {e.label && (
                      <text x={(from.x + to.x) / 2 + NODE_WIDTH / 2} y={(from.y + to.y) / 2} fontSize="10" fill="#cbd5e1" textAnchor="middle">
                        {e.label}
                      </text>
                    )}
                  </g>
                );
              })}
            {showBacktrack &&
              backtrackEdges
                .filter((e) => e.createdAt <= currentStep && visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to))
                .map((e) => {
                  const from = nodes.find((n) => n.id === e.from);
                  const to = nodes.find((n) => n.id === e.to);
                  if (!from || !to) return null;
                  return (
                    <line
                      key={e.id}
                      x1={from.x + NODE_WIDTH / 2}
                      y1={from.y}
                      x2={to.x + NODE_WIDTH / 2}
                      y2={to.y + 20}
                      stroke="#f59e0b"
                      strokeDasharray="6 4"
                      strokeWidth="2"
                    />
                  );
                })}
            {nodes
              .filter((n) => visibleNodeIds.has(n.id))
              .map((node) => {
                const fillClass = nodeColor(node, currentStep, currentNodeId, leafSet, optimalPath);
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x},${node.y})`}
                    onMouseEnter={(e) => setTooltip({ node, x: e.clientX, y: e.clientY })}
                    onMouseMove={(e) => setTooltip((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null))}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <rect width={NODE_WIDTH} height={46} rx={8} className={fillClass} />
                    <text x={8} y={18} fontSize="11" fill="#f8fafc">
                      {node.label}
                    </text>
                    {showBound && node.upper_bound != null && (
                      <text x={8} y={34} fontSize="10" fill="#f8fafc">
                        UB: {node.upper_bound}
                      </text>
                    )}
                    {node.pruned && (
                      <text x={NODE_WIDTH - 18} y={16} fontSize="12" fill="#f8fafc">
                        ✂
                      </text>
                    )}
                  </g>
                );
              })}
          </g>
        </svg>
      </div>
      {tooltip && (
        <div
          className="pointer-events-none fixed z-20 w-56 rounded border border-slate-700 bg-slate-900 p-2 text-xs text-slate-200"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          <div className="mb-1 font-semibold">{tooltip.node.label}</div>
          <div className="mb-2 text-slate-400">{tooltip.node.reason || "Decision node"}</div>
          {(() => {
            const serverId = tooltip.node.server_id;
            const state = serverId ? tooltip.node.snapshot?.server_states?.[serverId] : null;
            if (!state) return <div className="text-slate-400">No server resource data</div>;
            return (
              <div className="space-y-1">
                <div>CPU: {state.used_cpu}/{state.total_cpu}</div>
                <div>RAM: {state.used_ram}/{state.total_ram}</div>
                <div>Heat: {state.used_heat}/{state.total_heat}</div>
              </div>
            );
          })()}
        </div>
      )}
      <div className="mt-2 text-[11px] text-slate-400">
        Canvas size: {Math.round(totalWidth)} x {Math.round(totalHeight)} | Blue exploring, Green complete leaf, Red pruned, Gray unexplored, Gold optimal
      </div>
    </div>
  );
}
