export function ImportTheMap () {
  const importMap: any = {
    imports: {
      "react": "https://esm.sh/react@18",
      "react/jsx-runtime": "https://esm.sh/react@18/jsx-runtime",
      "react-dom/client": "https://esm.sh/react-dom@18/client"
    }
  };

  const importScript = document.createElement("script");
  importScript.type = "importmap";
  importScript.textContent = JSON.stringify(importMap);
  document.head.appendChild(importScript);
}
