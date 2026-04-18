import time
from typing import List

from models import Server, VM
from scoring import compute_score, init_state
from utils import compute_metrics

BINS = 10


def discretize(value: float, max_value: float) -> int:
    if max_value <= 0:
        return 0
    return min(BINS, int((value / max_value) * BINS))


def run(servers: List[Server], vms: List[VM], mode: str):
    start = time.perf_counter()
    steps = []
    vm_assignment = {}

    for server in servers:
        dp = [[[(-float("inf"), []) for _ in range(BINS + 1)] for _ in range(BINS + 1)] for _ in range(BINS + 1)]
        dp[0][0][0] = (0.0, [])
        cpu_bins = [discretize(vm.cpu, server.cpu) for vm in vms]
        ram_bins = [discretize(vm.ram, server.ram) for vm in vms]
        sto_bins = [discretize(vm.storage, server.storage) for vm in vms]

        for i, vm in enumerate(vms):
            vc, vr, vs = cpu_bins[i], ram_bins[i], sto_bins[i]
            for c in range(BINS, -1, -1):
                for r in range(BINS, -1, -1):
                    for s in range(BINS, -1, -1):
                        score_now, vm_list = dp[c][r][s]
                        if score_now == -float("inf"):
                            continue
                        nc, nr, ns = c + vc, r + vr, s + vs
                        if nc > BINS or nr > BINS or ns > BINS:
                            continue
                        heat = sum(next(v.heat_value for v in vms if v.id == vid) for vid in vm_list)
                        if heat + vm.heat_value > server.heat_limit:
                            continue
                        add = compute_score(
                            vm,
                            server,
                            {
                                "used_cpu": c / BINS * server.cpu,
                                "used_ram": r / BINS * server.ram,
                                "used_storage": s / BINS * server.storage,
                                "used_heat": heat,
                            },
                            mode,
                        )
                        new_score = score_now + add
                        if new_score > dp[nc][nr][ns][0]:
                            dp[nc][nr][ns] = (new_score, vm_list + [vm.id])
                            steps.append({"vm_id": vm.id, "server_id": server.id, "action": "consider", "reason": f"dp={new_score:.2f}"})

        best_score = -float("inf")
        best_subset = []
        for c in range(BINS + 1):
            for r in range(BINS + 1):
                for s in range(BINS + 1):
                    if dp[c][r][s][0] > best_score:
                        best_score = dp[c][r][s][0]
                        best_subset = dp[c][r][s][1]

        for vm_id in best_subset:
            if vm_id not in vm_assignment or vm_assignment[vm_id][1] < best_score:
                vm_assignment[vm_id] = (server.id, best_score)
                steps.append({"vm_id": vm_id, "server_id": server.id, "action": "place", "reason": "dp optimal"})

    allocation = {s.id: [] for s in servers}
    states = {s.id: init_state() for s in servers}
    assigned = set()
    for vm in vms:
        if vm.id in vm_assignment and vm.id not in assigned:
            sid = vm_assignment[vm.id][0]
            allocation[sid].append(vm.id)
            states[sid]["used_cpu"] += vm.cpu
            states[sid]["used_ram"] += vm.ram
            states[sid]["used_storage"] += vm.storage
            states[sid]["used_heat"] += vm.heat_value
            assigned.add(vm.id)

    unallocated = [vm.id for vm in vms if vm.id not in assigned]
    elapsed = (time.perf_counter() - start) * 1000
    return {
        "algorithm": "dp",
        "mode": mode,
        "allocation": allocation,
        "unallocated": unallocated,
        "metrics": compute_metrics(allocation, unallocated, states, servers),
        "execution_time_ms": round(elapsed, 3),
        "complexity_time": "O(m·n·C³)",
        "complexity_space": "O(C³)",
        "steps": steps,
    }
