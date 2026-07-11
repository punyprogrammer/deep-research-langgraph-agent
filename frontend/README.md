# Deep Research Frontend

React + TypeScript + Vite UI for the Deep Research agent.

## Stack

- React 19 + TypeScript
- Tailwind CSS v4
- Aceternity UI components (Spotlight, Background Beams, Text Generate Effect, Placeholders Vanish Input, Hover Border Gradient, Multi Step Loader)
- Dark / light theme toggle

## Setup

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173` and proxies `/api` to the backend at `http://localhost:3001`.

Optional: set `VITE_API_URL` in `.env` to point at another API origin (requires CORS on the backend).

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Start Vite dev server    |
| `npm run build`| Typecheck + production build |
| `npm run preview` | Preview production build |
