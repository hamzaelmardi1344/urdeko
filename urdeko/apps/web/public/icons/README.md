# Icônes PWA

Générées avec `rsvg-convert` à partir des sources SVG versionnées dans ce dossier.

## Fichiers

- `icon.svg` — logo source (contour + dégradé orange).
- `icon-maskable.svg` — version maskable (fond plein, logo réduit à 72 % dans la zone sûre Android/iOS).
- `icon-192.png`, `icon-512.png` — icônes PWA standard.
- `icon-maskable-512.png` — maskable pour Android.
- `apple-touch-icon.png` — iOS home screen (180×180).
- `favicon-16.png`, `favicon-32.png` — favicon navigateur.

## Régénérer

```bash
cd apps/web/public/icons
rsvg-convert -w 192 -h 192 icon.svg -o icon-192.png
rsvg-convert -w 512 -h 512 icon.svg -o icon-512.png
rsvg-convert -w 180 -h 180 icon.svg -o apple-touch-icon.png
rsvg-convert -w 512 -h 512 icon-maskable.svg -o icon-maskable-512.png
rsvg-convert -w 32 -h 32 icon.svg -o favicon-32.png
rsvg-convert -w 16 -h 16 icon.svg -o favicon-16.png
```

> `rsvg-convert` est fourni par `librsvg` (`brew install librsvg`).
