# K9CREST - K9 Trials Tracker

Professional K9 trials tracking and scoring application.

## Environment Variables

AI features require a Google Generative Language API key. Copy `.env.example` to `env.local` (or `.env.local`) and provide:

```
GOOGLE_API_KEY=your_api_key_here
```

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
