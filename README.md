# Digital Threat Detection System

A comprehensive AI-powered cybersecurity digital threats analysis platform designed to help Filipinos identify, understand, and protect themselves from all types of digital threats including phishing, deepfakes, social engineering, financial fraud, and emerging cyber threats.

## Features

- **Multi-Modal Threat Detection**: Analyze text, images, audio, and video content for potential threats
- **AI-Powered Analysis**: Leverages Google's Gemini 2.0 for advanced threat detection
- **Comprehensive Rate Limiting**: Multi-layer protection with per-minute, per-day, and burst limiting
- **Filipino-Focused**: Tailored for local context, languages, and common threat patterns
- **Educational Content**: Provides detailed explanations and prevention tips
- **Real-Time Analysis**: Instant threat assessment and risk scoring
- **Comprehensive Coverage**: Detects phishing, deepfakes, social engineering, financial fraud, and more
- **Smart Caching**: Intelligent response caching for improved performance
- **Robust Error Handling**: Graceful fallbacks and comprehensive error management

## Getting Started

First, set up your environment variables:
```bash
# Create a .env file in the root directory
GEMINI_API_KEY=your_gemini_api_key_here
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Rate Limiting

The system implements comprehensive rate limiting for all Gemini 2.0 models:

- **Per-minute limits**: 10-15 requests depending on model
- **Per-day limits**: 1,000-1,500 requests depending on model  
- **Burst protection**: 3-5 requests per 10-second window
- **Global system limits**: 10x individual limits for system protection

Rate limiting includes proper HTTP headers (`X-RateLimit-*`) and graceful error handling. See [RATE_LIMITING.md](./RATE_LIMITING.md) for detailed documentation.

### Testing Rate Limits

```bash
node test-rate-limiting.js
```

## Caching System

Smart response caching reduces API calls and improves performance. See [CACHING.md](./CACHING.md) for details.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
