# Flyer Watch

Multi-user supermarket flyer watcher for Vancouver BC. The web app renders
Postgres-cached flyer data only; the worker owns scraping, cache warming, vision
extraction, and SMTP email digests.

## Local setup

```sh
corepack enable
pnpm install
pnpm build
```

For local development with Postgres:

```sh
docker compose -f compose.yaml -f compose.local.yaml up --build
```

The web app runs on port `3000`; the worker listens for warm jobs and runs a
periodic sweep.

## Required environment

- `DATABASE_URL`
- `PUBLIC_BASE_URL`
- `SESSION_SECRET`
- `CONSENTKEYS_ISSUER_URL`
- `CONSENTKEYS_CLIENT_ID`
- `CONSENTKEYS_CLIENT_SECRET`
- `MAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`

Optional SMTP environment:

- `SMTP_SECURE`

Optional vision environment for Sungiven:

- `VISION_BASE_URL`
- `VISION_MODEL`
- `VISION_API_KEY`

Production uses Defang's `x-defang-llm` model provider, which deploys an
OpenAI-compatible gateway to Bedrock. The default production model is
`qwen.qwen3-vl-235b-a22b`; `VISION_API_KEY` defaults to the gateway token and
does not need to be a Bedrock API key.

## Notes

Flipp support uses an unofficial endpoint. It is isolated behind the shared
`FlyerSource` interface, cached, and treated as best-effort because it may change
or stop working without notice.
