(await import("./Loader")).default();

import ReactDOM from 'react-dom/client';
import App from './App';

console.log("??????????? okay ?????");
const rootDiv = document.createElement("div");
rootDiv.className = "extension-root";
document.body.appendChild(rootDiv);

ReactDOM.createRoot(rootDiv).render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>
);
