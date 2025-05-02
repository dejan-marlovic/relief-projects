import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

export default function App() {
  return (
    <BrowserRouter>
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
          <Route path="*" element={<NoPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
