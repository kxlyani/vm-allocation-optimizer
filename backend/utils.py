from typing import Dict, List

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
