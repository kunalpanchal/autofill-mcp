import { NavLink, Route, Routes } from "react-router-dom";
import { Home } from "./pages/Home.js";
import { ProductHunt } from "./pages/ProductHunt.js";
import { GitHubRepo } from "./pages/GitHubRepo.js";
import { JobApplication } from "./pages/JobApplication.js";

export function App() {
  return (
    <div className="shell">
      <header className="top">
        <NavLink to="/" className="brand">
          FormSync
        </NavLink>
        <nav>
          <NavLink to="/product-hunt">Product Hunt</NavLink>
          <NavLink to="/github">GitHub repo</NavLink>
          <NavLink to="/jobs">Job application</NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/product-hunt" element={<ProductHunt />} />
        <Route path="/github" element={<GitHubRepo />} />
        <Route path="/jobs" element={<JobApplication />} />
      </Routes>
    </div>
  );
}
