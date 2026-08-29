import { NavLink, Route, Routes } from "react-router-dom";
import { Home } from "./pages/Home.js";
import { Owners } from "./pages/Owners.js";
import { Fillers } from "./pages/Fillers.js";
import { Examples } from "./pages/Examples.js";
import { NotFound } from "./pages/NotFound.js";
import { ProductHuntExample } from "./pages/examples/ProductHunt.js";
import { GitHubExample } from "./pages/examples/GitHub.js";
import { JobExample } from "./pages/examples/Job.js";

const REPO = "https://github.com/kunalpanchal/autofill-mcp";

export function App() {
  return (
    <div className="layout">
      <header className="mast">
        <NavLink to="/" className="brand">
          FormSync
        </NavLink>
        <a className="repo" href={REPO} rel="noreferrer">
          GitHub
        </a>
      </header>
      <div className="frame">
        <nav className="rail" aria-label="Docs">
          <p className="rail-label">Guide</p>
          <NavLink to="/" end>
            Overview
          </NavLink>
          <NavLink to="/owners">Site owners</NavLink>
          <NavLink to="/fillers">Form fillers</NavLink>
          <p className="rail-label">Try it</p>
          <NavLink to="/examples" end>
            Examples
          </NavLink>
          <NavLink to="/examples/product-hunt">Product Hunt</NavLink>
          <NavLink to="/examples/github">GitHub repo</NavLink>
          <NavLink to="/examples/job">Job application</NavLink>
          <p className="rail-label">Source</p>
          <a href={`${REPO}/blob/main/docs/PROTOCOL.md`}>Protocol</a>
          <a href={`${REPO}/blob/main/docs/SECURITY.md`}>Security</a>
        </nav>
        <div className="stage">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/owners" element={<Owners />} />
            <Route path="/fillers" element={<Fillers />} />
            <Route path="/examples" element={<Examples />} />
            <Route path="/examples/product-hunt" element={<ProductHuntExample />} />
            <Route path="/examples/github" element={<GitHubExample />} />
            <Route path="/examples/job" element={<JobExample />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
