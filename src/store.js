const uuid = () => crypto.randomUUID();
const get = (key) => JSON.parse(localStorage.getItem(key) ?? "null");
const set = (key, val) => localStorage.setItem(key, JSON.stringify(val));

export const extractScore = (text) => {
  const matches = [...text.matchAll(/(\d+\.?\d*)\/10/g)];
  if (!matches.length) return null;
  const score = parseFloat(matches[matches.length - 1][1]);
  return score >= 0 && score <= 10 ? score : null;
};

export const store = {
  // Projects
  getProjects: () => get("boo-projects") ?? [],
  getProject: (id) => (get("boo-projects") ?? []).find((p) => p.id === id) ?? null,
  createProject: (name) => {
    const p = { id: uuid(), name, createdAt: Date.now(), systemPrompt: "", evalPrompt: "", evalModel: "llama-3.3-70b-versatile" };
    const list = store.getProjects();
    list.unshift(p);
    set("boo-projects", list);
    return p;
  },
  updateProject: (id, patch) => {
    const list = store.getProjects();
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch };
    set("boo-projects", list);
    return list[idx];
  },

  // Runs — 1 call per run
  getRuns: () => get("boo-runs") ?? [],
  getRun: (id) => (get("boo-runs") ?? []).find((r) => r.id === id) ?? null,
  getRunsByProject: (projectId) => store.getRuns().filter((r) => r.projectId === projectId),
  createRun: ({ projectId, model }) => {
    const run = { id: uuid(), projectId, model, thread: "", score: null, tokensIn: 0, tokensOut: 0, createdAt: Date.now() };
    const list = store.getRuns();
    list.unshift(run);
    set("boo-runs", list);
    return run;
  },
  updateRun: (id, patch) => {
    const list = store.getRuns();
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch };
    set("boo-runs", list);
    return list[idx];
  },
};
