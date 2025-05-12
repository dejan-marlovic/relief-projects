import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Layout from "./pages/Layout/Layout";
import Login from "./pages/Login/Login";
import Transactions from "./pages/Transactions/Transactions";
import Budgets from "./pages/Budgets/Budgets";
import Project from "./pages/Project/Project";
import Payments from "./pages/Payments/Payments";
import Signatures from "./pages/Signatures/Signatures";
import Recipients from "./pages/Recipients/Recipients";
import Documents from "./pages/Documents/Documents";
import RegisterProject from "./pages/RegisterProject/RegisterProject";
import NoPage from "./pages/NoPage/NoPage";
import { ProjectProvider } from "./context/ProjectContext";

function AppContent() {
  const location = useLocation();
  useEffect(() => {
    console.log("App.js: Route changed to:", location.pathname);
  }, [location]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Project />} />
        <Route path="project" element={<Project />} />
        <Route path="budgets" element={<Budgets />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="payments" element={<Payments />} />
        <Route path="signatures" element={<Signatures />} />
        <Route path="recipients" element={<Recipients />} />
        <Route path="documents" element={<Documents />} />
        <Route path="register-project" element={<RegisterProject />} />
        <Route path="*" element={<NoPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    console.log("App.js: Component mounted");
    // Check for Strict Mode
    if (process.env.NODE_ENV === "development") {
      console.log(
        "App.js: Running in development, Strict Mode may cause double mounts/unmounts"
      );
    }
    return () => {
      console.log("App.js: Component unmounted");
    };
  }, []);

  return (
    <ProjectProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ProjectProvider>
  );
}

// Mount the app
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
