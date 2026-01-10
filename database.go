package main

import (
	"database/sql"
	"log"
	"os"
	"path/filepath"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	_ "modernc.org/sqlite"
)

// initDB initializes the database connection and runs migrations
func initDB() {
	var err error
	// Use pure Go SQLite driver (no CGO required)
	// Database path can be set via DB_PATH env var, defaults to ./nanostatus.db
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./nanostatus.db"
	}
	
	// Ensure the directory exists (for Docker volumes)
	if dir := filepath.Dir(dbPath); dir != "." && dir != "" {
		if err := os.MkdirAll(dir, 0755); err != nil {
			log.Printf("Warning: Could not create database directory %s: %v", dir, err)
		}
	}
	
	// Enable WAL mode and configure connection pool for better concurrency
	// WAL mode allows multiple readers and one writer simultaneously
	// _busy_timeout sets how long to wait for locks (in milliseconds)
	dsn := dbPath + "?_journal_mode=WAL&_busy_timeout=5000&_foreign_keys=1"
	
	// Open database connection with modernc.org/sqlite
	sqlDB, err := sql.Open("sqlite", dsn)
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}

	// Configure connection pool for SQLite (single connection recommended)
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetMaxIdleConns(1)

	// Create GORM instance
	db, err = gorm.Open(sqlite.Dialector{Conn: sqlDB}, &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Auto-migrate schemas
	if err := db.AutoMigrate(&Monitor{}, &CheckHistory{}); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Printf("✅ Database initialized at %s", dbPath)

	// Seed initial data if database is empty
	var count int64
	db.Model(&Monitor{}).Count(&count)
	if count == 0 {
		seedData()
	}
}

// seedData creates initial sample monitors for testing
func seedData() {
	log.Println("Seeding initial data...")
	
	monitors := []Monitor{
		{
			Name:         "Example.com",
			URL:          "https://example.com",
			Status:       "up",
			ResponseTime: 229,
			LastCheck:    "5s ago",
			CheckInterval: 60,
		},
		{
			Name:         "Google",
			URL:          "https://google.com",
			Status:       "up",
			ResponseTime: 2097,
			LastCheck:    "1s ago",
			IsThirdParty: true,
			CheckInterval: 60,
		},
	}

	for _, monitor := range monitors {
		if err := db.Create(&monitor).Error; err != nil {
			log.Printf("Failed to seed monitor %s: %v", monitor.Name, err)
		}
	}

	log.Println("✅ Initial data seeded")
}

