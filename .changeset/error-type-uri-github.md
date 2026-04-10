---
"hono-cf-access": minor
---

errors: move `type` URIs in Problem Detail responses from the unclaimed `hono-cf-access.dev` domain to `github.com/paveg/hono-cf-access` repository anchors. The previous base URL was not provably owned by the project, exposing downstream error-doc consumers to a potential typosquatting impersonation if a third party registered the domain. The new URIs are hosted on the GitHub repository README and remain dereferenceable via auto-generated heading anchors (`#country-denied`, `#asn-denied`, `#maintenance`, `#cf-unavailable`). Clients that hard-code the old URL strings will need to update.
