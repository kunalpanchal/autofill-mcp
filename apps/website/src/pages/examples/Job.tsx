import { useState } from "react";
import { FormSyncButton } from "@kunalpanchal/formsync-react";
import { exampleFillers, jobSchema } from "../../examples/schemas.js";

export function JobExample() {
  const [log, setLog] = useState("Waiting for Fill with AI...");
  const [noHost, setNoHost] = useState(false);
  return (
    <article>
      <p className="kicker">Example · inferred schema and missing-host UI</p>
      <h1>Staff engineer application</h1>
      <p className="lede">
        Leave the schema off and FormSync infers fields from labels. Toggle simulate offline to
        see the connect modal when no MCP host is running.
      </p>
      <form id="job-form" className="card" aria-label="Job application" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="fullName">Full name</label>
        <input id="fullName" name="fullName" required />
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required />
        <label htmlFor="role">Role</label>
        <input id="role" name="role" />
        <label htmlFor="yearsExperience">Years of experience</label>
        <input id="yearsExperience" name="yearsExperience" type="number" min={0} max={40} />
        <label htmlFor="portfolioUrl">Portfolio URL</label>
        <input id="portfolioUrl" name="portfolioUrl" type="url" />
        <label htmlFor="coverLetter">Cover letter</label>
        <textarea id="coverLetter" name="coverLetter" rows={6} required />
        <label className="inline">
          <input type="checkbox" name="remote" /> Open to remote
        </label>
        <label className="inline">
          <input
            type="checkbox"
            checked={noHost}
            onChange={(e) => setNoHost(e.target.checked)}
          />{" "}
          Simulate offline (no AI host)
        </label>
        <div className="form-actions">
          <FormSyncButton
            targetForm="#job-form"
            schema={noHost ? undefined : jobSchema}
            transports={noHost ? [] : ["mock"]}
            mockFiller={exampleFillers.job}
            context={{ hint: "Job application for a staff engineer role." }}
            onSuccess={(data) => setLog(`Filled: ${JSON.stringify(data)}`)}
            onError={(err) => setLog(err.message)}
          />
          <button type="submit" className="secondary">
            Submit application
          </button>
        </div>
      </form>
      <p className="log">{log}</p>
    </article>
  );
}
