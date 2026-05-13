# Voice2Action

Voice2Action is a civic issue reporting app built with Next.js 16, React 19, Tailwind CSS 4, Leaflet, and MongoDB. Citizens can report local problems, vote on issues, view them on a live city map, and admins can monitor and resolve reports from a dashboard.

## Main Features

- Home feed with issue search, category filters, map preview, and voting
- Full city map with marker clustering, heatmap, filter controls, and issue detail panel
- Report form with GPS lookup, manual map pin selection, image upload, and voice dictation
- Admin dashboard for reviewing issues, filtering by status, and marking reports as resolved
- Reverse geocoding and city-boundary validation for location accuracy

## Routes

- `/` citizen home feed
- `/map` full interactive city map
- `/report` issue submission form
- `/admin` admin dashboard
- `/api/issues` list and create issues
- `/api/issues/[id]` update an issue
- `/api/issues/[id]/vote` vote on an issue
- `/api/location/reverse` reverse geocode coordinates

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Open `http://localhost:3000`

## Verification

Use these commands before shipping changes:

```bash
npm run lint
npm run build
```

## Notes

- The app is currently configured around `Chhatrapati Sambhajinagar` in `src/lib/city-map.js`.
- MongoDB defaults to `mongodb://127.0.0.1:27017/voice2action` unless `MONGODB_URI` is set.
- `.design-ref/` is treated as a local design scratch/reference folder and is ignored by Git.
