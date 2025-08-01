# EduStream

EduStream is a modern Learning Management System (LMS) designed for seamless video uploading and streaming. Built with Next.js and powered by Cloudflare Stream, it provides a robust platform for educational content delivery with professional-grade video streaming capabilities.

## Features

### 🎥 Video Management
- **Resumable Uploads**: Large file support (up to 3GB) with TUS protocol for interrupted upload recovery
- **Adaptive Streaming**: Cloudflare Stream integration with HLS/DASH for optimal video delivery
- **Rich Metadata**: Title, description, and automatic thumbnail generation
- **Multiple Formats**: Support for MP4, MOV, AVI, WMV, FLV, WebM, and MKV

### 🎨 User Experience
- **Responsive Design**: Modern UI with Tailwind CSS and glassmorphism aesthetics
- **Real-time Progress**: Live upload progress with detailed status tracking
- **Video Grid**: Paginated video library with search functionality
- **Professional Player**: Video.js integration with playback controls and quality selection

### 🔧 Technical Features
- **Type Safety**: Full TypeScript implementation with Zod validation
- **Webhook Integration**: Cloudflare Stream webhooks for status updates
- **Database Integration**: Supabase for metadata storage and user management
- **Error Handling**: Comprehensive error handling and user feedback

## Tech Stack

### Frontend
- **Next.js 15.3.4** - React framework with App Router
- **React 19** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Utility-first styling
- **Video.js** - Professional video player with HLS support

### Backend & Services
- **Next.js API Routes** - Server-side functionality
- **Supabase** - Database and authentication
- **Cloudflare Stream** - Video hosting, transcoding, and CDN
- **TUS Protocol** - Resumable file uploads

### Development Tools
- **Zod** - Schema validation
- **React Hook Form** - Form management
- **ESLint** - Code linting
- **Lucide React** - Icon library

## Project Structure

```
edu-stream/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── api/                 # API routes
│   │   │   ├── tus-upload/      # TUS upload endpoints
│   │   │   ├── videos/          # Video CRUD operations
│   │   │   └── webhooks/        # Cloudflare webhook handlers
│   │   ├── upload/              # Video upload page
│   │   ├── videos/              # Video library page
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Homepage
│   │   └── globals.css          # Global styles
│   ├── components/              # React components
│   │   ├── upload/              # Upload-related components
│   │   │   ├── VideoUploadForm.tsx
│   │   │   └── UploadProgressPanel.tsx
│   │   └── video/               # Video display components
│   │       ├── VideoCard.tsx
│   │       ├── VideoGrid.tsx
│   │       └── VideoPlayer.tsx
│   ├── repositories/            # Data access layer
│   │   ├── VideoRepository.ts   # Video database operations
│   │   └── UploadRepository.ts  # Upload-related data access
│   ├── services/                # Business logic layer
│   │   ├── VideoService.ts      # Video business logic
│   │   ├── CloudflareService.ts # Cloudflare Stream API
│   │   ├── UploadService.ts     # Upload processing
│   │   └── WebhookService.ts    # Webhook handling
│   ├── types/                   # TypeScript type definitions
│   │   ├── api/                 # API response types
│   │   └── components/          # Component prop types
│   ├── zod/                     # Zod validation schemas
│   │   ├── upload.ts            # Upload validation
│   │   └── index.ts             # Schema exports
│   └── lib/                     # Utilities and constants
│       └── constants/
│           └── upload.ts        # Upload-related constants
├── docs/                        # Documentation
├── public/                      # Static assets
└── ...config files
```

## Database Schema

### Videos Table
```sql
- id: UUID (Primary Key)
- title: VARCHAR(255) - Video title
- description: TEXT - Video description
- cloudflare_video_id: VARCHAR - Cloudflare Stream video ID
- playback_id: VARCHAR - Cloudflare playback ID
- duration_sec: INTEGER - Video duration in seconds
- size_bytes: BIGINT - File size in bytes
- thumbnail_url: VARCHAR - Video thumbnail URL
- status: ENUM - Upload/processing status (pending, uploading, processing, ready, error)
- created_at: TIMESTAMP - Creation timestamp
- updated_at: TIMESTAMP - Last update timestamp
- cloudflare_upload_id: VARCHAR - Cloudflare upload session ID
```

## API Endpoints

### Video Operations
- `GET /api/videos` - List videos with pagination and search
- `GET /api/videos/[cloudflare_video_id]` - Get video details and streaming URLs

### Upload Operations
- `POST /api/tus-upload` - Initialize TUS upload session
- `PATCH /api/tus-upload/[sessionId]` - Continue TUS upload
- `HEAD /api/tus-upload/[sessionId]` - Check upload status

### Webhooks
- `POST /api/webhooks/cloudflare-stream` - Handle Cloudflare Stream events

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Cloudflare Stream Configuration
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_SUBDOMAIN=customer-your-customer-code.cloudflarestream.com
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- Cloudflare account with Stream enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd edu-stream
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual values
   ```

4. **Set up Supabase database**
   - Create the videos table with the schema above
   - Configure Row Level Security (RLS) policies as needed

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Upload Workflow

1. **Form Validation**: Client-side validation using Zod schemas
2. **TUS Session**: Create upload session with Cloudflare Stream
3. **Database Record**: Insert video metadata with 'pending' status
4. **File Upload**: Resumable upload directly to Cloudflare
5. **Webhook Processing**: Status updates via Cloudflare webhooks
6. **Ready State**: Video available for streaming when processing completes

## Video Streaming

Videos are delivered through Cloudflare Stream's global CDN with:
- **Adaptive Bitrate Streaming** - Automatic quality adjustment
- **HLS Protocol** - Industry-standard HTTP Live Streaming
- **Multiple Resolutions** - From 480p to 4K depending on source
- **Fast Loading** - Optimized delivery with global edge locations

## Deployment

### Vercel (Recommended)
1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on git push

### Manual Deployment
```bash
npm run build
npm start
```

## File Upload Limits

- **Maximum File Size**: 3GB per video
- **Chunk Size**: 50MB for resumable uploads
- **Maximum Duration**: 1 hour per video
- **Supported Formats**: Most common video formats

## Performance Considerations

- **Chunked Uploads**: 50MB chunks for reliable large file uploads
- **Resume Capability**: Interrupted uploads can be resumed
- **Edge Delivery**: Global CDN for fast video delivery
- **Lazy Loading**: Video grid loads content on demand
- **Optimized Player**: Video.js with HLS optimization

## License

MIT License. See [LICENSE](LICENSE) for details.
