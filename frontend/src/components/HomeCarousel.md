# HomeCarousel Integration

Le composant `HomeCarousel` est un hero slider full-screen avec:
- fond d ecran responsive
- overlay semi-transparent
- texte d introduction centre
- boutons d action visibles
- cartes concours actives
- auto-slide + fleches + pagination

## Usage
Importer dans `frontend/src/app/page.js`:

```jsx
import HomeCarousel from '@/components/HomeCarousel';
```

Puis utiliser dans la vue invitee:

```jsx
<HomeCarousel />
```

## Notes
- Images optimisees via `next/image`
- Domaine remote configure dans `frontend/next.config.js`
- Aucune modification des modules Quiz/Blog/Dashboard existants
