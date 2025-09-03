# Twins App Scaffolding Guide

This guide provides the steps to build the react-native app from the ground up.

## Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- Expo CLI
- Git

## Installation

1.  **Create a new Expo project:**

    ```bash
    npx create-expo-app flashcard --template blank-typescript
    ```

2.  **Navigate to the project directory:**

    ```bash
    cd twins-app
    ```

3.  **Install dependencies:**

    ```bash
    npm install @react-navigation/native @react-navigation/stack d3-scale d3-shape expo-font expo-status-bar react-native-gesture-handler react-native-reanimated react-native-safe-area-context react-native-screens react-native-svg
    ```

4.  **Install development dependencies:**

    ```bash
    npm install --save-dev @types/react babel-plugin-module-resolver babel-preset-expo typescript
    ```

5.  **Create the folder structure:**

    ```bash
    mkdir -p components/charts components/common context data hooks navigation services themes assets Documents
    ```

6.  **Create placeholder files:**

    ```bash
    touch  Documents/progress.md " # and other files for the project
    ```

## Configuration

1.  **`babel.config.js`:**

    Update `babel.config.js` to include the `module-resolver` plugin:

    ```javascript
    module.exports = function(api) {
      api.cache(true);
      return {
        presets: ['babel-preset-expo'],
        plugins: [
          [
            'module-resolver',
            {
              root: ['./'],
              alias: {
                '@components': './components',
                '@context': './context',
                '@navigation': './navigation',
                '@themes': './themes',
                '@services': './services',
                '@hooks': './hooks',
                '@data': './data',
              },
            },
          ],
        ],
      };
    };
    ```

2.  **`tsconfig.json`:**

    Update `tsconfig.json` to include the path aliases:

    ```json
    {
      "extends": "expo/tsconfig.base",
      "compilerOptions": {
        "strict": true,
        "jsx": "react-jsx",
        "baseUrl": ".",
        "paths": {
          "@components/*": ["components/*"],
          "@context/*": ["context/*"],
          "@navigation/*": ["navigation/*"],
          "@themes/*": ["themes/*"],
          "@services/*": ["services/*"],
          "@hooks/*": ["hooks/*"],
          "@data/*": ["data/*"]
        }
      }
    }
    ```

## Running the App

```bash
npm start
```

## Folder Structure

figure out yourself 

## Dependencies

- `@react-navigation/native`
- react navigation tab
- axios 
- redux 
- `@react-navigation/stack`
- `d3-scale`
- `d3-shape`
- `expo`
- `expo-font`
- `expo-status-bar`
- `react`
- `react-native`
- `react-native-gesture-handler`
- `react-native-reanimated`
- `react-native-safe-area-context`
- `react-native-screens`
- `react-native-svg`
- add more if necessary
## Dev Dependencies

- `@types/react`
- `babel-plugin-module-resolver`
- `babel-preset-expo`
- `typescript`

## Design guidelines: 

- neobrutalist design 
- simple, no-fuss design
- haptics-focused 

## API endpoint 

https://flashcard-rs95.onrender.com/

## notes:

gantt chart at the end of documents/progress to show big changes to the new apps. bug fixes and UI/feat enhancement or duplicates are excluded from the chart. 

for missing resources, note at the end of the task so user can provide

always gracefully handle all render so the UI doesnt break 

the backend is always running at the given API endpoint 

database schema is at ./documents

emphasize on state management, stateless design and caching

use curl commands to test the actual api response if necessary
