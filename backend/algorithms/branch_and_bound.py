import heapq
import time
from copy import deepcopy
from typing import List

from models import Server, VM
from scoring import apply_vm, compute_score, fits, init_state
from utils import compute_metrics, record_step


def run(servers: List[Server], vms: List[VM], mode: str):
    start = time.perf_counter()
    steps = []
    best = {"score": -float("inf"), "allocation": None, "unallocated": None, "states": None}

    def upper_bound(idx, states, current_score):
        bound = current_score
        for i in range(idx, len(vms)):
            vm = vms[i]
            best_local = 0.0
            for server in servers:
                if fits(vm, server, states[server.id]):
                    best_local = max(best_local, compute_score(vm, server, states[server.id], mode))
            bound += best_local
        return bound

    base_states = {s.id: init_state() for s in servers}
    base_alloc = {s.id: [] for s in servers}
    counter = 0
    heap = [(-upper_bound(0, base_states, 0.0), counter, 0, base_states, base_alloc, [], 0.0)]

    while heap:
        neg_bound, _, idx, states, allocation, unallocated, current_score = heapq.heappop(heap)
        if -neg_bound <= best["score"]:
            continue

        if idx == len(vms):
            if current_score > best["score"]:
                best["score"] = current_score
                best["allocation"] = deepcopy(allocation)
                best["unallocated"] = list(unallocated)
                best["states"] = deepcopy(states)
            continue

        vm = vms[idx]
        for server in servers:
            record_step(steps, servers, allocation, states, unallocated, vm.id, server.id, "consider")
            if not fits(vm, server, states[server.id]):
                continue
            ns = deepcopy(states)
            na = deepcopy(allocation)
            ns[server.id] = apply_vm(ns[server.id], vm)
            na[server.id].append(vm.id)
            add = compute_score(vm, server, states[server.id], mode)
            nscore = current_score + add
            ub = upper_bound(idx + 1, ns, nscore)
            if ub > best["score"]:
                counter += 1
                heapq.heappush(heap, (-ub, counter, idx + 1, ns, na, list(unallocated), nscore))
                record_step(
                    steps,
                    servers,
                    na,
                    ns,
                    unallocated,
                    vm.id,
                    server.id,
                    "place",
                    reason=f"ub={ub:.2f}",
                    score=nscore,
                    upper_bound=ub,
                )

        ub = upper_bound(idx + 1, states, current_score)
        if ub > best["score"]:
            counter += 1
            heapq.heappush(
                heap,
                (-ub, counter, idx + 1, deepcopy(states), deepcopy(allocation), unallocated + [vm.id], current_score),
            )
            record_step(
                steps,
                servers,
                allocation,
                states,
                unallocated + [vm.id],
                vm.id,
                None,
                "reject",
                reason=f"skip branch ub={ub:.2f}",
                score=current_score,
                upper_bound=ub,
            )

    elapsed = (time.perf_counter() - start) * 1000
    out_allocation = best["allocation"] or {s.id: [] for s in servers}
    out_unallocated = best["unallocated"] or [vm.id for vm in vms]
    out_states = best["states"] or {s.id: init_state() for s in servers}
    record_step(
        steps,
        servers,
        out_allocation,
        out_states,
        out_unallocated,
        "final_state",
        None,
        "consider",
        reason="best solution snapshot",
        score=best["score"] if best["score"] != -float("inf") else None,
    )
    return {
        "algorithm": "branch_and_bound",
        "mode": mode,
        "allocation": out_allocation,
        "unallocated": out_unallocated,
        "metrics": compute_metrics(out_allocation, out_unallocated, out_states, servers),
        "execution_time_ms": round(elapsed, 3),
        "complexity_time": "O(m^n) bounded",
        "complexity_space": "O(n·m)",
        "steps": steps,
    }
