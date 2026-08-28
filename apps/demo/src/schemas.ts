import type { JsonSchema } from "@formsync/core";

export const productHuntSchema: JsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Product Hunt Listing",
  type: "object",
  properties: {
    projectName: { type: "string", description: "Name of the product or project" },
    tagline: { type: "string", maxLength: 60, description: "Short catchy headline" },
    description: { type: "string", description: "Detailed summary of key features" },
    repoUrl: { type: "string", format: "uri", description: "Public GitHub/GitLab link" },
    logoUrl: { type: "string", format: "uri", description: "Direct URL to logo or favicon" },
    techStack: {
      type: "array",
      items: { type: "string" },
      description: "List of core technologies used",
    },
  },
  required: ["projectName", "tagline", "description"],
};

export const githubRepoSchema: JsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Create a new repository",
  type: "object",
  properties: {
    name: { type: "string", description: "Repository name" },
    description: { type: "string", maxLength: 350, description: "Short description" },
    visibility: { type: "string", enum: ["public", "private"], description: "Who can see this repository" },
    gitignore: { type: "string", description: "gitignore template language" },
    license: { type: "string", description: "SPDX license id" },
    initializeReadme: { type: "boolean", description: "Add a README" },
  },
  required: ["name"],
};

export const jobSchema: JsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Software engineer application",
  type: "object",
  properties: {
    fullName: { type: "string", description: "Applicant full name" },
    email: { type: "string", format: "email" },
    role: { type: "string", description: "Role you are applying for" },
    yearsExperience: { type: "number", minimum: 0, maximum: 40 },
    portfolioUrl: { type: "string", format: "uri" },
    coverLetter: { type: "string", description: "Short cover letter tailored to the role" },
    remote: { type: "boolean", description: "Open to remote work" },
  },
  required: ["fullName", "email", "coverLetter"],
};

export const demoFillers = {
  productHunt: () => ({
    projectName: "FormSync",
    tagline: "Local AI that fills web forms",
    description:
      "FormSync lets a site add one Fill with AI button. Your assistant reads a JSON Schema, pulls context from local files, and returns structured values — never raw DOM or browser control.",
    repoUrl: "https://github.com/kunalpanchal/autofill-mcp",
    logoUrl: "https://github.com/favicon.ico",
    techStack: ["TypeScript", "MCP", "React"],
  }),
  github: () => ({
    name: "formsync",
    description: "WebMCP form automation: schema in, structured JSON out.",
    visibility: "public",
    gitignore: "Node",
    license: "MIT",
    initializeReadme: true,
  }),
  job: () => ({
    fullName: "Alex Rivera",
    email: "alex@example.com",
    role: "Staff software engineer",
    yearsExperience: 8,
    portfolioUrl: "https://github.com/example",
    coverLetter:
      "I build agent-safe tooling at the boundary of browsers and local models. FormSync is a structured alternative to giving an assistant full browser control.",
    remote: true,
  }),
};
