import React from "react";

function Layout({ children }) {
  return (
    <div className="layout">
      <header>
        <h1>OpenShelf</h1>
      </header>
      <main>{children}</main>
      <footer>© 2024 OpenShelf</footer>
    </div>
  );
}

export default Layout;
