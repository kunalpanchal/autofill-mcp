import { useState } from "react";
import { FormSyncButton } from "@formsync/react";
import { demoFillers, githubRepoSchema } from "../schemas.js";

export function GitHubRepo() {
  const [log, setLog] = useState("Waiting for Fill with AI…");
  return (
    <main className="page">
      <div>
        <p className="eyebrow">Demo · selects, radios, checkboxes</p>
        <h1>Create a GitHub repository</h1>
        <p className="lede">FormSync writes native values and dispatches input/change so React state stays in sync.</p>
      </div>
      <form id="github-form" className="card" onSubmit={(e) => e.preventDefault()}>
        <label>
          Repository name
          <input name="name" required />
        </label>
        <label>
          Description
          <input name="description" maxLength={350} />
        </label>
        <fieldset>
          <legend>Visibility</legend>
          <label className="inline">
            <input type="radio" name="visibility" value="public" /> Public
          </label>
          <label className="inline">
            <input type="radio" name="visibility" value="private" /> Private
          </label>
        </fieldset>
        <label>
          gitignore template
          <select name="gitignore">
            <option value="">None</option>
            <option value="Node">Node</option>
            <option value="Python">Python</option>
            <option value="Go">Go</option>
          </select>
        </label>
        <label>
          License
          <select name="license">
            <option value="">None</option>
            <option value="MIT">MIT</option>
            <option value="Apache-2.0">Apache-2.0</option>
          </select>
        </label>
        <label className="inline">
          <input type="checkbox" name="initializeReadme" /> Add a README
        </label>
        <div className="form-actions">
          <FormSyncButton
            targetForm="#github-form"
            schema={githubRepoSchema}
            context={{ hint: "Creating a GitHub repository for the current project." }}
            transports={["mock"]}
            mockFiller={demoFillers.github}
            onSuccess={(data) => setLog(`Filled: ${JSON.stringify(data)}`)}
          />
          <button type="submit" className="secondary">
            Create repository
          </button>
        </div>
      </form>
      <p className="log" data-testid="fill-log">
        {log}
      </p>
    </main>
  );
}
