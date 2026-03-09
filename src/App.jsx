import { useState } from "react";
import { ProjectList } from "./screens/ProjectList.jsx";
import { ProjectDetail } from "./screens/ProjectDetail.jsx";
import { ThreadEditor } from "./screens/ThreadEditor.jsx";

export default function App() {
  const [{ screen, params }, setRoute] = useState({ screen: "projects", params: {} });

  const navigate = (screen, params = {}) => setRoute({ screen, params });

  if (screen === "projects") return <ProjectList navigate={navigate} />;
  if (screen === "project")  return <ProjectDetail projectId={params.projectId} navigate={navigate} />;
  if (screen === "thread")   return <ThreadEditor projectId={params.projectId} navigate={navigate} />;
  return null;
}
