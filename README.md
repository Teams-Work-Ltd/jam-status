# Jam status

Independent public service status for [Jam](https://jam.teams.work/). Netlify serves the static site outside Jam's Cloudflare application path. GitHub stores the public status record and its review history.

The repository must contain only information suitable for immediate public release. Never add customer content, credentials, private provider links, workspace identifiers, security investigation detail or unreviewed personal data.

## Local checks

```sh
npm run check
npm run serve
```

The local preview uses `http://127.0.0.1:6174` by default. Set `PORT` to use another port.

## Publish an incident

Edit `public/status.json` in one focused commit:

1. Set `state` to `investigating` or `monitoring`.
2. Set `updatedAt` to the actual publication time in ISO 8601 UTC.
3. State the user-visible impact in `notice.affected`.
4. Give a safe, specific action in `notice.safeAction`.
5. Set `notice.nextUpdate` to the next promised update time during stated coverage.
6. Run `npm run check`, review the rendered page and push to `main`.

Do not estimate a recovery time without evidence. Provider status is context, not proof that Jam is affected or recovered.

## Update an incident

Update the state, factual summary, user action, `updatedAt` and `nextUpdate`. Preserve the same public incident title unless changing it materially improves clarity.

## Resolve an incident

1. Verify the affected Jam path and one unaffected boundary.
2. Add a resolved record to `public/incidents.json` with a unique public ID, title, summary, start time and resolution time.
3. Return `public/status.json` to `operational` and clear the incident-only fields to `null`.
4. Run `npm run check`, review the rendered page and push to `main`.

The private incident record remains outside this repository and follows Jam's operating procedure.

## Provider indicators

The page reads the public WorkOS and Cloudflare Statuspage feeds directly in the visitor's browser. It selects only the components Jam uses. Missing, changed or unavailable provider data is displayed as `Unknown`, never as `Operational`.

## Deployment

`netlify.toml` defines the primary Netlify static site and its security and cache headers. Netlify runs `npm run check` before publishing `public/`. Keep the generated `netlify.app` URL as an emergency fallback even when a custom domain is added.

`render.yaml` describes the temporary Render deployment created during provider evaluation. Render's public endpoint uses Cloudflare at the edge, so it is not the independent status route and should be removed after the Netlify deployment is verified.
