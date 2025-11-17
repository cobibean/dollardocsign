# Your Project Name

A document signing application built with modern web technologies.

## Getting Started

This is a monorepo containing a full-stack document signing application.

### Prerequisites

- Node.js (v22 or above)
- PostgreSQL Database
- Docker (optional, for development)

### Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Set up the database:
   ```bash
   npm run prisma:migrate-dev
   npm run prisma:seed
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at http://localhost:3000

## Tech Stack

- TypeScript - Language
- React Router - Framework
- Prisma - ORM
- Tailwind CSS - Styling
- shadcn/ui - Component Library
- tRPC - API
- PostgreSQL - Database

## License

This project is licensed under the AGPLv3 License - see the LICENSE file for details.