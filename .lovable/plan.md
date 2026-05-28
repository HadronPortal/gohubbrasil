The user wants to restructure the booking flow to: Login -> Select Barber -> Select Service -> Select Time -> Confirm.

### Database Changes
- Add `active` (boolean, default true) to `barbers` table.
- Add `user_id` (uuid, references profiles) to `barbers` table.
- Add `avatar_url` (text) to `profiles` table.

### New Screen: Select Barber
- Create `src/pages/SelectBarber.tsx`.
- Fetch barbers filtered by `active = true` and `barbershop_id`.
- Display a 2-column grid of barber cards.
- Each card shows: circular photo (avatar_url or initial), name (Oswald, uppercase), and specialty.
- Selected state with highlight.
- "CONTINUAR" button at the bottom.

### Services Screen Refactoring
- Move current `Home.tsx` logic to `src/pages/Services.tsx`.
- Remove "PROMO" and "BARBEIROS" tabs.
- Change title to "ESCOLHA O SERVIÇO".
- Keep service selection logic.
- Ensure `barberId` is passed in state or URL.

### Schedule Screen (Booking.tsx) Refactoring
- Remove "SELECIONAR BARBEIRO" section at the bottom.
- Ensure it uses the `barber_id` selected in the first step.
- Ensure it filters times correctly based on the selected barber.

### Routing Updates
- Update `App.tsx` routes:
  - `/` -> `SelectBarber`
  - `/services` -> `Services`
  - `/booking/:id` -> `Booking` (Time Selection)

### Technical Details
- Use `framer-motion` for smooth transitions between cards.
- Use `lucide-react` for the back arrow.
- Use `supabase` client for data fetching.
- Ensure the theme colors (#f0c040, #1c2333, etc.) are applied correctly.
