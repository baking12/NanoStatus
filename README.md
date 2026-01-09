# NanoStatus

A lightweight, single-container monitoring dashboard built with Go and React.

## Features

- 🚀 Single binary deployment
- 📊 Real-time service monitoring with actual HTTP checks
- 🎨 Modern, dark-themed UI
- 📈 Response time charts with historical data
- 🔍 Service search and filtering
- 📱 Responsive design
- 💾 SQLite database for persistence

## Quick Start

### Using Docker (Recommended)

1. **Build the Docker image:**
   ```bash
   docker build -t nanostatus .
   ```

2. **Run the container:**
   ```bash
   docker run -p 8080:8080 nanostatus
   ```

   The application will be available at `http://localhost:8080`

   To persist the database across container restarts:
   ```bash
   docker run -p 8080:8080 -v $(pwd)/data:/root nanostatus
   ```

### Local Development

#### Prerequisites
- [Bun](https://bun.sh) (for frontend)
- [Go](https://go.dev) 1.24+ (for backend)

#### Running Locally

1. **Build the frontend:**
   ```bash
   cd src
   bun install
   bun run build --outdir=../dist
   cd ..
   ```

2. **Run the Go server:**
   ```bash
   go run main.go
   ```

   Or build and run:
   ```bash
   go build -o nanostatus main.go
   ./nanostatus
   ```

3. **Access the application:**
   Open http://localhost:8080 in your browser

#### Using Makefile

```bash
make build        # Build both frontend and backend
make run          # Build and run the application
make dev-frontend # Run frontend dev server (with hot reload)
make dev-backend  # Run Go server (requires built frontend)
make clean        # Clean build artifacts
```

## How It Works

- **Background Monitoring**: Services are automatically checked every 60 seconds
- **Real HTTP Checks**: Actually pings services and measures response times
- **Database**: SQLite database (`nanostatus.db`) stores all monitors and check history
- **Single Binary**: Frontend is embedded in the Go binary via `//go:embed`

## API Endpoints

- `GET /api/monitors` - List all monitors
- `POST /api/monitors/create` - Create a new monitor
- `GET /api/stats` - Get overall statistics
- `GET /api/response-time?id=<id>` - Get response time history
- `GET /api/monitor?id=<id>` - Get specific monitor details
- `DELETE /api/monitor?id=<id>` - Delete a monitor

## Configuration

- **Port**: Default is `8080`. Set `PORT` environment variable to change it.
- **Database**: SQLite database file is created as `nanostatus.db` in the working directory.

## Project Structure

```
.
├── main.go              # Go backend server
├── go.mod               # Go dependencies
├── Dockerfile           # Docker build configuration
├── Makefile             # Build automation
├── dist/                # Frontend build output (generated)
├── nanostatus.db        # SQLite database (generated)
├── src/                 # Frontend source code
│   ├── src/
│   │   ├── App.tsx      # Main React component
│   │   └── ...
│   └── package.json
└── README.md
```

## License

See LICENSE file for details.
