# Flashcard Mobile App — Technical Documents

This document provides an in-depth look at the mobile app’s architecture, libraries, project structure, and how core features are implemented and executed. It is intended for developers who will build, debug, or extend the app.

## Overview
- App: React Native (Expo) client for the Flashcard backend at `https://flashcard-rs95.onrender.com`.
- Goals: Fast UX for default content, accurate personal data, robust review workflows, and resilient networking with clear UI feedback (haptics, alerts, placeholders, modals).

## Libraries And Their Uses
- Navigation
  - `@react-navigation/native`, `@react-navigation/stack`, `@react-navigation/bottom-tabs`: Tabs and stacks per flows (Explore, My Decks, Account).
- Data Fetching / Cache
  - `@tanstack/react-query`: Queries, mutations, cache invalidation, background refetch.
  - `@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister`: Persist query cache into AsyncStorage (static content) for fast startup.
  - `@react-native-async-storage/async-storage`: Local key-value storage.
- HTTP & Auth
  - `axios`: API client with interceptors for token injection and global 401 handling.
  - `expo-secure-store`: Secure storage for JWT.
- UI/UX & System
  - `react-native-svg`: Vector rendering for custom charts.
  - `expo-haptics`: Haptic feedback on user actions.
  - `expo-image-picker`: Image selection for upload.
  - `react-native-screens`, `react-native-safe-area-context`, `react-native-gesture-handler`, `react-native-reanimated`: Performance and gestures.
- Build/Runtime
  - `expo`, `expo-dev-client`, EAS: Development and builds.

## Project Structure
- `src/components/`
  - `screens/`
    - `DashboardScreen.tsx`: Explore default decks.
    - `DefaultDeckDetailScreen.tsx`: Default deck detail + card list.
    - `DefaultCardDetailScreen.tsx`: Default card detail + Save to personal deck.
    - `DefaultDeckReviewScreen.tsx`: Default review (flashcard-only preview).
    - `MyDecksScreen.tsx`: Personal deck list + card search.
    - `MyDeckDetailScreen.tsx`: Deck detail + CRUD cards + review entry.
    - `MyCardDetailScreen.tsx`: Personal card detail (image, archive toggle, edit/delete).
    - `MyDeckReviewSetupScreen.tsx`: Configure counts per review method.
    - `MyDeckReviewScreen.tsx`: Run a review session; collect stats.
    - `MyDeckReviewSummaryScreen.tsx`: Summary chart + totals + Back to Deck.
    - `LoginScreen.tsx`, `RegisterScreen.tsx`: Auth screens.
    - `UserScreen.tsx`: Account/profile + change password + delete.
  - `common/`
    - `ModalBase.tsx`: Shared modal shell.
    - `LabeledInput.tsx`: Styled input with label + error.
    - `DismissKeyboardView.tsx`: Tap outside to dismiss keyboard.
    - `WakeServerModalGate.tsx`: Shows a “server waking up” modal if ping > 2s.
  - `charts/`
    - `GroupedBarChart.tsx`: Reusable grouped bar chart (SVG).
- `src/navigation/RootNavigator.tsx`: Tabs and stacks wiring, green headers.
- `src/context/AuthContext.tsx`: Auth state, profile hydration, cache clearing.
- `src/services/`
  - `api.ts`: Axios instance + interceptors + `pingServer()` helper.
  - `query.tsx`: React Query client + persistence + `clearQueryCachePersist()`.
  - `image.ts`: Cloudinary transform helper + `DEFAULT_CARD_IMAGE_URL`.
  - `queryKeys.ts`: Centralized query keys.
- `src/themes/colors.ts`: Color palette.
- `App.tsx`: Providers + initial silent ping.

## Navigation
- Tabs: Explore, My Decks, Account.
- Stacks: Per tab; example in My Decks stack:
  - `MyDecksList → MyDeckDetail → MyCardDetail`
  - `MyDeckReviewSetup → MyDeckReview → MyDeckReviewSummary`
- Headers: Styled in `RootNavigator.tsx` (green background, compact height feel, bold title).

## Networking & Auth
- `services/api.ts`
  - Base URL: `https://flashcard-rs95.onrender.com`.
  - Request interceptor injects `Authorization: Bearer <token>` from SecureStore.
  - Response interceptor clears invalid token on 401.
  - `pingServer()`: GET `/` with timeout to wake free hosting.
- `context/AuthContext.tsx`
  - Loads token from SecureStore on boot; fetches `/api/users/profile` to hydrate `user` (includes email).
  - `login(...)`: Stores token, then fetches profile; `register(...)` auto-logs in.
  - `logout()`: Clears token, user, AND React Query cache + persisted storage via `clearQueryCachePersist()`.

## Data Fetching, Cache & Invalidation
- Query keys in `services/queryKeys.ts` for consistency.
- Default decks/cards (static): Long `staleTime`, persisted to AsyncStorage for fast dashboard loads.
- Personal data (decks, cards): Freshness prioritized; general refetch on mount and invalidation after mutations.
- Examples:
  - After creating a card: invalidate `deck-cards`, `deck`, `search-cards`.
  - After changing image or archive: invalidate `card`, `deck-cards`, `search-cards`.
  - After delete deck/card: invalidate relevant lists and details.

## UI Feedback & Haptics
- Haptics on selection, warnings, and success.
- Clear alerts for success/error (e.g., “Card removed successfully”).
- Pull-to-refresh on card detail to refetch.
- Wake-up modal: On first app open or when landing on key screens, shows modal if ping > 2s (with haptics) to explain delay on free hosting.

## Images & Uploads
- Default card image: `DEFAULT_CARD_IMAGE_URL` aligned with backend schema default.
- New card creation omits `url` when input is blank to allow backend default to apply.
- Cloudinary transforms via `transformCloudinary(url, { w, q, f })` for optimized fetch.
- Upload flow uses multipart/form-data with `expo-image-picker`.

## Feature-to-Code Mapping

### Explore Default Content
- List default decks: `DashboardScreen.tsx`
  - Query: `queryKeys.defaultDecks(page, limit)` calling `/api/default-decks`.
  - Renders 2-column grid; card press → `DefaultDeckDetail`.
- Default deck detail: `DefaultDeckDetailScreen.tsx`
  - Queries deck info + paginated cards.
  - Actions: Clone to personal; Start Review (default preview).
- Default card detail: `DefaultCardDetailScreen.tsx`
  - Renders image/definition/hint/categories/examples.
  - “Save to your deck”: opens user deck list, POST `/api/decks/:deckId/cards/from-default`, invalidates relevant queries.

### Personal Decks & Cards
- My Decks list + search: `MyDecksScreen.tsx`
  - `GET /api/decks` (refetch on mount to avoid stale across logout/login).
  - Live search: `GET /api/cards/search` with debounce + pagination.
- My Deck detail: `MyDeckDetailScreen.tsx`
  - Deck info + list of cards with pagination.
  - Create/Edit/Delete card modal.
  - Create card auto-navigates to `MyCardDetail` using created `_id` from response.
  - Delete shows success alert + haptics; invalidates deck, cards, search queries.
  - Start Review → `MyDeckReviewSetup`.
- My Card detail: `MyCardDetailScreen.tsx`
  - Renders details + default image fallback.
  - Change image (upload + immediate PATCH).
  - Archive toggle with invalidations.
  - Edit/Delete actions inline (modal for edit). Delete: success/haptics + back.

### Review Session (Personal)
- Setup: `MyDeckReviewSetupScreen.tsx`
  - User enters counts for Flashcard, MCQ, Fill; requests session plan.
- Run: `MyDeckReviewScreen.tsx`
  - Merges queues (no duplicates) and steps through items.
  - Flashcard:
    - Flip/hint; on submit, POST `/api/cards/:id/review` with `{ retrievalLevel: 'easy'|'medium'|'hard', hintWasShown }`.
    - Tracks stats per-level: `easy`, `medium`, `hard`.
  - MCQ:
    - Presents options; tracks `correct` / `wrong` and submits review for personal decks.
  - Fill in the Blank:
    - Normalizes input and compares to correct answer; tracks `correct` / `wrong` and submits review.
  - Archive candidates:
    - Based on returned frequency (e.g., mastered), can batch-mark `isArchived: true` at session end (modal).
  - Exit handling:
    - “Exit” at any point → navigate to summary with current `stats` and `totals`.
    - Finish (with/without archive modal) → navigate to summary.
- Summary: `MyDeckReviewSummaryScreen.tsx`
  - Chart: `GroupedBarChart.tsx`.
    - Flashcard rows show `Easy`, `Medium`, `Hard` bars only when present.
    - MCQ/Fill rows show `Correct`, `Wrong` bars only when present.
    - Zero-value bars are not rendered; numeric labels appear only for > 0.
    - Legend includes only series used by included methods and wraps into multiple rows.
    - Increased inner margins to avoid text clipping.
  - Totals: Shows per-method done/planned; flashcard breakdown displayed.
  - “Back to Deck”: Navigates to `MyDeckDetail` with `deckId`.

## Execution Examples (End-to-End)

### 1) Create a Card and Auto-Enter It
- UI path: My Decks → Select a deck → “+ Add Card”
- Code path:
  - `MyDeckDetailScreen.tsx` → `upsertCard()`:
    - POST `/api/decks/:deckId/cards` with payload (omitting `url` when blank).
    - On success, grab `data._id` and `navigation.navigate('MyCardDetail', { cardId })`.
    - Invalidate `deck-cards`, `deck`, `search-cards`.
  - `MyCardDetailScreen.tsx`
    - Pull-to-refresh available; default image shows if URL is missing.

### 2) Delete a Card
- UI path: My Deck detail → Row action Delete OR Card Detail → Delete
- Code path:
  - `MyDeckDetailScreen.tsx` / `MyCardDetailScreen.tsx` → DELETE `/api/cards/:id`.
  - Haptics success + alert “Card removed successfully”.
  - Invalidate `deck-cards`, `deck`, `search-cards`; navigate back if on Card detail.

### 3) Review and View Summary
- UI path: My Deck detail → Start Review → Setup → Review → Summary
- Code path:
  - `MyDeckReviewSetupScreen.tsx`: Gathers counts, requests session, then `navigation.replace('MyDeckReview', { deckId, session })`.
  - `MyDeckReviewScreen.tsx`: Presents items; submits review for personal cards; tracks stats (flashcard: level; mcq/fill: correct/wrong). On exit/finish, navigates to summary with `{ deckId, stats, totals }`.
  - `MyDeckReviewSummaryScreen.tsx`: Builds chart data dynamically for included methods; shows totals; “Back to Deck” navigates to deck detail.

### 4) Wake-Up Modal (Free Hosting)
- First app open or landing on key screens:
  - `WakeServerModalGate.tsx` starts/awaits `pingServer()`; if > 2s, shows spinner modal with haptics warning; hides with success when ready.
  - Used in Dashboard, Default detail/card, My Decks/Detail/Card, Review Setup/Run, Account; also `App.tsx` triggers an initial ping in the background.

### 5) Cross-Account Safety
- On logout: `AuthContext.logout()` clears token and calls `clearQueryCachePersist()` to wipe React Query cache + persisted store.
- On My Decks mount: `refetchOnMount: 'always'` ensures fresh list for the current user.

## Theming & Styling
- `themes/colors.ts`: Consistent palette (primary green, orange, red, lightGreen, gray, etc.).
- Neo-brutalist lean: bold borders, solid fills, bold text.
- Headers: Green background, compact title set in `RootNavigator.tsx`.

## Error Handling & Resilience
- Global 401 handler clears token.
- Queries/mutations wrapped with try/catch and user-friendly alerts.
- React Query invalidations maintain correctness post-mutation.
- Default image fallback prevents broken image slots.

## Build, Run, And Dev Tips
- Install deps: `npm install`
- Start Dev: `npm start` (Expo Dev Server)
- Android: `npm run android` (requires setup)
- iOS: `npm run ios` (requires macOS + Xcode)
- EAS builds: `npm run eas:build:android`, `npm run eas:build:ios`
- If backend sleeps:
  - App pings server automatically; wake-up modal appears after 2s if still asleep.
  - Manual ping: `curl https://flashcard-rs95.onrender.com/`

## Appendix — Key Files
- Navigation: `src/navigation/RootNavigator.tsx`
- Auth: `src/context/AuthContext.tsx`
- API: `src/services/api.ts`
- Queries: `src/services/query.tsx`, `src/services/queryKeys.ts`
- Images: `src/services/image.ts`
- Screens: `src/components/screens/*.tsx`
- Chart: `src/components/charts/GroupedBarChart.tsx`

