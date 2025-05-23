# Videa - Video Idea Generator App

Videa is a powerful tool designed to help content creators generate, track, and optimize their video content ideas, while providing valuable insights on trending topics and performance analytics.

## 🌟 Features

### Core Features

- **Video Idea Generator**: AI-powered generator that creates custom video ideas based on your preferences
- **Idea Management**: Save, categorize, and track your favorite video ideas
- **Trending Topics**: Stay updated with real-time trending topics across different regions and categories
- **Trending Videos Carousel**: Discover popular videos from different regions with auto-refreshing data
- **Performance Analytics**: Track and analyze your content performance metrics

### Recent Updates

- **Enhanced Video Carousel**: Improved visibility of carousel navigation buttons with better color scheme and shadow effects
- **Data Caching with Expiry**: Trending video data now automatically refreshes after 1 hour for each region
- **Performance Analytics Dashboard**: Added comprehensive analytics with detailed metrics and visualization tools
- **Multi-Region Support**: Extended trending data with support for global and region-specific content

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- pnpm, npm, or yarn

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/Videa.git
cd Videa
```

2. Install dependencies

```bash
npm install
# or
pnpm install
# or
yarn install
```

3. Set up environment variables
   Create a `.env` file in the root of your project with the following variables:

```env
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server

```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application

## 🛠️ Tech Stack

- **Frontend**: React 19, Next.js 15
- **Styling**: TailwindCSS
- **UI Components**: Radix UI, Shadcn/UI
- **State Management**: React Hooks
- **Database**: Supabase
- **AI Integration**: OpenAI API
- **Data Visualization**: Recharts
- **Authentication**: Supabase Auth

## 📊 Analytics Features

The Performance Analytics dashboard provides:

- Engagement metrics (views, likes, comments)
- Audience demographics and growth trends
- Content performance by category and topics
- Click-through rates and conversion data
- Detailed analytics with interactive charts and filters

## 📱 Responsive Design

Videa is fully responsive and optimized for:

- Desktop
- Tablet
- Mobile devices

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 🙏 Acknowledgements

- OpenAI for the AI-powered idea generation
- Supabase for backend and authentication
- Next.js team for the amazing framework
- All our contributors and users
