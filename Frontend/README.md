# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Deployment

### Prerequisites
- PostgreSQL Database
- Node.js (v18+)

### Backend Deployment
1. Set up environment variables in a `.env` file or your hosting provider:
   - `PORT`: Port to run the server (default: 5000)
   - `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`: Database connection details
   - `JWT_SECRET`: A secure random string for token signing
   - `NODE_ENV`: set to `production`
   - `FRONTEND_URL`: The URL where your frontend is hosted (for CORS)

2. Run `npm install` and `npm start`.

### Frontend Deployment
1. Create a `.env.production` file (handled automatically by build if present):
   - `VITE_API_URL`: The base URL for your API (e.g., `https://api.yourdomain.com/api` or `/api` if proxied).

2. Run `npm run build`.
3. Serve the contents of the `dist` folder.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
