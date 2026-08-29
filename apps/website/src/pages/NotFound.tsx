import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <article>
      <p className="kicker">404</p>
      <h1>This page is not in the docs.</h1>
      <p className="lede">The link may be outdated. Start from the overview or the examples.</p>
      <div className="actions">
        <Link className="btn" to="/">
          Overview
        </Link>
        <Link className="btn-ghost" to="/examples">
          Examples
        </Link>
      </div>
    </article>
  );
}
