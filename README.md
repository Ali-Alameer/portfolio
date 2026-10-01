# Dr Ali Alameer: portfolio

Personal academic site built with Next.js (App Router), plain CSS modules and `next/font`.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static production build
```

All content (bio, publications, citation stats, grants, teaching, supervision) lives in
`src/data/profile.ts`. Edit that file to update the site; the page and counts derive from it.

Colour tokens and the light/dark palettes are in `src/app/globals.css`. The theme toggle
cycles Auto, Light and Dark and remembers the choice in `localStorage`.
