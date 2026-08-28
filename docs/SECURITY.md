# Security boundaries

FormSync is designed so a website can request structured help from a user's local assistant without granting that assistant a browser session.

## What the assistant can see

- The JSON Schema (field names, types, descriptions, constraints)
- Optional context hints supplied by the site (`siteName`, `hint`)
- Page URL/title/origin
- Local files the *user's* MCP host reads (`package.json`, README, git remotes, explicit file paths for uploads)

## What the assistant cannot do

- Read or write arbitrary DOM
- Move the mouse, click, or run Chrome DevTools Protocol
- Navigate, attach cookies, or hold the user's authenticated session
- Push values into a form without the in-page approval diff (unless the embedder sets `requireApproval={false}`)

## Network

The local bridge binds **127.0.0.1:3737** by default. It is not advertised on LAN interfaces unless you pass `--host`. CORS is open on localhost so any origin can ask; the user still has to click Fill with AI on that origin and approve the payload.

File uploads: the MCP tool `fill_web_form` may include a local `path`. The host reads the file, encodes a data URL, and the page reconstructs a `File` via `DataTransfer`. Paths are not sent to the website.

## Validation

Returned JSON is checked with Ajv (draft-2020-12 + formats) before the approval UI. Over-length strings and invalid URIs trigger `formsync/validationError` retries rather than silent truncation.
