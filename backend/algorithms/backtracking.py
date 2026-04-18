import time
from copy import deepcopy
from typing import List

from models import Server, VM
from scoring import apply_vm, compute_score, fits, init_state
from utils import compute_metrics


def run(servers: List[Server], vms: List[VM], mode: str):
    start = time.perf_counter()
    steps = []
    vm_map = {vm.id: vm for vm in vms}
    best = {"score": -float("inf"), "allocation": None, "unallocated": None, "states": None}

    states = {s.id: init_state() for s in servers}
    allocation = {s.id: [] for s in servers}

    def calc_score(state_map, alloc_map):
        score = 0.0
        for s in servers:
            for vm_id in alloc_map[s.id]:
                score += compute_score(vm_map[vm_id], s, state_map[s.id], mode)
        return score

    def backtrack(idx: int, current_unallocated: List[str]):
        if idx == len(vms):
            cur_score = calc_score(states, allocation)
            if cur_score > best["score"]:
                best["score"] = cur_score
                best["allocation"] = deepcopy(allocation)
                best["unallocated"] = list(current_unallocated)
                best["states"] = deepcopy(states)
            return

        vm = vms[idx]
        for server in servers:
            steps.append({"vm_id": vm.id, "server_id": server.id, "action": "consider", "reason": None})
            if not fits(vm, server, states[server.id]):
                continue
            prev_state = deepcopy(states[server.id])
            states[server.id] = apply_vm(states[server.id], vm)
            allocation[server.id].append(vm.id)
            steps.append({"vm_id": vm.id, "server_id": server.id, "action": "place", "reason": "recursive try"})
            backtrack(idx + 1, current_unallocated)
            allocation[server.id].pop()
            states[server.id] = prev_state
            steps.append({"vm_id": vm.id, "server_id": server.id, "action": "backtrack", "reason": "explore next branch"})

        backtrack(idx + 1, current_unallocated + [vm.id])

    backtrack(0, [])
    elapsed = (time.perf_counter() - start) * 1000
    best_allocation = best["allocation"] or {s.id: [] for s in servers}
    best_unallocated = best["unallocated"] or []
    best_states = best["states"] or {s.id: init_state() for s in servers}
    return {
        "algorithm": "backtracking",
        "mode": mode,
        "allocation": best_allocation,
        "unallocated": best_unallocated,
        "metrics": compute_metrics(best_allocation, best_unallocated, best_states, servers),
        "execution_time_ms": round(elapsed, 3),
        "complexity_time": "O(m^n) pruned",
        "complexity_space": "O(n)",
        "steps": steps,
    }
