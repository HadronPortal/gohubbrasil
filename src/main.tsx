import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

window.requestAnimationFrame(() => {
  document.getElementById("gohub-boot-loader")?.remove();
});
