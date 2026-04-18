import time
from typing import List

from models import Server, VM
from scoring import apply_vm, compute_score, fits, init_state
from utils import compute_metrics


def run(servers: List[Server], vms: List[VM], mode: str):
    start = time.perf_counter()
    steps = []

    def vm_priority(vm: VM):
        if mode == "cpu_minimization":
            return -vm.cpu
        if mode == "heat_minimization":
            return -vm.heat_value
        if mode == "latency_maximization":
            return -(vm.cpu + vm.ram)
        return -(vm.cpu + vm.ram + vm.storage)

    sorted_vms = sorted(vms, key=vm_priority)
    states = {s.id: init_state() for s in servers}
    allocation = {s.id: [] for s in servers}
    unallocated = []

    for vm in sorted_vms:
        best_server = None
        best_score = -float("inf")
        for server in servers:
            steps.append({"vm_id": vm.id, "server_id": server.id, "action": "consider", "reason": None})
            if fits(vm, server, states[server.id]):
                score = compute_score(vm, server, states[server.id], mode)
                if score > best_score:
                    best_score = score
                    best_server = server

        if best_server is None:
            unallocated.append(vm.id)
            steps.append({"vm_id": vm.id, "server_id": None, "action": "reject", "reason": "No server has capacity"})
            continue

        states[best_server.id] = apply_vm(states[best_server.id], vm)
        allocation[best_server.id].append(vm.id)
        steps.append({"vm_id": vm.id, "server_id": best_server.id, "action": "place", "reason": f"score={best_score:.3f}"})

    elapsed = (time.perf_counter() - start) * 1000
    return {
        "algorithm": "greedy",
        "mode": mode,
        "allocation": allocation,
        "unallocated": unallocated,
        "metrics": compute_metrics(allocation, unallocated, states, servers),
        "execution_time_ms": round(elapsed, 3),
        "complexity_time": "O(n log n + n·m)",
        "complexity_space": "O(n + m)",
        "steps": steps,
    }
