# Firebase Studio

This is a Next.js starter in Firebase Studio.

## Environment Variables

AI features require a Google Generative Language API key. Copy `.env.example` to `env.local` (or `.env.local`) and provide:

```
GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY_HERE
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY_HERE
```

Security notice:
- Do not hardcode secrets. Use `.env.local` for local dev (already gitignored).
- Rotate and revoke any exposed keys in Google Cloud Console (APIs & Services).
- Review Firebase/Google API usage logs for suspicious activity.

The server will read this key at runtime to enable address suggestions and CSV normalization.

## Development

Install dependencies and run the development server:

```
npm install
npm run dev
```

Run tests and checks before committing:

```
npm test
npm run lint
npm run typecheck
```

To get started, take a look at `src/app/page.tsx`.
