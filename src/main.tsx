import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./hooks/useTheme.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="meet:theme">
      <App />
      <Toaster richColors position="top-center" closeButton />
    </ThemeProvider>
  </StrictMode>,
);
