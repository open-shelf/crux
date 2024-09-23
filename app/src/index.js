import "react-app-polyfill/stable";
import "react-app-polyfill/ie11";
import React from "react";
import ReactDOM from "react-dom/client"; // Updated import
import "./index.css";
import AppWithProvider from "./App";

window.Buffer = window.Buffer || require("buffer").Buffer;

const root = ReactDOM.createRoot(document.getElementById("root")); // Use createRoot
root.render(
  <React.StrictMode>
    <AppWithProvider />
  </React.StrictMode>
);
