# ShikshaSaarthi — AI-Enabled Scholarship & Fellowship Management System

ShikshaSaarthi is a comprehensive, AI-powered platform built for the **Ministry of Tribal Affairs, Government of India**, to streamline the end-to-end management of scholarship and fellowship programs. The system enables applicants to discover and apply for schemes, officers to review and process applications with AI-assisted verification, and administrators to manage schemes, track disbursements, and generate analytics — all through a modern, accessible web interface.

---

## Tech Stack

| Layer      | Technology                        |
| ---------- | --------------------------------- |
| Frontend   | React.js (Vite) + Tailwind CSS + Ant Design |
| Backend    | Node.js + Express.js              |
| Database   | PostgreSQL (via Supabase)         |
| ORM        | Prisma                            |

---

## Project Structure

```
ShikshaSaarthi/
├── client/          # React frontend (Vite)
│   └── src/
│       ├── pages/       # Page components (Home, Login, etc.)
│       ├── components/  # Reusable UI components
│       ├── layouts/     # Layout wrappers
│       ├── api/         # API service functions
│       └── utils/       # Utility/helper functions
├── server/          # Express backend
│   ├── routes/          # API route definitions
│   ├── controllers/     # Route handler logic
│   ├── middleware/       # Express middleware
│   ├── prisma/          # Prisma schema & migrations
│   └── config/          # Configuration files
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **PostgreSQL** database (or a [Supabase](https://supabase.com) project)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ShikshaSaarthi
```

### 2. Set Up the Backend

```bash
cd server
npm install

# Create a .env file (a template is provided)
# Update DATABASE_URL with your PostgreSQL/Supabase connection string

# Push the Prisma schema to the database
npx prisma db push

# Generate the Prisma client
npx prisma generate

# Start the server
npm run dev
```

The server will start at **http://localhost:5000**. Verify with:

```bash
curl http://localhost:5000/api/health
# → { "status": "ok", "timestamp": "..." }
```

### 3. Set Up the Frontend

```bash
cd client
npm install

# Start the development server
npm run dev
```

The frontend will start at **http://localhost:5173**.

---

## Available Scripts

### Client (`/client`)

| Command         | Description                   |
| --------------- | ----------------------------- |
| `npm run dev`   | Start Vite dev server         |
| `npm run build` | Build for production          |
| `npm run preview` | Preview production build    |

### Server (`/server`)

| Command                | Description                        |
| ---------------------- | ---------------------------------- |
| `npm start`            | Start the server                   |
| `npm run dev`          | Start with nodemon (auto-reload)   |
| `npm run prisma:generate` | Generate Prisma client          |
| `npm run prisma:push`  | Push schema to database            |
| `npm run prisma:studio`| Open Prisma Studio GUI             |

---

## Environment Variables

Create a `.env` file in `/server` with:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
PORT=5000
JWT_SECRET="your-jwt-secret-here"
```

---

## License

This project is developed for the Ministry of Tribal Affairs, Government of India.
