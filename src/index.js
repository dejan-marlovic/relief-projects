// Import ReactDOM to render the React app into the DOM
import ReactDOM from "react-dom/client";

// React Router imports to manage client-side routing
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Importing all page components and views used in the routing
import Layout from "./pages/Layout/Layout";
import Login from "./pages/Login/Login";
import Transactions from "./pages/Transactions/Transactions";
import Budgets from "./pages/Budgets/Budgets";
import Project from "./pages/Project/Project";
import PaymentOrders from "./pages/PaymentsOrders/PaymentOrders";
import Signatures from "./pages/Signatures/Signatures";
import Recipients from "./pages/Recipients/Recipients";
import Documents from "./pages/Documents/Documents";
import Statistics from "./pages/Statistics/Statistics";
import RegisterProject from "./pages/RegisterProject/RegisterProject"; // ✅ Register Project page
import Organizations from "./pages/Organizations/Organizations";
import NoPage from "./pages/NoPage/NoPage"; // Catch-all for undefined routes (404)

// Import the context provider to share state across all components
import { ProjectProvider } from "./context/ProjectContext";

import "./styles/global.scss";

// ✅ Main App component: this sets up routing and wraps everything in context
export default function App() {
  return (
    // 🌐 Wrap the app in ProjectProvider so project-related context is globally available
    <ProjectProvider>
      {/* Set up React Router to handle browser navigation without full page reloads */}
      <BrowserRouter>
        {/* Define all the routes of the application */}
        <Routes>
          {/* Public route: login is outside the main layout */}
          <Route path="/login" element={<Login />} />

          {/* Main route with Layout wrapper — this becomes the base for all subroutes */}
          <Route path="/" element={<Layout />}>
            {/* 👇 Nested routes rendered inside <Outlet /> of Layout.jsx */}
            {/* Default route for "/" (i.e., homepage) */}
            <Route index element={<Project />} />
            {/* Other sections/tabs of the app */}
            <Route path="project" element={<Project />} />
            <Route path="budgets" element={<Budgets />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="payments" element={<PaymentOrders />} />
            <Route path="signatures" element={<Signatures />} />
            <Route path="recipients" element={<Recipients />} />
            <Route path="documents" element={<Documents />} />
            <Route path="statistics" element={<Statistics />} />
            <Route path="organizations" element={<Organizations />} />
            <Route path="register-project" element={<RegisterProject />} />{" "}
            {/* ✅ New page to register a project */}
            {/* Catch-all route (if user navigates to a non-existent route) */}
            <Route path="*" element={<NoPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProjectProvider>
  );
}

// 🧩 Mount the React app to the DOM
// This is the entry point that connects React with the HTML file (usually index.html)
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
