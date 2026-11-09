# Stephenthethird Portfolio — Vite + React Setup

## 1. Create the project folder and navigate into it

```bash
cd ~/music-hub
mkdir portfolio-site && cd portfolio-site
```

## 2. Scaffold Vite + React

```bash
npm create vite@latest . -- --template react
```

## 3. Install all dependencies in one shot

```bash
npm install && npm install framer-motion lucide-react
```

## 4. Install and initialize Tailwind CSS

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

## 5. Copy in the source files from this folder
Replace everything in `src/` with the provided files.
Replace `tailwind.config.js`, `vite.config.js`, and `.env.local`.

## 6. Start the dev server

```bash
npm run dev
```

The site runs at → http://localhost:5173
Your S3 Hub stays at → http://localhost:5050

---

## Project structure

```
portfolio-site/
├── public/
│   └── images/            ← drop artwork / portrait photos here
├── src/
│   ├── components/
│   │   ├── Nav.jsx
│   │   ├── Hero.jsx
│   │   ├── Catalog.jsx
│   │   ├── Credits.jsx
│   │   ├── Contact.jsx
│   │   └── Footer.jsx
│   ├── data/
│   │   ├── creditsData.js  ← add new placements here
│   │   └── sampleBeats.js  ← fallback when S3 Hub is offline
│   ├── hooks/
│   │   └── useBeats.js     ← fetches from localhost:5050
│   ├── lib/
│   │   └── api.js          ← all API config lives here
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env.local              ← set VITE_API_URL here
├── vite.config.js
└── tailwind.config.js
```
