# LinkTime (Outlook)

A React + Vite + TypeScript + Tailwind web app for creating one-off meeting links where participants sign in with Outlook, connect their calendars, get AI-ranked time suggestions, and book meetings with Teams links.

## Features

- **One-off Meeting Links**: Create shareable links for quick meeting scheduling
- **Outlook Integration**: Sign in with Microsoft Identity Platform (MSAL)
- **Calendar Connection**: Connect Outlook calendars to check availability
- **AI-Ranked Suggestions**: Get intelligent time slot recommendations
- **Teams Integration**: Auto-generate Teams meeting links
- **Group Management**: Save recurring meeting groups
- **Responsive Design**: Mobile-friendly interface with TailwindCSS

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript
- **Styling**: TailwindCSS
- **Routing**: React Router v6
- **State Management**: TanStack Query
- **Authentication**: @azure/msal-browser (Microsoft Identity Platform)
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Date Handling**: date-fns + date-fns-tz

## Setup

1. **Clone and Install Dependencies**

   ```bash
   npm install
   ```

2. **Environment Configuration**
   Copy `env.example` to `.env` and configure:

   ```bash
   cp env.example .env
   ```

   Update the `.env` file with your Microsoft App Registration details:

   ```
   VITE_MSAL_CLIENT_ID=YOUR_APP_ID
   VITE_MSAL_AUTHORITY=https://login.microsoftonline.com/common
   VITE_REDIRECT_URI=http://localhost:5173
   VITE_API_BASE_URL=http://localhost:8787
   ```

3. **Microsoft App Registration**

   - Go to [Azure Portal](https://portal.azure.com)
   - Create a new App Registration
   - Add redirect URI: `http://localhost:5173`
   - Add API permissions: `Calendars.Read`, `Calendars.ReadWrite`, `offline_access`
   - Copy the Application (client) ID to your `.env` file

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Navbar.tsx
│   ├── DurationPills.tsx
│   ├── HoursChips.tsx
│   ├── ParticipantCard.tsx
│   ├── SuggestionCard.tsx
│   ├── BookingModal.tsx
│   ├── AdvancedDrawer.tsx
│   ├── CopyButton.tsx
│   ├── PrivacyBanner.tsx
│   ├── EmptyState.tsx
│   └── Loader.tsx
├── context/            # React contexts
│   └── AuthContext.tsx
├── lib/                # Utility libraries
│   ├── msal.ts         # MSAL configuration
│   ├── api.ts          # API client and types
│   └── time.ts         # Date/time utilities
├── routes/             # Page components
│   ├── NewLink.tsx
│   ├── LinkRoom.tsx
│   ├── Success.tsx
│   ├── Groups.tsx
│   └── Profile.tsx
├── styles/
│   └── tailwind.css
├── App.tsx
└── main.tsx
```

## Routes

- `/` → Redirects to `/new`
- `/new` → Create one-off meeting link
- `/l/:id` → Link room (connect calendars, get suggestions, book)
- `/l/:id/success` → Booking success page
- `/groups` → Manage saved groups
- `/profile` → User preferences and settings

## API Integration

The app expects a backend API running on `http://localhost:8787` with the following endpoints:

- `POST /links` → Create meeting link
- `GET /links/:id/participants` → Get participants
- `GET /links/:id/suggestions` → Get time suggestions
- `POST /links/:id/book` → Book meeting
- `POST /links/:id/save-as-group` → Save as group
- `GET /groups` → Get user groups

## Development Notes

- All API calls include authentication headers when user is signed in
- MSAL handles token refresh automatically
- Components include loading states and error handling
- Responsive design works on mobile and desktop
- Privacy banner explains data usage to users

## TODO Items

- [ ] Backend API integration
- [ ] Error toast notifications
- [ ] Advanced settings persistence
- [ ] Calendar sync status indicators
- [ ] Meeting conflict detection
- [ ] Email notifications
- [ ] Recurring meeting support
- [ ] Time zone detection
- [ ] Accessibility improvements
- [ ] Unit tests

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
