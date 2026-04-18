# VM Allocation Optimizer - Mini Project

Interactive full-stack app to allocate VMs across physical servers using four algorithms:
- Greedy
- Backtracking
- Branch and Bound
- Dynamic Programming

## Project Structure

- `backend/` - FastAPI API and algorithm engines
- `frontend/` - React + Vite UI with visualization and comparison dashboard

## Run Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## API Endpoints

- `POST /api/allocate`
- `POST /api/validate`
- `GET /api/presets`

## Notes

- Step traces are available in each algorithm result under `steps` and power the visualizer playback.
- Backtracking and branch-and-bound can be slow on very large VM sets; use small/medium presets for quick demos.
