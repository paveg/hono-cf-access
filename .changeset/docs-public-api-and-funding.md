---
"hono-cf-access": patch
---

docs: surface `BlockConfigError` and `extractCfInfo` public exports in the
README so they are discoverable from the npm package page. `BlockConfigError`
documentation now covers the full set of throw conditions
(`deny`/`allow` both, neither, or empty array) and the `middleware`
property used to identify the offending caller; `extractCfInfo` is
documented as the manual escape hatch for reading `CfInfo` without
applying a block.

Also adds a `funding` field pointing to GitHub Sponsors and an
`llms.txt` index at the repository root for LLM-assisted navigation.
No API or runtime change.
