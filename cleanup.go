package main

import (
	"log"
	"time"
)

// cleanOldCheckHistory removes check history records older than 1 year
func cleanOldCheckHistory() {
	oneYearAgo := time.Now().Add(-365 * 24 * time.Hour)
	
	log.Printf("[Cleanup] Starting cleanup of check history older than %s", oneYearAgo.Format("2006-01-02 15:04:05"))
	
	var deletedCount int64
	result := db.Where("created_at < ?", oneYearAgo).Delete(&CheckHistory{})
	
	if result.Error != nil {
		log.Printf("[Cleanup] ERROR: Failed to clean old check history: %v", result.Error)
		return
	}
	
	deletedCount = result.RowsAffected
	log.Printf("[Cleanup] Successfully deleted %d check history records older than 1 year", deletedCount)
}

// startCleanupScheduler starts a background job that runs cleanup daily at midnight
func startCleanupScheduler() {
	// Calculate time until next midnight
	now := time.Now()
	nextMidnight := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
	durationUntilMidnight := nextMidnight.Sub(now)
	
	log.Printf("[Cleanup] Cleanup scheduler started. Next cleanup at: %s (in %v)", 
		nextMidnight.Format("2006-01-02 15:04:05"), durationUntilMidnight)
	
	// Wait until midnight
	time.Sleep(durationUntilMidnight)
	
	// Run cleanup immediately at midnight
	cleanOldCheckHistory()
	
	// Then run cleanup every 24 hours
	ticker := time.NewTicker(24 * time.Hour)
	go func() {
		for range ticker.C {
			cleanOldCheckHistory()
		}
	}()
}

