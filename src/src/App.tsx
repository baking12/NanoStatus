import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Header } from "./components/Header";
import { StatsGrid } from "./components/StatsGrid";
import { ServicesGrid } from "./components/ServicesGrid";
import { MonitorDetails } from "./components/MonitorDetails";
import { AddServiceDialog } from "./components/AddServiceDialog";
import type { Monitor, Stats, ResponseTimeData, NewService } from "./types";
import "./index.css";

export function App() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(null);
  const [responseTimeData, setResponseTimeData] = useState<ResponseTimeData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newService, setNewService] = useState<NewService>({
    name: "",
    url: "",
    isThirdParty: false,
    icon: "",
    checkInterval: 60,
  });

  const fetchMonitors = useCallback(async () => {
    try {
      const response = await fetch("/api/monitors?t=" + Date.now());
      const data = await response.json();
      setMonitors(data);
      
      if (data.length > 0) {
        setSelectedMonitor((prev) => {
          if (prev) {
            const updatedMonitor = data.find((m: Monitor) => String(m.id) === String(prev.id));
            if (updatedMonitor) {
              return updatedMonitor;
            }
          }
          return data[0];
        });
      }
      setLoading(false);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Failed to fetch monitors:", error);
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/stats?t=" + Date.now());
      const data = await response.json();
      setStats(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  const fetchResponseTimeData = useCallback(async (monitorId: string) => {
    try {
      const response = await fetch(`/api/response-time?id=${monitorId}&t=${Date.now()}`);
      const data = await response.json();
      setResponseTimeData(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Failed to fetch response time data:", error);
    }
  }, []);

  const createService = async () => {
    try {
      const response = await fetch("/api/monitors/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newService),
      });

      if (!response.ok) {
        const error = await response.text();
        alert("Failed to create service: " + error);
        return;
      }

      setNewService({ name: "", url: "", isThirdParty: false, icon: "", checkInterval: 60 });
      setDialogOpen(false);
      fetchMonitors();
      fetchStats();
    } catch (error) {
      console.error("Failed to create service:", error);
      alert("Failed to create service. Please try again.");
    }
  };

  const deleteService = async (monitorId: string | number) => {
    if (!confirm("Are you sure you want to delete this service?")) {
      return;
    }

    try {
      const response = await fetch(`/api/monitor?id=${monitorId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.text();
        alert("Failed to delete service: " + error);
        return;
      }

      if (selectedMonitor && String(selectedMonitor.id) === String(monitorId)) {
        setSelectedMonitor(null);
      }

      fetchMonitors();
      fetchStats();
    } catch (error) {
      console.error("Failed to delete service:", error);
      alert("Failed to delete service. Please try again.");
    }
  };

  useEffect(() => {
    fetchMonitors();
    fetchStats();
  }, [fetchMonitors, fetchStats]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchMonitors();
      fetchStats();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchMonitors, fetchStats]);

  useEffect(() => {
    if (selectedMonitor) {
      fetchResponseTimeData(String(selectedMonitor.id));
    }
  }, [selectedMonitor, fetchResponseTimeData]);

  useEffect(() => {
    if (!selectedMonitor) return;

    const interval = setInterval(() => {
      fetchResponseTimeData(String(selectedMonitor.id));
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedMonitor, fetchResponseTimeData]);

  const filteredMonitors = monitors.filter(monitor =>
    monitor.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddService={() => setDialogOpen(true)}
        lastUpdate={lastUpdate}
      />

      <div className="container mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full"
            />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            <StatsGrid stats={stats} />
            <ServicesGrid
              monitors={filteredMonitors}
              selectedMonitor={selectedMonitor}
              onSelectMonitor={setSelectedMonitor}
            />
            {selectedMonitor && (
              <MonitorDetails
                monitor={selectedMonitor}
                responseTimeData={responseTimeData}
                onDelete={deleteService}
              />
            )}
          </motion.div>
        )}
      </div>

      <AddServiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        newService={newService}
        onServiceChange={setNewService}
        onCreate={createService}
      />
    </div>
  );
}

export default App;
