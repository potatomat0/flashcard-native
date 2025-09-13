# React Native App — Technical Overview

## Overview
- Purpose: Cross-platform mobile client for the Flashcard backend at `https://flashcard-rs95.onrender.com`.
- Goals: Fast first paint, smooth browsing of default content, responsive personal deck management, and reliable review flows.
- Core ideas: Persist static responses locally, aggressively refetch dynamic user data for accuracy, and centralize networking/auth.

## Tech Stack
- Expo SDK 53 with React Native 0.79 and React 19.
- TypeScript-first components and services.
- EAS for cloud builds (Android APK for sharing, iOS Simulator build for Mac testers).
- Axios for HTTP; React Query for data fetching/caching.
- AsyncStorage for persisted cache; SecureStore for auth token.
- Expo modules: Haptics, Image Picker, Status Bar, Secure Store.

## Project Structure (conceptual)
- `src/components/`: Screens and common UI
  - `screens/…`: Dashboard, DefaultDeckDetail, DefaultCardDetail, DefaultDeckReview, MyDecks, MyDeckDetail, MyCardDetail, MyDeckReviewSetup, Login, Register, User
  - `common/ModalBase`, `common/LabeledInput`, `common/DismissKeyboardView`
- `src/navigation/RootNavigator.tsx`: App stacks + tabs
- `src/context/AuthContext.tsx`: Auth state and actions
- `src/services/`:
  - `api.ts`: Axios instance + interceptors
  - `query.tsx`: React Query provider + persisted client
  - `queryKeys.ts`: Query key helpers
  - `image.ts`: Cloudinary URL transforms
  - `storageCache.ts`: AsyncStorage cache helpers (optional utility)
- `src/themes/colors.ts`: Centralized theme colors
- `Documents/progress.md`: Running change log for the app

## Key Libraries
- Navigation: `@react-navigation/native`, `@react-navigation/stack`, `@react-navigation/bottom-tabs`
- Data: `@tanstack/react-query`, `@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister`
- Storage: `@react-native-async-storage/async-storage`, `expo-secure-store`
- HTTP: `axios`
- UI/UX: `expo-haptics`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-screens`, `react-native-safe-area-context`, `react-native-svg`, `@expo/vector-icons`

## Data Layer
- React Query as source-of-truth for remote data.
- Query keys standardized in `queryKeys.ts` for consistent invalidation.
- Global defaults tuned for freshness:
  - `refetchOnMount: 'always'`, `refetchOnWindowFocus: true`, `refetchOnReconnect: true` (for dynamic user data)
  - `keepPreviousData` for paginated lists.
- Persisted client via `PersistQueryClientProvider` and AsyncStorage.

## Caching & Persistence
- Static content (default decks/cards) persisted with long `staleTime` (e.g., 24h) for fast startup and low bandwidth.
- Dynamic content (user decks/cards) intentionally not persisted to avoid stale UI; relies on refetch and invalidations for accuracy.
- Optional `storageCache.ts`:
  - `cachedGet(path, params, ttlMs)`: Serve fresh/stale data from AsyncStorage; fallback to network; serve stale on error.
  - Used early to accelerate static screens; later migrated to React Query for consistency.

## Authentication
- Token stored in `expo-secure-store` under a single key.
- Axios request interceptor injects `Authorization: Bearer <token>` automatically if present.
- Response interceptor clears invalid token on 401; UI logout handled by `AuthContext`.
- AuthContext API:
  - `login`, `register` with auto-login, `logout`
  - `refreshProfile` (GET `/api/users/profile`)
  - `updateProfile` (PATCH `/api/users/profile`)
  - `deleteAccount` (DELETE `/api/users/profile`)
  - `changePassword` (PATCH `/api/users/password`)

## Networking
- `services/api.ts` centralizes base URL and headers.
- All screens make requests via this Axios instance to ensure consistent auth and error handling.
- Uploads use `multipart/form-data` with the same instance.

## Navigation
- Root navigator provides tabs:
  - Explore (default content), My Decks (user content), Account.
- Screen headers updated dynamically (e.g., card name as title).
- Haptics sprinkled on user actions (selection, error, warning).

## UI & Styling
- Theme: Neo-brutalist lean — solid borders, stark contrast, bold text.
- `themes/colors.ts`: primary (green), orange, red, lightGreen, gray, text, subtext, bg, white, border.
- Patterns:
  - Buttons: colored fills with black borders and bold labels.
  - Inputs: labeled, bordered fields via `LabeledInput`.
  - Lists: `FlatList` with consistent spacing and separators.
  - Placeholders: subtle subtext; `placeholderTextColor` set to theme `subtext` (better contrast).
  - Account screen: full-width button rows, vertically stacked, centered labels.

### Recent UI Enhancements
- Auth: Centered logo at top of Login and Register (asset at `src/logo.png`).
- Keyboard: Auth screens wrapped in `KeyboardAvoidingView` + `ScrollView` to keep inputs visible; tap-outside dismiss retained.
- Modals: `ModalBase` uses `KeyboardAvoidingView` so all modal forms avoid keyboard overlap (edit profile, change password, create/edit deck/card).

## Screens
- Dashboard: Lists default decks (2-column grid), images transformed via Cloudinary helper.
- Default Deck/Card: Detail and card list (with pagination) from static endpoints; save-to-user-deck action; clone default deck.
- Default Review: Flashcard (with hint toggle), MCQ, Fill; “save to deck” from review context.
- My Decks: Lists personal decks; live-as-you-type card search with debounce and pagination.
- My Deck Detail: Deck info editing; card list with create/edit/delete and image support; archive flags; pagination with keepPreviousData.
- My Card Detail: Single card view; image change; archive toggle with immediate invalidations.
- Account: Profile details, Edit Profile modal, Change Password modal, two-step Delete Account confirmation, Logout.

## Error Handling & Resilience
- Most screens capture errors and display concise messages.
- Mutations invalidate related queries to sync UI (deck list/detail, deck cards, search results, card detail).
- Static data fallback: when using `storageCache`, stale cache is served on network errors for a graceful offline-experience-like behavior.

## Performance Strategies
- Long `staleTime` + persistence for static content → fast dashboards and default views.
- React Query `keepPreviousData` on paginated lists → smooth page transitions without flicker.
- Debounced search (300ms) with `enabled: !!query` to suppress unnecessary requests.
- Invalidation on mutation → real-time accuracy post updates.
- Pull-to-refresh on key lists for user-driven refetch.

## Build & Distribution
- EAS config (`eas.json`) with profiles:
  - `preview`: Android APK for sharing, iOS Simulator build for Mac testers.
  - `production`: Store-ready builds (AAB/IPA).
- Scripts in `package.json` to build/submit quickly.
- App IDs to be added in `app.json` (`android.package`, `ios.bundleIdentifier`) before store builds.

## Developer Workflow & Prompt Rules
- Always:
  - Read backend API docs (`documents/api_doc.md`) and confirm contract before implementation.
  - Update `Documents/progress.md` after notable changes.
  - Plan changes (what, where, why), then implement surgically.
  - Validate state updates and add appropriate React Query invalidations.
- Preambles and progress:
  - Outline what you’ll do next in short preambles when running commands/edits.
  - Keep a lightweight plan and mark steps complete to keep collaborators aligned.

## Coding Principles
- Single responsibility per component and service.
- Centralize cross-cutting concerns (auth, networking, theming).
- Prefer declarative data flows (React Query) over ad hoc fetching.
- Strictly typed props and service responses where practical.
- Consistent naming, file structure, and UI primitives (ModalBase, LabeledInput).
- Avoid unnecessary state duplication; derive from queries where possible.

## Architectural Decisions
- React Query chosen over custom cache hooks for:
  - Unified cache/invalidation, persistent storage, retries, background refresh.
- AsyncStorage persistence limited to static content:
  - Avoid stale user data while retaining instant loads for default/browse flows.
- Axios with interceptors:
  - Ensures consistent auth and 401 handling in one place.
- Theming:
  - A central color palette to keep the neo-brutalist look coherent and maintainable.

## Meeting Business Requirements
- Fast loads: Persisted default content + Cloudinary image transforms.
- Accurate data: Broad invalidations post mutation + refetch on focus.
- Low friction: Haptics feedback, clear toasts/alerts, accessible controls.
- Shareable builds: EAS `preview` profiles producing APK and iOS Simulator artifacts.

## Extensibility & Next Steps
- Optional: Move all default endpoints to React Query exclusively (already done) with long `staleTime`.
- Consider OpenAPI/Swagger for typed API clients.
- Add analytics and crash reporting.
- Introduce basic UI tests for critical flows (login, create deck/card, review).
- Add feature flags for toggling persistence strategies if future endpoints become semi-dynamic.

This overview is intended as a newcomer-friendly map to the codebase: what’s used, why decisions were made, and how to work within the established patterns to deliver features quickly and safely.
