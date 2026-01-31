# BistroSync - Restaurant Ordering System

## Overview

BistroSync is a full-stack restaurant ordering application with a customer-facing menu interface and an admin dashboard for order management. Customers can browse the menu, add items to cart, and place orders. The admin panel provides real-time order tracking with status updates and WhatsApp notification integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: 
  - Zustand with persist middleware for cart and authentication state
  - TanStack Query for server state and data fetching
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom theme configuration
- **Animations**: Framer Motion for smooth transitions

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints with Zod validation
- **Build System**: 
  - Vite for frontend bundling
  - esbuild for server bundling with selective dependency bundling

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit for schema migrations (`drizzle-kit push`)
- **Tables**: 
  - `menu_items` - Restaurant menu with categories
  - `orders` - Customer orders with status tracking
  - `order_items` - Line items linking orders to menu items
  - `users` and `sessions` - Replit Auth integration

### Authentication
- **Customer Auth**: Simple name-based login stored in Zustand (no backend verification)
- **Admin Auth**: Hardcoded credentials (admin/admin123) with Zustand persistence
- **Replit Auth**: OAuth integration via OpenID Connect for staff authentication (optional)

### Key Design Patterns
- **Shared Types**: `shared/` directory contains schemas and route definitions used by both client and server
- **API Contract**: Routes defined in `shared/routes.ts` with Zod schemas for type-safe API calls
- **Storage Interface**: `IStorage` interface in `server/storage.ts` abstracts database operations

## External Dependencies

### Database
- PostgreSQL database (required, configured via `DATABASE_URL` environment variable)
- Session storage uses `connect-pg-simple` for persistent sessions

### Third-Party Integrations
- **WhatsApp Notifications**: Orders trigger WhatsApp message URLs for restaurant notification (server/whatsapp.ts)
- **Google Maps**: Embedded map component for restaurant location display

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret for session encryption
- `ISSUER_URL` - Replit OIDC issuer (defaults to https://replit.com/oidc)
- `REPL_ID` - Replit environment identifier

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit` - Database ORM and migrations
- `@tanstack/react-query` - Server state management
- `zustand` - Client state management
- `framer-motion` - Animations
- `lucide-react` - Icon library
- `zod` - Runtime type validation