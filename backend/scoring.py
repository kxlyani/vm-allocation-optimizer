from typing import Dict

from models import Server, VM


def compute_score(vm: VM, server: Server, server_state: Dict[str, float], mode: str) -> float:
    cpu_util = server_state["used_cpu"] / server.cpu if server.cpu else 0.0
    heat_ratio = server_state["used_heat"] / server.heat_limit if server.heat_limit else 0.0
    ram_util = server_state["used_ram"] / server.ram if server.ram else 0.0

    if mode == "balanced":
        return 0.34 * cpu_util + 0.33 * ram_util + 0.33 * (1 - heat_ratio)
    if mode == "cpu_minimization":
        return cpu_util + 0.1 * ram_util
    if mode == "heat_minimization":
        return (1 - heat_ratio) + 0.2 * cpu_util
    if mode == "latency_maximization":
        zone_bonus = 1.0 if vm.preferred_zone and vm.preferred_zone == server.location else 0.0
        return zone_bonus + 0.7 * cpu_util + 0.3 * ram_util
    return 0.0


def fits(vm: VM, server: Server, state: Dict[str, float]) -> bool:
    return (
        state["used_cpu"] + vm.cpu <= server.cpu
        and state["used_ram"] + vm.ram <= server.ram
        and state["used_storage"] + vm.storage <= server.storage
        and state["used_heat"] + vm.heat_value <= server.heat_limit
    )


def init_state() -> Dict[str, float]:
    return {
        "used_cpu": 0.0,
        "used_ram": 0.0,
        "used_storage": 0.0,
        "used_heat": 0.0,
        "vms": [],
    }


def apply_vm(state: Dict[str, float], vm: VM) -> Dict[str, float]:
    return {
        "used_cpu": state["used_cpu"] + vm.cpu,
        "used_ram": state["used_ram"] + vm.ram,
        "used_storage": state["used_storage"] + vm.storage,
        "used_heat": state["used_heat"] + vm.heat_value,
        "vms": state["vms"] + [vm.id],
    }
