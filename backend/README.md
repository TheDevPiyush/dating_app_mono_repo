# Pookiey Backend

Supabase-secured subscription and messaging API for the Pookiey dating ecosystem, built with Express, MongoDB, and Razorpay.

## Key Capabilities

- Supabase access-token verification via service role key
- MongoDB with Mongoose models for users, subscriptions, payments, matches, stories, and messaging
- REST APIs secured with bearer tokens
- Razorpay order creation and signature verification for plan purchases
- Structured payment logging and automatic subscription lifecycle updates
- Socket.io for realtime messaging (unchanged)

## Setup

### Prerequisites

- Node.js 18+
- MongoDB (local replica or Atlas cluster)
- Supabase project with email/password auth enabled
- Razorpay account (test keys are sufficient for sandbox mode)
- Existing AWS/S3 credentials if you are already using the media upload routes

1. Create a `.env` file (see variables below).
2. Install dependencies with `npm install`.
3. Start the API in watch mode via `npm run dev` (or `npm run build && npm start` for production).

### Environment Variables

```
PORT=6969
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/pookiey

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service-role-key-from-supabase

# Razorpay (test keys work for sandbox)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxx

# Existing env (if already configured)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=...
S3_BUCKET_NAME=...
```

## API Endpoints

### Health Check
- `GET /` - Basic API info
- `GET /health` - Health check with service status

### Authentication
All protected routes require the Supabase access token:
```
Authorization: Bearer <supabase-access-token>
```

## Project Structure

```
src/
├── config/               # Supabase, MongoDB, Razorpay configuration
├── controllers/          # Express route handlers
├── middleware/           # Supabase token verification
├── models/               # Mongoose schemas (Users, Subscription, PaymentTransaction, etc.)
├── routes/               # REST route definitions
├── services/             # Subscription/payment orchestration logic
└── index.ts              # Express bootstrap
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run the API in watch mode |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Launch compiled build |
| `npm run lint` | ESLint over `src/**/*.ts` |

## Subscription & Payment APIs

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/v1/subscriptions/plans` | Fetch available plan catalog (`basic`, `premium`, `super`) |
| `GET` | `/api/v1/subscriptions/current` | Returns the user's active subscription if present |
| `GET` | `/api/v1/subscriptions/payments` | Most recent payment attempts for the user |
| `POST` | `/api/v1/subscriptions/create-order` | Creates a Razorpay order and logs a `PaymentTransaction` document |
| `POST` | `/api/v1/subscriptions/verify` | Validates Razorpay signature, marks payment captured, and upserts `Subscription` |

## Data Model Changes

- `Subscription` model now supports the `basic`, `premium`, and `super` plans, tracks `lastPaymentAt`, and stores lightweight metadata for future analytics.
- New `PaymentTransaction` model logs every Razorpay order + payment lifecycle state.
- Both models are indexed on user id to keep lookups fast.

## Monitoring & Production Notes

- Razorpay errors are surfaced in the API response; consider piping them to your logging solution (e.g. Datadog, Sentry).
- Mongo collections now rely on additional indexes; run `npm run build` once before deploying to ensure Mongoose creates them.
- The architecture is provider-agnostic: plug in webhooks and retry strategies by extending `subscriptionService`...
