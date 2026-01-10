package main

import (
	"encoding/json"
	"log"
	"sync"
	"time"
)

// Cached stats for comparison to avoid unnecessary broadcasts
var (
	lastStats      *StatsResponse
	statsMu        sync.RWMutex
	statsUpdateCh  chan struct{}
	statsDebouncer *time.Timer
	debounceMu     sync.Mutex
)

// SSEClient represents a connected SSE client
type SSEClient struct {
	ID   string
	Send chan []byte
}

// SSEBroadcaster manages all SSE connections
type SSEBroadcaster struct {
	clients   map[string]*SSEClient
	mu        sync.RWMutex
	broadcast chan []byte
}

var sseBroadcaster = &SSEBroadcaster{
	clients:   make(map[string]*SSEClient),
	broadcast: make(chan []byte, 256),
}

// addClient adds a new SSE client
func (b *SSEBroadcaster) addClient(id string) *SSEClient {
	b.mu.Lock()
	defer b.mu.Unlock()
	client := &SSEClient{
		ID:   id,
		Send: make(chan []byte, 256),
	}
	b.clients[id] = client
	log.Printf("[SSE] Client connected: %s (total: %d)", id, len(b.clients))
	return client
}

// removeClient removes an SSE client
func (b *SSEBroadcaster) removeClient(id string) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if client, ok := b.clients[id]; ok {
		close(client.Send)
		delete(b.clients, id)
		log.Printf("[SSE] Client disconnected: %s (total: %d)", id, len(b.clients))
	}
}

// broadcastMessage sends a message to all connected clients
func (b *SSEBroadcaster) broadcastMessage(message []byte) {
	b.mu.RLock()
	defer b.mu.RUnlock()
	
	clientCount := len(b.clients)
	if clientCount == 0 {
		log.Printf("[SSE] No clients connected, dropping message (%d bytes)", len(message))
		return
	}
	
	sentCount := 0
	droppedCount := 0
	for id, client := range b.clients {
		select {
		case client.Send <- message:
			sentCount++
		default:
			droppedCount++
			log.Printf("[SSE] Client %s channel full, dropping message", id)
		}
	}
	
	log.Printf("[SSE] Broadcast: sent to %d/%d clients (%d bytes, %d dropped)", 
		sentCount, clientCount, len(message), droppedCount)
}

// broadcastUpdate broadcasts an update to all SSE clients
func broadcastUpdate(updateType string, data interface{}) {
	update := map[string]interface{}{
		"type": updateType,
		"data": data,
	}
	jsonData, err := json.Marshal(update)
	if err != nil {
		log.Printf("[SSE] ERROR: Failed to marshal %s update: %v", updateType, err)
		return
	}
	
	log.Printf("[SSE] Broadcasting %s update (%d bytes)", updateType, len(jsonData))
	go sseBroadcaster.broadcastMessage(jsonData)
}

// broadcastStatsIfChanged broadcasts stats only if they've changed (with debouncing)
func broadcastStatsIfChanged() {
	debounceMu.Lock()
	defer debounceMu.Unlock()
	
	// Reset debounce timer
	if statsDebouncer != nil {
		statsDebouncer.Stop()
	}
	
	// Debounce: wait 500ms after last monitor update before calculating stats
	statsDebouncer = time.AfterFunc(500*time.Millisecond, func() {
		newStats := getStats()
		
		statsMu.Lock()
		var oldUptime float64
		var oldUpInt, oldDownInt, oldAvgInt int
		if lastStats != nil {
			oldUptime = lastStats.OverallUptime
			oldUpInt = lastStats.ServicesUp
			oldDownInt = lastStats.ServicesDown
			oldAvgInt = lastStats.AvgResponseTime
		}
		
		changed := lastStats == nil || 
			lastStats.OverallUptime != newStats.OverallUptime ||
			lastStats.ServicesUp != newStats.ServicesUp ||
			lastStats.ServicesDown != newStats.ServicesDown ||
			lastStats.AvgResponseTime != newStats.AvgResponseTime
		
		if changed {
			log.Printf("[SSE] Stats changed - broadcasting update (uptime: %.2f%% -> %.2f%%, up: %d -> %d, down: %d -> %d, avg: %dms -> %dms)",
				oldUptime, newStats.OverallUptime,
				oldUpInt, newStats.ServicesUp,
				oldDownInt, newStats.ServicesDown,
				oldAvgInt, newStats.AvgResponseTime)
			lastStats = &newStats
			statsMu.Unlock()
			broadcastUpdate("stats_update", newStats)
		} else {
			statsMu.Unlock()
			log.Printf("[SSE] Stats unchanged, skipping broadcast")
		}
	})
}

