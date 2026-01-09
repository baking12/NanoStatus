package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

//go:embed dist
var staticFiles embed.FS

var db *gorm.DB

type Monitor struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Name         string    `gorm:"not null" json:"name"`
	URL          string    `gorm:"not null" json:"url"`
	Uptime       float64   `gorm:"default:0" json:"uptime"`
	Status       string    `gorm:"default:unknown" json:"status"`
	ResponseTime int       `gorm:"default:0" json:"responseTime"`
	LastCheck    string    `gorm:"default:never" json:"lastCheck"`
	IsThirdParty bool      `gorm:"default:false" json:"isThirdParty,omitempty"`
	Icon         string    `json:"icon,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type CreateMonitorRequest struct {
	Name         string `json:"name"`
	URL          string `json:"url"`
	IsThirdParty bool   `json:"isThirdParty,omitempty"`
	Icon         string `json:"icon,omitempty"`
}

type StatsResponse struct {
	OverallUptime   float64 `json:"overallUptime"`
	ServicesUp      int     `json:"servicesUp"`
	ServicesDown    int     `json:"servicesDown"`
	AvgResponseTime int     `json:"avgResponseTime"`
}

type CheckHistory struct {
	ID           uint      `gorm:"primaryKey"`
	MonitorID    uint      `gorm:"not null;index"`
	Status       string    `gorm:"not null"`
	ResponseTime int       `gorm:"default:0"`
	CreatedAt    time.Time `gorm:"index"`
}

type ResponseTimeData struct {
	Time         string  `json:"time"`
	ResponseTime float64 `json:"responseTime"`
}

func initDB() {
	var err error
	db, err = gorm.Open(sqlite.Open("nanostatus.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Auto migrate
	err = db.AutoMigrate(&Monitor{}, &CheckHistory{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	// Seed initial data if database is empty
	var count int64
	db.Model(&Monitor{}).Count(&count)
	if count == 0 {
		seedData()
	}
}

func seedData() {
	monitors := []Monitor{
		{
			Name:         "Check Port",
			URL:          "https://checkport.example.com",
			Uptime:       100,
			Status:       "up",
			ResponseTime: 145,
			LastCheck:    "2s ago",
		},
		{
			Name:         "Example.com",
			URL:          "https://example.com",
			Uptime:       100,
			Status:       "up",
			ResponseTime: 89,
			LastCheck:    "5s ago",
		},
		{
			Name:         "Google",
			URL:          "https://google.com",
			Uptime:       100,
			Status:       "up",
			ResponseTime: 67,
			LastCheck:    "1s ago",
			IsThirdParty: true,
		},
		{
			Name:         "MySQL",
			URL:          "mysql://localhost:3306",
			Uptime:       100,
			Status:       "up",
			ResponseTime: 12,
			LastCheck:    "3s ago",
		},
		{
			Name:         "Ping",
			URL:          "ping://8.8.8.8",
			Uptime:       100,
			Status:       "up",
			ResponseTime: 23,
			LastCheck:    "1s ago",
		},
	}

	for _, monitor := range monitors {
		db.Create(&monitor)
	}
	log.Println("✅ Seeded initial data")
}

func getStats() StatsResponse {
	var monitors []Monitor
	db.Find(&monitors)

	upCount := 0
	downCount := 0
	totalResponseTime := 0
	upResponseCount := 0

	for _, monitor := range monitors {
		if monitor.Status == "up" {
			upCount++
			totalResponseTime += monitor.ResponseTime
			upResponseCount++
		} else {
			downCount++
		}
	}

	avgResponseTime := 0
	if upResponseCount > 0 {
		avgResponseTime = totalResponseTime / upResponseCount
	}

	overallUptime := 0.0
	if len(monitors) > 0 {
		overallUptime = float64(upCount) / float64(len(monitors)) * 100
	}

	return StatsResponse{
		OverallUptime:   overallUptime,
		ServicesUp:      upCount,
		ServicesDown:    downCount,
		AvgResponseTime: avgResponseTime,
	}
}

func checkService(monitor *Monitor) {
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	start := time.Now()
	var status string
	var responseTime int

	// Parse URL and handle different protocols
	serviceURL := monitor.URL
	if !strings.HasPrefix(serviceURL, "http://") && !strings.HasPrefix(serviceURL, "https://") {
		if strings.HasPrefix(serviceURL, "ping://") {
			// For ping, we'll just mark as up for now (would need ping library for real ping)
			status = "up"
			responseTime = 10
		} else {
			// Default to https
			serviceURL = "https://" + serviceURL
		}
	}

	// Validate URL
	parsedURL, err := url.Parse(serviceURL)
	if err != nil || parsedURL.Host == "" {
		status = "down"
		responseTime = 0
	} else {
		// Make HTTP request
		req, err := http.NewRequest("GET", serviceURL, nil)
		if err != nil {
			status = "down"
			responseTime = 0
		} else {
			req.Header.Set("User-Agent", "NanoStatus/1.0")
			resp, err := client.Do(req)
			elapsed := time.Since(start)
			responseTime = int(elapsed.Milliseconds())

			if err != nil {
				status = "down"
				responseTime = 0
			} else {
				resp.Body.Close()
				if resp.StatusCode >= 200 && resp.StatusCode < 400 {
					status = "up"
				} else {
					status = "down"
				}
			}
		}
	}

	// Save check history
	checkHistory := CheckHistory{
		MonitorID:    monitor.ID,
		Status:       status,
		ResponseTime: responseTime,
		CreatedAt:    time.Now(),
	}
	db.Create(&checkHistory)

	// Update monitor with latest check
	now := time.Now()
	lastCheck := "just now"
	if now.Sub(monitor.UpdatedAt) > time.Minute {
		minutes := int(now.Sub(monitor.UpdatedAt).Minutes())
		if minutes < 60 {
			lastCheck = fmt.Sprintf("%dm ago", minutes)
		} else {
			hours := minutes / 60
			lastCheck = fmt.Sprintf("%dh ago", hours)
		}
	}

	// Calculate uptime from last 24 hours of checks
	var upCount, totalCount int64
	twentyFourHoursAgo := now.Add(-24 * time.Hour)
	db.Model(&CheckHistory{}).
		Where("monitor_id = ? AND created_at > ?", monitor.ID, twentyFourHoursAgo).
		Count(&totalCount)
	
	if totalCount > 0 {
		db.Model(&CheckHistory{}).
			Where("monitor_id = ? AND created_at > ? AND status = ?", monitor.ID, twentyFourHoursAgo, "up").
			Count(&upCount)
		monitor.Uptime = float64(upCount) / float64(totalCount) * 100
	} else {
		// If no checks in last 24h, use current status
		if status == "up" {
			monitor.Uptime = 100.0
		} else {
			monitor.Uptime = 0.0
		}
	}

	// Update monitor
	monitor.Status = status
	monitor.ResponseTime = responseTime
	monitor.LastCheck = lastCheck
	monitor.UpdatedAt = now
	db.Save(monitor)
}

func checkAllServices() {
	var monitors []Monitor
	db.Find(&monitors)

	for i := range monitors {
		checkService(&monitors[i])
		// Small delay between checks to avoid overwhelming servers
		time.Sleep(500 * time.Millisecond)
	}
}

func startChecker() {
	// Check immediately on startup
	checkAllServices()

	// Then check every 60 seconds
	ticker := time.NewTicker(60 * time.Second)
	go func() {
		for range ticker.C {
			checkAllServices()
		}
	}()
}

func getResponseTimeData(monitorID string) []ResponseTimeData {
	id, err := strconv.ParseUint(monitorID, 10, 32)
	if err != nil {
		return []ResponseTimeData{}
	}

	// Get last 50 checks from database
	var checks []CheckHistory
	db.Where("monitor_id = ?", id).
		Order("created_at DESC").
		Limit(50).
		Find(&checks)

	// Reverse to show chronological order
	data := make([]ResponseTimeData, len(checks))
	for i := len(checks) - 1; i >= 0; i-- {
		check := checks[i]
		data[len(checks)-1-i] = ResponseTimeData{
			Time:         check.CreatedAt.Format("03:04 PM"),
			ResponseTime: float64(check.ResponseTime),
		}
	}

	// If we don't have enough data, pad with empty entries
	if len(data) < 50 {
		padded := make([]ResponseTimeData, 50)
		copy(padded[50-len(data):], data)
		return padded
	}

	return data
}

func apiMonitors(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if r.Method == http.MethodGet {
		var monitors []Monitor
		db.Find(&monitors)
		json.NewEncoder(w).Encode(monitors)
		return
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

func apiCreateMonitor(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req CreateMonitorRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.URL == "" {
		http.Error(w, "Name and URL are required", http.StatusBadRequest)
		return
	}

	monitor := Monitor{
		Name:         req.Name,
		URL:          req.URL,
		IsThirdParty: req.IsThirdParty,
		Icon:         req.Icon,
		Status:       "unknown",
		Uptime:       0,
		ResponseTime: 0,
		LastCheck:    "never",
	}

	if err := db.Create(&monitor).Error; err != nil {
		http.Error(w, "Failed to create monitor", http.StatusInternalServerError)
		return
	}

	// Immediately check the new monitor
	go checkService(&monitor)

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(monitor)
}

func apiStats(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	stats := getStats()
	json.NewEncoder(w).Encode(stats)
}

func apiResponseTime(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	monitorID := r.URL.Query().Get("id")
	if monitorID == "" {
		monitorID = "1"
	}

	data := getResponseTimeData(monitorID)
	json.NewEncoder(w).Encode(data)
}

func apiMonitor(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method == http.MethodGet {
		w.Header().Set("Content-Type", "application/json")
		id := r.URL.Query().Get("id")
		if id == "" {
			http.Error(w, "Missing id parameter", http.StatusBadRequest)
			return
		}

		var monitor Monitor
		monitorID, err := strconv.ParseUint(id, 10, 32)
		if err != nil {
			http.Error(w, "Invalid id parameter", http.StatusBadRequest)
			return
		}

		if err := db.First(&monitor, monitorID).Error; err != nil {
			http.Error(w, "Monitor not found", http.StatusNotFound)
			return
		}

		json.NewEncoder(w).Encode(monitor)
		return
	}

	if r.Method == http.MethodDelete {
		id := r.URL.Query().Get("id")
		if id == "" {
			http.Error(w, "Missing id parameter", http.StatusBadRequest)
			return
		}

		monitorID, err := strconv.ParseUint(id, 10, 32)
		if err != nil {
			http.Error(w, "Invalid id parameter", http.StatusBadRequest)
			return
		}

		// Check if monitor exists first
		var monitor Monitor
		if err := db.First(&monitor, monitorID).Error; err != nil {
			http.Error(w, "Monitor not found", http.StatusNotFound)
			return
		}

		if err := db.Delete(&Monitor{}, monitorID).Error; err != nil {
			http.Error(w, "Failed to delete monitor", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusNoContent)
		return
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

func main() {
	// Initialize database
	initDB()

	// Start background checker
	startChecker()

	// API routes
	http.HandleFunc("/api/monitors", apiMonitors)
	http.HandleFunc("/api/monitors/create", apiCreateMonitor)
	http.HandleFunc("/api/stats", apiStats)
	http.HandleFunc("/api/response-time", apiResponseTime)
	http.HandleFunc("/api/monitor", apiMonitor)

	// Serve static files
	staticFS, err := fs.Sub(staticFiles, "dist")
	if err != nil {
		log.Fatal("Failed to create sub filesystem:", err)
	}

	fileServer := http.FileServer(http.FS(staticFS))

	// Handle SPA routing - serve index.html for all non-API routes
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Don't serve index.html for API routes
		if strings.HasPrefix(r.URL.Path, "/api") {
			http.NotFound(w, r)
			return
		}

		// Try to serve the requested file
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}

		file, err := staticFS.Open(path)
		if err == nil {
			file.Close()
			fileServer.ServeHTTP(w, r)
			return
		}

		// If file doesn't exist, serve index.html for SPA routing
		index, err := staticFS.Open("index.html")
		if err != nil {
			http.NotFound(w, r)
			return
		}
		defer index.Close()

		// Read the file content
		content, err := io.ReadAll(index)
		if err != nil {
			http.Error(w, "Error reading index.html", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "text/html")
		w.Write(content)
	})

	port := ":8080"
	if envPort := os.Getenv("PORT"); envPort != "" {
		port = ":" + envPort
	}

	log.Printf("🚀 Server starting on port %s", port)
	log.Println("📊 API endpoints:")
	log.Println("   GET /api/monitors - List all monitors")
	log.Println("   POST /api/monitors/create - Create a new monitor")
	log.Println("   GET /api/stats - Get overall statistics")
	log.Println("   GET /api/response-time?id=<id> - Get response time data")
	log.Println("   GET /api/monitor?id=<id> - Get specific monitor")
	log.Println("   DELETE /api/monitor?id=<id> - Delete a monitor")
	log.Fatal(http.ListenAndServe(port, nil))
}
