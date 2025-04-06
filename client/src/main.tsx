import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { loadConfiguredTimezone } from "./lib/timezone-utils";

// Carrega o fuso horário configurado ao iniciar a aplicação
loadConfiguredTimezone().catch(console.error);

createRoot(document.getElementById("root")!).render(<App />);
