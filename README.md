# EduStream

EduStream is a lightweight Learning Management System (LMS) that allows users to upload videos and stream them via a responsive interface. Built with Next.js, Tailwind CSS, Supabase, and seamless video streaming powered by Mux, this project is designed for small-scale educational platforms and is hosted on Vercel.

## Features
- **Video Upload**: Upload videos with metadata via `/upload` route.
- **Video Streaming**: Stream videos in a responsive grid at `/videos` using Mux Video Stream.
- **Responsive UI**: Styled with Tailwind CSS for a modern, user-friendly experience.
- **Database**: Supabase stores video metadata and supports optional authentication.
- **Streaming**: Mux Video Stream handles video storage, transcoding, and adaptive playback.
- **Hosting**: Deployed on Vercel for seamless scalability.

## Tech Stack
- **Frontend**: Next.js (App Router) with Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: Supabase for Auth + Mux Video for Video asset hosting
- **Streaming**: Mux Video
- **Hosting**: Vercel

## Project Structure
```
edu-stream/
├── public/                   # Static assets (e.g., favicon, images)
├── src/
│   ├── app/                 # App Router for pages and layouts
│   │   ├── api/             # API routes (e.g., /api/upload, /api/videos)
│   │   ├── upload/          # Video upload page
│   │   ├── videos/          # Video streaming page
│   │   ├── globals.css       # Tailwind CSS and global styles
│   │   ├── layout.js        # Root layout
│   │   └── page.js          # Homepage
├── .gitignore               # Git ignore file
├── package.json             # Project dependencies and scripts (name: "edustream")
├── next.config.js           # Next.js configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── README.md                # This file
└── .env.local               # Environment variables (not tracked)
```
## License
MIT License. See [LICENSE](LICENSE) for details.