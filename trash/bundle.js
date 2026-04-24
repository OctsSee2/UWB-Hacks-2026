// src/index.tsx
import React from "react";
import ReactDOM from "react-dom/client";

// src/App.tsx
import { jsx } from "react/jsx-runtime";
function App() {
  return /* @__PURE__ */ jsx("div", { className: "App", children: "I am an extension." });
}
var App_default = App;

// src/index.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
console.log("??????????? okay ?????");
var rootDiv = document.createElement("div");
rootDiv.className = "extension-root";
document.body.appendChild(rootDiv);
ReactDOM.createRoot(rootDiv).render(
  /* @__PURE__ */ jsx2(React.StrictMode, { children: /* @__PURE__ */ jsx2(App_default, {}) })
);
