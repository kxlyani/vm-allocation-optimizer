from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, model_validator


OptimizationMode = Literal[
    "balanced",
    "cpu_minimization",
    "heat_minimization",
    "latency_maximization",
]

AlgorithmName = Literal["greedy", "backtracking", "branch_and_bound", "dp"]


class Server(BaseModel):
    id: str
    cpu: float = Field(gt=0)
    ram: float = Field(gt=0)
    storage: float = Field(gt=0)
    heat_limit: float = Field(gt=0)
    location: str


class VM(BaseModel):
    id: str
    cpu: float = Field(gt=0)
    ram: float = Field(gt=0)
    storage: float = Field(gt=0)
    heat_value: float = Field(gt=0)
    preferred_zone: Optional[str] = None


class AllocationRequest(BaseModel):
    servers: List[Server]
    vms: List[VM]
    mode: OptimizationMode
    algorithms: List[AlgorithmName]

    @model_validator(mode="after")
    def validate_unique_ids(self) -> "AllocationRequest":
        server_ids = [s.id for s in self.servers]
        vm_ids = [v.id for v in self.vms]
        if len(server_ids) != len(set(server_ids)):
            raise ValueError("Server IDs must be unique.")
        if len(vm_ids) != len(set(vm_ids)):
            raise ValueError("VM IDs must be unique.")
        return self


class AllocationMetrics(BaseModel):
    total_vms_placed: int
    avg_cpu_utilization: float
    avg_heat_ratio: float
    unallocated_count: int
    max_latency_score: float = 0.0


class AllocationStep(BaseModel):
    vm_id: str
    server_id: Optional[str]
    action: Literal["place", "reject", "consider", "backtrack"]
    reason: Optional[str] = None


class AllocationResult(BaseModel):
    algorithm: AlgorithmName
    mode: OptimizationMode
    allocation: Dict[str, List[str]]
    unallocated: List[str]
    metrics: AllocationMetrics
    execution_time_ms: float
    complexity_time: str
    complexity_space: str
    steps: List[AllocationStep]
