const uuid = () => crypto.randomUUID();
const get = (key) => JSON.parse(localStorage.getItem(key) ?? "null");
const set = (key, val) => localStorage.setItem(key, JSON.stringify(val));

const extractScore = (text) => {
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
    const p = { id: uuid(), name, createdAt: Date.now() };
    const list = store.getProjects();
    list.unshift(p);
    set("boo-projects", list);
    return p;
  },
  deleteProject: (id) => {
    set("boo-projects", store.getProjects().filter((p) => p.id !== id));
    set("boo-runs", store.getRuns().filter((r) => r.projectId !== id));
  },

  // Runs
  getRuns: () => get("boo-runs") ?? [],
  getRun: (id) => (get("boo-runs") ?? []).find((r) => r.id === id) ?? null,
  getRunsByProject: (projectId) => store.getRuns().filter((r) => r.projectId === projectId),
  getEvalRuns: (parentRunId) => store.getRuns().filter((r) => r.parentRunId === parentRunId),
  createRun: ({ projectId, parentRunId = null, model }) => {
    const run = { id: uuid(), projectId, parentRunId, model, thread: "", calls: [], score: null, createdAt: Date.now() };
    const list = store.getRuns();
    list.unshift(run);
    set("boo-runs", list);
    return run;
  },
  updateRun: (id, patch) => {
    const list = store.getRuns();
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    const updated = { ...list[idx], ...patch };
    updated.score = extractScore(updated.thread);
    list[idx] = updated;
    set("boo-runs", list);
    return updated;
  },
};
