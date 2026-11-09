# Security policy

## Supported versions

Only the latest release on the `main` branch is supported. Fixes are not backported.

| Version | Supported |
|---|---|
| 1.0.x | Yes |
| Older | No |

## Reporting a vulnerability

Please report security problems privately. Do not open a public issue or pull request.

Use GitHub's private reporting: open the **Security** tab of the repository and choose **Report a vulnerability**. If that is not available to you, contact the maintainer through the link on [their site](https://suyashvjain.web.app/).

Include what you found, how to reproduce it, and the impact you see. You can expect an acknowledgement within a few days. Please give a reasonable time to fix the problem before you share details publicly.

## Please do not include secrets

Never paste API keys, tokens, passwords, `.env` contents or other people's data into an issue, a pull request or a report. If you find a real secret in the repository or its history, say where it is without copying it, and the maintainer will rotate it.

## Scope

In scope: the code in this repository, including the API, the web app and the SQL in `docs/migrations`. Out of scope: the hosting providers and third-party services Prepwise uses, which have their own disclosure processes.
