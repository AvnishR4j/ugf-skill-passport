import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { UGFProvider } from "@tychilabs/react-ugf";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UGFProvider mode="testnet">
      <App />
    </UGFProvider>
  </StrictMode>,
);
