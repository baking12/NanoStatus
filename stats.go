package main

import (
	"database/sql"
	"log"
	"time"
)

// getStats calculates overall statistics from all monitors
func getStats() StatsResponse {
	var monitors []Monitor
	db.Find(&monitors)

	upCount := 0
	downCount := 0
	totalUptime := 0.0
	unpausedCount := 0

	for _, monitor := range monitors {
		// Skip paused monitors from all calculations
		if monitor.Paused {
			continue
		}
		
		unpausedCount++
		
		if monitor.Status == "up" {
			upCount++
		} else {
			downCount++
		}
		
		// Sum up all monitors' uptime percentages (calculated from 24h history)
		totalUptime += monitor.Uptime
	}

	// Calculate average response time from all check history in last 24 hours
	// This gives a more accurate average across all checks, not just the last check per monitor
	var avgResponseTime int
	twentyFourHoursAgo := time.Now().Add(-24 * time.Hour)
	
	// Use raw SQL query to get average response time (GORM uses snake_case for column names)
	var avgResult sql.NullFloat64
	var countResult int64
	
	// Get count first
	db.Model(&CheckHistory{}).
		Where("created_at > ? AND response_time > 0", twentyFourHoursAgo).
		Count(&countResult)
	
	if countResult > 0 {
		// Use raw SQL to ensure correct column name
		err := db.Raw(`
			SELECT AVG(response_time) as avg_response_time 
			FROM check_histories 
			WHERE created_at > ? AND response_time > 0
		`, twentyFourHoursAgo).Row().Scan(&avgResult)
		
		if err == nil && avgResult.Valid {
			avgResponseTime = int(avgResult.Float64)
			log.Printf("[Stats] Calculated avg response time from %d checks: %dms", countResult, avgResponseTime)
		} else {
			log.Printf("[Stats] Error calculating avg response time: %v (count: %d)", err, countResult)
		}
	} else {
		log.Printf("[Stats] No check history found in last 24 hours")
	}
	
	// Fallback: calculate from current monitor response times if no history or query failed
	if countResult == 0 || avgResponseTime == 0 {
		totalResponseTime := 0
		responseCount := 0
		for _, monitor := range monitors {
			// Skip paused monitors
			if monitor.Paused {
				continue
			}
			if monitor.ResponseTime > 0 {
				totalResponseTime += monitor.ResponseTime
				responseCount++
			}
		}
		if responseCount > 0 {
			avgResponseTime = totalResponseTime / responseCount
			log.Printf("[Stats] Using fallback: avg response time from %d monitors: %dms", responseCount, avgResponseTime)
		}
	}

	// Calculate overall uptime as average of all unpaused monitors' historical uptime percentages
	overallUptime := 0.0
	if unpausedCount > 0 {
		overallUptime = totalUptime / float64(unpausedCount)
	}

	return StatsResponse{
		OverallUptime:   overallUptime,
		ServicesUp:      upCount,
		ServicesDown:    downCount,
		AvgResponseTime: avgResponseTime,
	}
}

