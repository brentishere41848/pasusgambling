<div align="center">
  <img width="1200" height="475" alt="Pasus banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Pasus Gambling

Pasus Gambling is a full-stack casino-style web platform built around a fast single-page frontend, an Express API, and a wallet/account system that supports gameplay, community features, promotions, and operator tooling from the same codebase. The repository contains the production application surface for `pasus.xyz`, including the player-facing experience, payment handling flows, staff controls, and the supporting server logic that keeps balances, activity, and account state in sync.

## Project Overview

This project is structured as a modern React + Vite frontend backed by a TypeScript Express server and PostgreSQL persistence. Rather than being a simple game demo, the codebase covers the larger platform layer around the games as well:

- account registration, login, verification, and active session handling
- persistent wallet balances with main, vault, tip, and bonus balance tracking
- deposit and withdrawal flows with NOWPayments integration
- affiliate rewards, claim flows, and custom referral codes
- VIP progression, rakeback-style rewards, daily bonuses, and promotional campaigns
- real-time style social systems such as chat, rain pools, custom rain, direct tipping, and friends
- owner and moderator-facing admin views for payments, support, promotions, analytics, and rain scheduling

## Gameplay Surface

The frontend includes a broad set of casino-style game views and engagement loops designed to feel like a complete platform instead of a single isolated mini-game. Current game modules in the repository include:

- Baccarat
- Blackjack
- Coinflip
- Crash
- Dice
- HiLo
- Jackpot
- Keno
- Limbo
- Mines
- Roulette
- Scratch
- Slots
- Wheel

Gameplay activity is also connected back into the wider product. Bets feed recent activity, wallet movement, leaderboards, VIP progression, rain eligibility, and profile-facing history so the app feels cohesive across views.

## Player Experience

The user-facing application goes beyond just placing wagers. The main client includes:

- a dashboard with featured games, live activity, and wallet-aware navigation
- profile pages with stats, identity settings, linked accounts, and session visibility
- wallet interfaces for deposits, withdrawals, ledger review, transfer actions, and bonus tracking
- leaderboard and tournament views that surface competitive progression
- provably fair screens and seed/nonce handling for transparency-related flows
- support and legal pages integrated directly into the application
- onboarding and account-state UX for returning and newly created users

There is also a heavier community layer than most starter gambling repos. Users can join public chat, watch or contribute to rain events, create custom rain pools, send tips, manage friends, and keep track of account-linked social interactions from inside the same shell.

## Payments, Wallets, and Rewards

The server-side payment and wallet logic is one of the most important parts of the project. From the code in `server/index.ts` and `server/routes/walletPayments.ts`, the platform supports:

- authenticated wallet retrieval and balance synchronization
- crypto deposit creation and transaction polling through NOWPayments
- withdrawal requests with fee and net amount handling
- internal wallet transfers between main, vault, and tip balances
- payment ledger history for deposits, withdrawals, promo credits, affiliate claims, and tipping
- deposit bonus campaigns with wagering requirements and progress tracking

On top of this, the broader app layer includes daily rewards, VIP level rewards, reload-style benefits, rain distribution, affiliate commission accumulation, and owner-side wallet adjustment tools.

## Community and Retention Systems

Pasus is built with retention and community loops as first-class features. The codebase includes:

- public chat with mentions, reactions, and role-aware presentation
- scheduled rain pools and custom rain rounds
- friend requests, friend chat, and direct friend tipping
- affiliate dashboards with claimable earnings
- tournaments and leaderboards
- notifications, support threads, and broadcast messaging

These features are tightly linked to wallet state, account roles, and activity tracking, which is why the repository is much closer to a complete platform implementation than a UI mockup.

## Admin and Operations

The repository also ships the internal surfaces needed to operate the platform. The admin tooling exposed in the frontend and backed by the API covers:

- payment review and withdrawal handling
- user inspection and moderation support
- analytics and platform health visibility
- support thread management
- promo and broadcast controls
- rain schedule management and live rain configuration
- role-aware separation between owner-only and moderator-visible actions

This makes the project useful not just as a player-facing application, but as an operator console for the service itself.

## Technical Shape

At a high level, the repository is organized around:

- `src/` for the main React application, route-level views, shared contexts, and game components
- `server/` for the Express API, auth, wallet/payment routes, rain systems, friends, tournaments, and database-backed business logic
- `public/` and `dist/` for static assets and built frontend output
- deployment configuration for environments such as Wasmer, Render, and Vercel

The stack visible in the repository includes React 19, Vite, TypeScript, Express, PostgreSQL, Tailwind-based styling, JWT authentication, and Resend/NOWPayments integrations.

## Repository Purpose

This repository is the application source for Pasus, not a generic starter template. It exists to house the branded frontend, platform logic, payments infrastructure, promotional systems, and internal tooling that together define the Pasus release. The current code shows a product that is intended to be run as a live service with real account state, real transaction flows, and a persistent progression/community layer.

## Notes

- The README is intentionally product-focused and avoids setup walkthroughs.
- Environment-specific secrets and payment credentials are expected to be provided outside the repository.
- Production behavior depends on external services such as PostgreSQL, NOWPayments, email delivery, and deployed frontend/API hosts.
