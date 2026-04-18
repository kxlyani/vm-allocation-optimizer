def get_presets():
    return [
        {
            "name": "small_5s_10vm",
            "servers": [
                {"id": f"S{i+1}", "cpu": 24, "ram": 96, "storage": 1200, "heat_limit": 80, "location": "Zone-A" if i % 2 == 0 else "Zone-B"}
                for i in range(5)
            ],
            "vms": [
                {"id": f"VM{i+1}", "cpu": (i % 4) + 2, "ram": ((i % 3) + 1) * 4, "storage": ((i % 4) + 1) * 60, "heat_value": (i % 5) + 5, "preferred_zone": "Zone-A" if i % 2 == 0 else "Zone-B"}
                for i in range(10)
            ],
        },
        {
            "name": "medium_10s_30vm",
            "servers": [
                {"id": f"S{i+1}", "cpu": 32, "ram": 128, "storage": 2000, "heat_limit": 100, "location": f"Zone-{chr(65 + (i % 3))}"}
                for i in range(10)
            ],
            "vms": [
                {"id": f"VM{i+1}", "cpu": (i % 6) + 2, "ram": ((i % 5) + 1) * 4, "storage": ((i % 8) + 1) * 50, "heat_value": (i % 7) + 6, "preferred_zone": f"Zone-{chr(65 + (i % 3))}"}
                for i in range(30)
            ],
        },
        {
            "name": "stress_3s_50vm",
            "servers": [
                {"id": "S1", "cpu": 48, "ram": 192, "storage": 3000, "heat_limit": 120, "location": "Zone-A"},
                {"id": "S2", "cpu": 48, "ram": 192, "storage": 3000, "heat_limit": 120, "location": "Zone-B"},
                {"id": "S3", "cpu": 48, "ram": 192, "storage": 3000, "heat_limit": 120, "location": "Zone-C"},
            ],
            "vms": [
                {"id": f"VM{i+1}", "cpu": (i % 8) + 1, "ram": ((i % 6) + 1) * 4, "storage": ((i % 10) + 1) * 40, "heat_value": (i % 9) + 4, "preferred_zone": f"Zone-{chr(65 + (i % 3))}"}
                for i in range(50)
            ],
        },
    ]
