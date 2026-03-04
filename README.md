# Pest Content Generator

A tool for pest control companies to generate creative social media content using AI.

## 🚀 Quick Start (Local Setup)

To run this project locally, follow these steps:

1.  **Clone the project** to your machine.
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Set up API Key**: Create a `.env.local` file in the root and add your Google Gemini API Key:
    ```env
    GOOGLE_GENERATION_AI_API_KEY=your_api_key_here
    ```
    Get a key for free at [Google AI Studio](https://aistudio.google.com/app/apikey).
4.  **Run the app**:
    ```bash
    npm run dev
    ```
5.  **Open in browser**: Go to [http://localhost:3042](http://localhost:3042).

---

## 🛠 Features

- **Automated Rotation**: Schedules content based on seasonal pest priorities.
- **AI-Powered**: Uses Gemini 1.5 Flash to generate unique, scroll-stopping social media posts.
- **Local First**: Built with Next.js and SQLite, keeping your data local and fast.
- **Dashboard**: Track reach, engagement, and post status at a glance.

## 👨‍💻 Technical Details (For Developers)

This project uses:
- **Framework**: [Next.js](https://nextjs.org/)
- **AI**: [Vercel AI SDK](https://sdk.vercel.ai/) with Google Gemini
- **Database**: SQLite (via `better-sqlite3`)
- **Styling**: Tailwind CSS

### Manual Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file and add your API Key:
   ```env
   GOOGLE_GENERATION_AI_API_KEY=your_api_key_here
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3042](http://localhost:3042) in your browser.
