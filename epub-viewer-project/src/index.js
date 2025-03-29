import React from "react";
import ReactDOM from "react-dom/client"; // createRoot 사용
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root")); // 새로운 방식
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
