# PubMed Helper

A full-stack application for searching and viewing scientific articles from PubMed using natural language queries.

## Features

- 🔍 Natural language search for PubMed articles
- 🤖 AI-powered brief summaries (using OpenAI GPT-3.5)
- 📄 Full article abstracts
- 📑 Section identification in articles
- 🎨 Modern, responsive UI

## Tech Stack

- **Backend**: NestJS (Node.js)
- **Frontend**: Vue 3 with Vite
- **API**: PubMed E-utilities API
- **AI**: OpenAI GPT-3.5 Turbo (optional, with fallback)

## Project Structure

```
pubmed-helper/
├── backend/          # NestJS backend
│   ├── src/
│   │   ├── ai/        # AI service for generating summaries
│   │   ├── pubmed/    # PubMed API service
│   │   ├── search/    # Search controller and service
│   │   └── main.ts    # Application entry point
│   └── package.json
│
└── frontend/         # Vue 3 frontend
    ├── src/
    │   ├── components/  # Vue components
    │   ├── services/    # API service
    │   └── App.vue      # Main app component
    └── package.json
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Set up OpenAI API key for AI summaries:
   - Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Set it as an environment variable:
   ```bash
   export OPENAI_API_KEY=your_api_key_here
   ```
   - Or create a `.env` file in the backend directory:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```
   - **Note**: If no API key is provided, the app will use intelligent fallback summaries based on the abstract.

4. Start the development server:
```bash
npm run start:dev
```

The backend will run on `http://localhost:3000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## Usage

1. Start both the backend and frontend servers
2. Open your browser to `http://localhost:5173`
3. Enter a natural language query (e.g., "diabetes treatment", "cancer research")
4. View the AI-generated brief summaries, full abstracts, and article sections

## API Endpoints

### GET /search
Search for articles using natural language.

**Query Parameters:**
- `q` (required): Search query
- `limit` (optional): Maximum number of results (default: 5, max: 20)

**Example:**
```
GET http://localhost:3000/search?q=diabetes%20treatment&limit=5
```

## License

MIT
