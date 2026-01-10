import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  Plus, 
  Pause, 
  Edit, 
  Trash2, 
  CheckCircle2,
  XCircle,
  Activity,
  TrendingUp,
  Clock,
  AlertCircle,
  Zap,
  Server
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import "./index.css";

interface Monitor {
  id: string | number;
  name: string;
  url: string;
  uptime: number;
  status: "up" | "down";
  responseTime: number;
  lastCheck: string;
  isThirdParty?: boolean;
  icon?: string;
  checkInterval?: number;
}

interface Stats {
  overallUptime: number;
  servicesUp: number;
  servicesDown: number;
  avgResponseTime: number;
}

interface ResponseTimeData {
  time: string;
  responseTime: number;
}

export function App() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(null);
  const [responseTimeData, setResponseTimeData] = useState<ResponseTimeData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newService, setNewService] = useState({
    name: "",
    url: "",
    isThirdParty: false,
    icon: "",
    checkInterval: 60,
  });

  const fetchMonitors = useCallback(async () => {
    try {
      const response = await fetch("/api/monitors?t=" + Date.now()); // Add cache busting
      const data = await response.json();
      setMonitors(data);
      
      // Update selected monitor if it exists, or select first monitor if none selected
      if (data.length > 0) {
        setSelectedMonitor((prev) => {
          if (prev) {
            // Find and update the selected monitor with latest data
            const updatedMonitor = data.find((m: Monitor) => String(m.id) === String(prev.id));
            if (updatedMonitor) {
              return updatedMonitor;
            }
          }
          // Selected monitor no longer exists or no previous selection, select first one
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
      const response = await fetch("/api/stats?t=" + Date.now()); // Add cache busting
      const data = await response.json();
      console.log("Stats updated:", data);
      setStats(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  const fetchResponseTimeData = useCallback(async (monitorId: string) => {
    try {
      const response = await fetch(`/api/response-time?id=${monitorId}&t=${Date.now()}`); // Add cache busting
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

      // Reset form and close dialog
      setNewService({ name: "", url: "", isThirdParty: false, icon: "", checkInterval: 60 });
      setDialogOpen(false);

      // Refresh monitors list
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

      // Clear selected monitor if it was deleted
      if (selectedMonitor && String(selectedMonitor.id) === String(monitorId)) {
        setSelectedMonitor(null);
      }

      // Refresh monitors list
      fetchMonitors();
      fetchStats();
    } catch (error) {
      console.error("Failed to delete service:", error);
      alert("Failed to delete service. Please try again.");
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchMonitors();
    fetchStats();
  }, [fetchMonitors, fetchStats]);

  // Poll monitors and stats every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMonitors();
      fetchStats();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [fetchMonitors, fetchStats]);

  // Fetch response time data when monitor is selected
  useEffect(() => {
    if (selectedMonitor) {
      fetchResponseTimeData(String(selectedMonitor.id));
    }
  }, [selectedMonitor, fetchResponseTimeData]);

  // Poll response time data every 10 seconds when monitor is selected
  useEffect(() => {
    if (!selectedMonitor) return;

    const interval = setInterval(() => {
      fetchResponseTimeData(String(selectedMonitor.id));
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [selectedMonitor, fetchResponseTimeData]);

  const filteredMonitors = monitors.filter(monitor =>
    monitor.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    return status === "up" ? "text-green-500" : "text-red-500";
  };

  const getStatusBgColor = (status: string) => {
    return status === "up" ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20";
  };

  return (
    <div className="dark min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">NanoStatus</h1>
              <p className="text-xs text-muted-foreground">
                Real-time monitoring dashboard
                {lastUpdate && (
                  <span className="ml-2">
                    • Updated {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-8 py-8">
        {/* Summary Stats */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
            <p className="text-muted-foreground mt-4">Loading...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 animate-fade-in">
              <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardContent className="pt-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Overall Status</p>
                      <p className="text-4xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                        {stats ? Math.round(stats.overallUptime) : 0}%
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 group-hover:scale-110 transition-transform">
                      <Activity className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardContent className="pt-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Services Up</p>
                      <p className="text-4xl font-bold text-green-500">{stats?.servicesUp || 0}</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-500/10 border border-green-500/20 group-hover:scale-110 transition-transform">
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardContent className="pt-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Services Down</p>
                      <p className="text-4xl font-bold text-red-500">{stats?.servicesDown || 0}</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-500/10 border border-red-500/20 group-hover:scale-110 transition-transform">
                      <XCircle className="h-6 w-6 text-red-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardContent className="pt-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Avg Response</p>
                      <p className="text-4xl font-bold bg-gradient-to-br from-blue-500 to-blue-400 bg-clip-text text-transparent">{stats?.avgResponseTime || 0}ms</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 border border-blue-500/20 group-hover:scale-110 transition-transform">
                      <TrendingUp className="h-6 w-6 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {filteredMonitors.map((monitor, index) => (
            <Card 
              key={monitor.id}
              className={`cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] border border-border/50 bg-card/50 backdrop-blur-sm group overflow-hidden relative animate-fade-in ${
                selectedMonitor && String(selectedMonitor.id) === String(monitor.id)
                  ? "ring-2 ring-primary/50 border-primary/50 shadow-xl shadow-primary/10" 
                  : getStatusBgColor(monitor.status)
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => setSelectedMonitor(monitor)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardHeader className="pb-4 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {monitor.icon ? (
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 group-hover:scale-110 transition-transform">
                        <span className="text-2xl">{monitor.icon}</span>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-muted/50 border border-border/50 group-hover:scale-110 transition-transform">
                        <Server className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold text-foreground mb-1">{monitor.name}</CardTitle>
                      <p className="text-xs text-muted-foreground truncate">{monitor.url}</p>
                    </div>
                  </div>
                  <div className={`p-2 rounded-xl border transition-all ${
                    monitor.status === "up" 
                      ? "bg-green-500/10 border-green-500/20 group-hover:bg-green-500/20" 
                      : "bg-red-500/10 border-red-500/20 group-hover:bg-red-500/20"
                  }`}>
                    {monitor.status === "up" ? (
                      <CheckCircle2 className={`h-5 w-5 ${getStatusColor(monitor.status)}`} />
                    ) : (
                      <XCircle className={`h-5 w-5 ${getStatusColor(monitor.status)}`} />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Uptime</span>
                    <span className="text-sm font-bold text-foreground">{Math.round(monitor.uptime)}%</span>
                  </div>
                  {monitor.status === "up" && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Response</span>
                      <span className="text-sm font-bold text-foreground">{monitor.responseTime}ms</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Last Check</span>
                    <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {monitor.lastCheck}
                    </span>
                  </div>
                  <div className="w-full bg-muted/50 rounded-full h-2.5 overflow-hidden border border-border/50">
                    <div 
                      className={`h-full transition-all duration-500 rounded-full ${
                        monitor.uptime === 100 ? "bg-gradient-to-r from-green-500 to-green-400" : 
                        monitor.uptime === 0 ? "bg-gradient-to-r from-red-500 to-red-400" : 
                        "bg-gradient-to-r from-yellow-500 to-yellow-400"
                      }`}
                      style={{ width: `${monitor.uptime}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

            {/* Selected Service Details */}
            {selectedMonitor && (
          <div className="space-y-8 animate-slide-in">
            <div className="flex items-center justify-between pb-6 border-b border-border/50">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  {selectedMonitor.icon ? (
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                      <span className="text-3xl">{selectedMonitor.icon}</span>
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl bg-muted/50 border border-border/50">
                      <Server className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">{selectedMonitor.name}</h2>
                    <p className="text-muted-foreground mt-1">{selectedMonitor.url}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" className="text-foreground border-border/50 hover:bg-muted/50 hover:border-border transition-all">
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
                <Button variant="outline" size="sm" className="text-foreground border-border/50 hover:bg-muted/50 hover:border-border transition-all">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30 transition-all"
                  onClick={() => selectedMonitor && deleteService(selectedMonitor.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardHeader className="pb-3 relative z-10">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    Current Response
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <p className="text-4xl font-bold bg-gradient-to-br from-yellow-500 to-yellow-400 bg-clip-text text-transparent">
                    {selectedMonitor.status === "up" ? `${selectedMonitor.responseTime}ms` : "N/A"}
                  </p>
                </CardContent>
              </Card>
              <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardHeader className="pb-3 relative z-10">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    Avg Response (24h)
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <p className="text-4xl font-bold bg-gradient-to-br from-blue-500 to-blue-400 bg-clip-text text-transparent">
                    {responseTimeData.length > 0
                      ? `${Math.round(
                          responseTimeData.reduce((sum, data) => sum + data.responseTime, 0) /
                            responseTimeData.length
                        )}ms`
                      : "N/A"}
                  </p>
                </CardContent>
              </Card>
              <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardHeader className="pb-3 relative z-10">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-500" />
                    Uptime (24h)
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <p className="text-4xl font-bold bg-gradient-to-br from-green-500 to-green-400 bg-clip-text text-transparent">
                    {selectedMonitor.uptime ? `${Math.round(selectedMonitor.uptime)}%` : "N/A"}
                  </p>
                </CardContent>
              </Card>
              <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardHeader className="pb-3 relative z-10">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-primary" />
                    Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <Badge
                    className={`${
                      selectedMonitor.status === "up"
                        ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/20"
                        : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/20"
                    } text-white px-5 py-2.5 text-base font-semibold border-0 transition-all`}
                  >
                    {selectedMonitor.status === "up" ? (
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                    ) : (
                      <XCircle className="h-5 w-5 mr-2" />
                    )}
                    {selectedMonitor.status === "up" ? "Online" : "Offline"}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {/* Response Time Chart */}
            <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-foreground flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  Response Time History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={responseTimeData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontWeight: 500 }}
                      stroke="hsl(var(--border))"
                      strokeWidth={1}
                      strokeOpacity={0.5}
                    />
                    <YAxis 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontWeight: 500 }}
                      stroke="hsl(var(--border))"
                      strokeWidth={1}
                      strokeOpacity={0.5}
                      domain={[0, 1200]}
                      label={{ value: 'ms', angle: -90, position: 'insideLeft', fill: "hsl(var(--muted-foreground))", style: { fontWeight: 500, fontSize: 12 } }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                        boxShadow: "0 10px 40px rgba(0,0,0,0.2)"
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                      formatter={(value: number | undefined) => [
                        value !== undefined ? `${value.toFixed(2)} ms` : "N/A",
                        "Response Time"
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="responseTime" 
                      stroke="url(#colorGradient)"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 7, fill: "#22c55e", stroke: "#fff", strokeWidth: 2 }}
                    />
                    <defs>
                      <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            </div>
            )}
          </>
        )}
      </div>

      {/* Add Service Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Service</DialogTitle>
            <DialogDescription>
              Add a new service to monitor. Enter the service name and URL.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Service Name</Label>
              <Input
                id="name"
                placeholder="My Service"
                value={newService.name}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                placeholder="https://example.com"
                value={newService.url}
                onChange={(e) => setNewService({ ...newService, url: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="icon">Icon (optional)</Label>
              <Input
                id="icon"
                placeholder="📧"
                value={newService.icon}
                onChange={(e) => setNewService({ ...newService, icon: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="checkInterval">Check Interval (seconds)</Label>
              <Input
                id="checkInterval"
                type="number"
                min="10"
                max="3600"
                placeholder="60"
                value={newService.checkInterval}
                onChange={(e) => setNewService({ ...newService, checkInterval: parseInt(e.target.value) || 60 })}
              />
              <p className="text-xs text-muted-foreground">
                How often to check this service (10-3600 seconds, default: 60)
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="thirdParty"
                checked={newService.isThirdParty}
                onChange={(e) => setNewService({ ...newService, isThirdParty: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="thirdParty" className="text-sm font-normal">
                Third-party service
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={createService}
              disabled={!newService.name || !newService.url}
            >
              Add Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
