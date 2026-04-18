from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from algorithms import backtracking, branch_and_bound, dp, greedy
from models import AllocationRequest
from presets import get_presets

app = FastAPI(title="VM Allocation Optimizer API")
MAX_STEPS_PER_ALGO = 1200

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ALGO_MAP = {
    "greedy": greedy.run,
    "backtracking": backtracking.run,
    "branch_and_bound": branch_and_bound.run,
    "dp": dp.run,
}


@app.post("/api/allocate")
def allocate(req: AllocationRequest):
    results = {}
    for algo in req.algorithms:
        if algo in ALGO_MAP:
            result = ALGO_MAP[algo](req.servers, req.vms, req.mode)
            if len(result.get("steps", [])) > MAX_STEPS_PER_ALGO:
                result["steps"] = result["steps"][:MAX_STEPS_PER_ALGO]
            results[algo] = result
    return {"results": results}


@app.post("/api/validate")
def validate(req: AllocationRequest):
    warnings = []
    if not req.servers:
        warnings.append("No physical servers provided.")
    if not req.vms:
        warnings.append("No VM requests provided.")
    total_cpu = sum(s.cpu for s in req.servers)
    total_ram = sum(s.ram for s in req.servers)
    total_storage = sum(s.storage for s in req.servers)
    total_heat = sum(s.heat_limit for s in req.servers)
    vm_cpu = sum(v.cpu for v in req.vms)
    vm_ram = sum(v.ram for v in req.vms)
    vm_storage = sum(v.storage for v in req.vms)
    vm_heat = sum(v.heat_value for v in req.vms)
    if vm_cpu > total_cpu:
        warnings.append(f"Total VM CPU demand ({vm_cpu}) exceeds total server CPU ({total_cpu}).")
    if vm_ram > total_ram:
        warnings.append(f"Total VM RAM demand ({vm_ram}) exceeds total server RAM ({total_ram}).")
    if vm_storage > total_storage:
        warnings.append(f"Total VM storage demand ({vm_storage}) exceeds total server storage ({total_storage}).")
    if vm_heat > total_heat:
        warnings.append(f"Total VM heat ({vm_heat}) exceeds total server heat limit ({total_heat}).")
    return {"warnings": warnings, "valid": len(warnings) == 0}


@app.get("/api/presets")
def presets():
    return {"presets": get_presets()}
