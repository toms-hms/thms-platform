Create a new frontend page following the project's patterns.

Steps:
1. Create `src/app/(dashboard)/{route}/page.tsx`
2. Add `'use client'` at the top
3. Use `useState` + `useEffect` for data — call `api.ts` functions inside `useEffect`
4. Show a loading state while fetching (`if (loading) return <div>Loading...</div>`)
5. Use `<Modal>` for create/edit forms, `<EmptyState>` for empty lists
6. Use `.btn-primary`, `.input`, `.card` Tailwind classes from globals.css
7. Add navigation link to `src/components/ui/Navbar.tsx` if it needs a top-level nav entry
