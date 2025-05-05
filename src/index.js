// Import React and ReactDOM
import ReactDOM from "react-dom/client";

// Import routing tools
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Import pages/components
import Layout from "./pages/Layout/Layout";
import Login from "./pages/Login/Login";
import Transactions from "./pages/Transactions/Transactions";
import Budgets from "./pages/Budgets/Budgets";
import Project from "./pages/Project/Project";
import Payments from "./pages/Payments/Payments";
import Signatures from "./pages/Signatures/Signatures";
import Recipients from "./pages/Recipients/Recipients";
import Documents from "./pages/Documents/Documents";
import NoPage from "./pages/NoPage/NoPage";

// Import the ProjectProvider to share project data across the app
import { ProjectProvider } from "./context/ProjectContext"; // 👈 Make sure path is correct

// Define and export App component
export default function App() {
  return (
    // Wrap the entire app in ProjectProvider so context is available globally
    <ProjectProvider>
      <BrowserRouter>
        <Routes>
          {/* Login page is separate and doesn’t use Layout */}
          <Route path="/login" element={<Login />} />

          {/* All other pages are nested inside the Layout */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Project />} />
            <Route path="project" element={<Project />} />
            <Route path="budgets" element={<Budgets />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="payments" element={<Payments />} />
            <Route path="signatures" element={<Signatures />} />
            <Route path="recipients" element={<Recipients />} />
            <Route path="documents" element={<Documents />} />
            <Route path="*" element={<NoPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProjectProvider>
  );
}

// Mount the app to the DOM
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
