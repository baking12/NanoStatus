package main

import (
	"fmt"
	"log"
	"os"

	"gopkg.in/yaml.v3"
)

// MonitorConfig represents a monitor in the YAML configuration
type MonitorConfig struct {
	Name         string `yaml:"name"`
	URL          string `yaml:"url"`
	Icon         string `yaml:"icon,omitempty"`
	CheckInterval int   `yaml:"checkInterval,omitempty"`
	IsThirdParty bool   `yaml:"isThirdParty,omitempty"`
	Paused       bool   `yaml:"paused,omitempty"`
}

// ConfigFile represents the root of the YAML configuration
type ConfigFile struct {
	Monitors []MonitorConfig `yaml:"monitors"`
}

// loadMonitorsFromYAML loads monitors from a YAML configuration file
func loadMonitorsFromYAML(configPath string) ([]Monitor, error) {
	if configPath == "" {
		return nil, nil // No config file specified
	}

	// Check if file exists
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		log.Printf("[Config] Configuration file not found: %s", configPath)
		return nil, nil
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var config ConfigFile
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse YAML: %w", err)
	}

	monitors := make([]Monitor, 0, len(config.Monitors))
	for _, cfg := range config.Monitors {
		// Validate required fields
		if cfg.Name == "" || cfg.URL == "" {
			log.Printf("[Config] Skipping monitor with missing name or URL")
			continue
		}

		// Set default check interval
		checkInterval := cfg.CheckInterval
		if checkInterval <= 0 {
			checkInterval = 60
		}

		monitor := Monitor{
			Name:         cfg.Name,
			URL:          cfg.URL,
			Icon:         cfg.Icon,
			CheckInterval: checkInterval,
			IsThirdParty: cfg.IsThirdParty,
			Paused:       cfg.Paused,
			Status:       "unknown",
			Uptime:       0,
			ResponseTime: 0,
			LastCheck:    "never",
		}

		monitors = append(monitors, monitor)
	}

	log.Printf("[Config] Loaded %d monitors from %s", len(monitors), configPath)
	return monitors, nil
}

