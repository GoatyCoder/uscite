<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/74f8badc-f7a2-413e-a888-6c87f8e61bdd

## Run locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in `.env.local`
3. Run the app:
   `npm run dev`

## Deploy on GitHub Pages

This repository now includes a workflow that builds Vite and deploys the `dist/` output to Pages:

- Workflow file: `.github/workflows/deploy-pages.yml`
- Trigger: push on `main` (or manual run)

### Required GitHub settings

1. Go to **Settings → Pages**.
2. In **Build and deployment**, select **Source: GitHub Actions**.

> If you publish the repository root directly (without build), GitHub serves the source `index.html` with
> `<script type="module" src="/src/main.tsx"></script>`, which results in a white page in production.
