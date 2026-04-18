from copy import deepcopy
from typing import Dict, List, Optional

from models import Server


def compute_metrics(allocation: Dict[str, List[str]], unallocated: List[str], states: Dict[str, dict], servers: List[Server]) -> dict:
    placed = sum(len(v) for v in allocation.values())
    if not servers:
        return {
            "total_vms_placed": placed,
            "avg_cpu_utilization": 0.0,
            "avg_heat_ratio": 0.0,
            "unallocated_count": len(unallocated),
            "max_latency_score": 0.0,
        }

    avg_cpu = sum(states[s.id]["used_cpu"] / s.cpu for s in servers) / len(servers) * 100
    avg_heat = sum(states[s.id]["used_heat"] / s.heat_limit for s in servers) / len(servers) * 100
    return {
        "total_vms_placed": placed,
        "avg_cpu_utilization": round(avg_cpu, 2),
        "avg_heat_ratio": round(avg_heat, 2),
        "unallocated_count": len(unallocated),
        "max_latency_score": round(max((1 - (states[s.id]["used_heat"] / s.heat_limit) if s.heat_limit else 0) for s in servers), 3),
    }


def _util_pct(used: float, total: float) -> float:
    if total <= 0:
        return 0.0
    return round((used / total) * 100, 2)


def build_snapshot(
    servers: List[Server],
    allocation: Dict[str, List[str]],
    states: Dict[str, dict],
    unallocated: List[str],
) -> dict:
    server_states = {}
    for server in servers:
        state = states[server.id]
        used_cpu = round(state["used_cpu"], 3)
        used_ram = round(state["used_ram"], 3)
        used_storage = round(state["used_storage"], 3)
        used_heat = round(state["used_heat"], 3)
        server_states[server.id] = {
            "total_cpu": server.cpu,
            "total_ram": server.ram,
            "total_storage": server.storage,
            "total_heat": server.heat_limit,
            "used_cpu": used_cpu,
            "used_ram": used_ram,
            "used_storage": used_storage,
            "used_heat": used_heat,
            "remaining_cpu": round(server.cpu - used_cpu, 3),
            "remaining_ram": round(server.ram - used_ram, 3),
            "remaining_storage": round(server.storage - used_storage, 3),
            "remaining_heat": round(server.heat_limit - used_heat, 3),
            "cpu_utilization_pct": _util_pct(used_cpu, server.cpu),
            "ram_utilization_pct": _util_pct(used_ram, server.ram),
            "storage_utilization_pct": _util_pct(used_storage, server.storage),
            "heat_utilization_pct": _util_pct(used_heat, server.heat_limit),
        }

    return {
        "allocation": deepcopy(allocation),
        "server_states": server_states,
        "unallocated": list(unallocated),
    }


def record_step(
    steps: List[dict],
    servers: List[Server],
    allocation: Dict[str, List[str]],
    states: Dict[str, dict],
    unallocated: List[str],
    vm_id: str,
    server_id: Optional[str],
    action: str,
    reason: Optional[str] = None,
    score: Optional[float] = None,
    upper_bound: Optional[float] = None,
) -> None:
    step_index = len(steps)
    step = {
        "step_index": step_index,
        "timestamp_ms": round(step_index * 16.0, 3),
        "vm_id": vm_id,
        "server_id": server_id,
        "action": action,
        "reason": reason,
        "score": None if score is None else round(score, 3),
        "upper_bound": None if upper_bound is None else round(upper_bound, 3),
        "snapshot": build_snapshot(servers, allocation, states, unallocated),
    }
    steps.append(step)
