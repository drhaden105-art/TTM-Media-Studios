# TTM Media Studios — AI sermon analysis setup

The site is hosted on GitHub Pages. GitHub Pages is static hosting, so the Gemini API key must **never** be placed in `index.html` or any other public repository file.

## What this adds

The Sermon workspace has an **AI: Watch Sermon & Generate Title** button. It sends a public YouTube URL to a small Cloudflare Worker. The Worker calls Google's Gemini video-understanding API, which analyzes the video's audio and visual stream, and returns a title, short message summary, any confidently identified scripture references, and a thumbnail background theme.

Only public YouTube videos are supported by Gemini's YouTube URL input. Private and unlisted videos are not supported by this method.

## Adult administrator setup required

A parent/guardian or authorized church administrator should complete the following. Do not post API keys in GitHub, chat, screenshots, or website code.

1. Create a Cloudflare account and a Worker named `ttm-sermon-analysis`.
2. Deploy the code in `api/worker.js` as the Worker script.
3. In the Worker settings, add a secret named `GEMINI_API_KEY` containing the Gemini API key. Keep it as a Worker secret, not a plain-text variable.
4. Add a Cloudflare rate limit to the Worker route/endpoint to prevent unexpected usage.
5. Copy the Worker HTTPS URL (for example, `https://ttm-sermon-analysis.<account>.workers.dev`).
6. In `index.html`, set `SERMON_ANALYSIS_API` to that Worker URL, commit the change, and wait for GitHub Pages to publish.

The Worker already restricts browser requests to the official GitHub Pages origin for this project. Origin checks are not a replacement for rate limiting.

## Test

- Open the public TTM Media Studios site.
- Go to Sermon.
- Paste a **public** YouTube sermon link.
- Click **AI: Watch Sermon & Generate Title**.
- Wait for analysis. The title will populate the Sermon title field, and the summary/scriptures/theme will appear below the button.
- Review the title before using it in the thumbnail.

## Important limitations

- The Worker is not deployed by GitHub Pages. Creating this file in the repository does not activate the service.
- The frontend endpoint is intentionally blank until the Worker has been deployed and its URL is configured.
- Gemini's YouTube URL input currently supports public videos only. Provider limits, availability, and pricing may change; the administrator should review Google's current Gemini API terms and usage limits before enabling it.
- AI-generated titles and scripture references should be checked by the preacher or media director before publication.
