# Cal-Pro - Calorie & Macro Tracker PWA

A Progressive Web App for tracking daily calories and macronutrients with barcode scanning capabilities. Optimized for iOS Safari "Add to Home Screen" experience.

## 🚀 Features (Current MVP)

### ✅ Implemented
- **User Authentication**: Email/password signup, login, password reset
- **Barcode Scanning**: Real-time camera-based barcode detection via iOS Safari
- **Open Food Facts Integration**: Automatic food data lookup by EAN/UPC barcode
- **Meal Logging**: Add meals with quantity tracking and instant macro calculation
- **Meal Groups**: Breakfast, lunch, dinner, and snacks sections
- **Daily Dashboard**: Real-time calorie progress circle and macro summary
- **Daily Summaries**: Automatic daily total calculation triggered by meal changes
- **iOS PWA**: Installable as app on iOS Safari with manifest and service worker

### 🔄 In Development
- Weekly/monthly analytics with graphs
- Meal history with filtering options
- User profile and settings page
- iOS splash screens and app icons
- Offline support with IndexedDB caching

## 📋 Setup Instructions

### Prerequisites
- Node.js 16+ and npm
- Supabase account (free tier available)
- iOS device or Safari browser for PWA testing

### 1. Clone & Install Dependencies

```bash
cd cal-pro
npm install
```

### 2. Configure Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project
3. Copy your project URL and anon key
4. Paste into `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Create Database Schema

1. Go to **SQL Editor** in Supabase dashboard
2. Create new query
3. Copy contents of `supabase/migrations/001_create_schema.sql`
4. Paste and run in SQL Editor

### 4. Run Development Server

```bash
npm run dev
```

Server will start at `http://localhost:5173`

### 5. Test on iOS Safari

1. On iOS device, open Safari
2. Navigate to your dev server URL
3. Tap Share button → "Add to Home Screen"
4. Tap "Add" to install as app

## 🏗️ Project Structure

```
cal-pro/
├── src/
│   ├── components/        # React components
│   ├── pages/            # Page components
│   ├── services/         # API services
│   ├── hooks/            # React hooks
│   ├── types/            # TypeScript types
│   ├── styles/           # CSS stylesheets
│   ├── App.tsx           # Main app with router
│   └── main.tsx          # App entry point
├── public/
│   ├── manifest.json     # PWA manifest
│   └── sw.js            # Service worker
├── supabase/
│   └── migrations/       # Database migrations
├── .env                  # Environment variables
├── vite.config.ts        # Vite configuration
└── README.md             # This file
```

## 🗄️ Database Schema

### Tables
- **users** - User profiles linked to Supabase auth
- **food_items** - Food products from Open Food Facts
- **meals** - Individual meal entries
- **daily_summaries** - Auto-calculated daily macro totals

See `SUPABASE_SETUP.md` for detailed documentation.

## 🔐 Security

- **Authentication**: Supabase Auth
- **Data Isolation**: Row Level Security (RLS) policies
- **Environment**: Sensitive keys in `.env`

## 📱 iOS PWA Features

- Web Manifest for installability
- Service Worker for offline caching
- iOS-specific meta tags and splash screens
- Camera access for barcode scanning

## 🛠️ Development

```bash
npm run dev       # Start dev server
npm run build     # Build for production
npm run preview   # Preview production build
```

## 📊 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase PostgreSQL
- **Styling**: CSS (responsive, mobile-first)
- **Routing**: React Router v7
- **Food API**: Open Food Facts (free)
- **UI**: Lucide React icons

## 📝 Next Steps

- [ ] Meal history page with filtering
- [ ] Weekly/monthly analytics
- [ ] User settings page
- [ ] iOS splash screens and icons
- [ ] Offline IndexedDB support
- [ ] Push notifications
- [ ] Barcode detection enhancement with quagga.js
- [ ] Unit and E2E testing

## 🐛 Known Limitations

- Barcode scanner currently requires online connection
- Food database relies on Open Food Facts API
- Email verification required for signup

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)
- [PWA Guide](https://web.dev/progressive-web-apps/)

---

**Status**: MVP Development (Phase 3/6 Complete)  
**Last Updated**: May 2026

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
