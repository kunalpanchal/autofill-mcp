import { useState } from "react";
import { FormSyncButton } from "@kunalpanchal/formsync-react";
import { demoFillers, productHuntSchema } from "../schemas.js";

export function ProductHunt() {
  const [log, setLog] = useState("Waiting for Fill with AI…");
  return (
    <main className="page">
      <div>
        <p className="eyebrow">Demo · explicit JSON Schema</p>
        <h1>Launch on Product Hunt</h1>
        <p className="lede">
          This form ships a JSON Schema to FormSync. Click Fill with AI — the demo uses an in-page
          mock assistant so you can try the approval flow without a local MCP host.
        </p>
      </div>
      <form id="product-hunt-form" className="card" onSubmit={(e) => e.preventDefault()}>
        <label>
          Product name
          <input name="projectName" />
        </label>
        <label>
          Tagline
          <input name="tagline" maxLength={60} placeholder="60 characters max" />
        </label>
        <label>
          Description
          <textarea name="description" rows={5} />
        </label>
        <label>
          Repository URL
          <input name="repoUrl" type="url" />
        </label>
        <label>
          Logo URL
          <input name="logoUrl" type="url" />
        </label>
        <label>
          Tech stack (comma-separated)
          <input name="techStack" />
        </label>
        <div className="form-actions">
          <FormSyncButton
            targetForm="#product-hunt-form"
            schema={productHuntSchema}
            context={{ hint: "The user is filling a Product Hunt listing.", siteName: "Product Hunt" }}
            transports={["mock"]}
            mockFiller={demoFillers.productHunt}
            onSuccess={(data) => setLog(`Filled: ${JSON.stringify(data)}`)}
            onError={(err) => setLog(err.message)}
          />
          <button type="submit" className="secondary">
            Publish
          </button>
        </div>
      </form>
      <p className="log" data-testid="fill-log">
        {log}
      </p>
    </main>
  );
}
