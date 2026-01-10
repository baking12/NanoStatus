import { motion, AnimatePresence } from "framer-motion";
import { Pause, Edit, Trash2, Zap, TrendingUp, Activity, AlertCircle, BarChart3, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Monitor, ResponseTimeData } from "../types";

interface MonitorDetailsProps {
  monitor: Monitor;
  responseTimeData: ResponseTimeData[];
  onDelete: (id: string | number) => void;
}

export function MonitorDetails({ monitor, responseTimeData, onDelete }: MonitorDetailsProps) {
  const avgResponseTime = responseTimeData.length > 0
    ? Math.round(responseTimeData.reduce((sum, data) => sum + data.responseTime, 0) / responseTimeData.length)
    : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        <div className="rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 p-8 shadow-2xl shadow-black/30">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              {monitor.icon ? (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-4xl">
                  {monitor.icon}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-700/50 border border-slate-600/50">
                  <Globe className="h-8 w-8 text-slate-400" />
                </div>
              )}
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-1">
                  {monitor.name}
                </h2>
                <p className="text-slate-400">{monitor.url}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="border-slate-700/50 hover:bg-slate-800/50">
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
              <Button variant="outline" size="sm" className="border-slate-700/50 hover:bg-slate-800/50">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700"
                onClick={() => onDelete(monitor.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-semibold text-slate-400 uppercase">Current</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {monitor.status === "up" ? `${monitor.responseTime}ms` : "N/A"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-semibold text-slate-400 uppercase">Avg (24h)</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {avgResponseTime > 0 ? `${avgResponseTime}ms` : "N/A"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-400 uppercase">Uptime</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {monitor.uptime ? `${Math.round(monitor.uptime)}%` : "N/A"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-slate-400 uppercase">Status</span>
              </div>
              <Badge
                className={`${
                  monitor.status === "up"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                } border px-3 py-1`}
              >
                {monitor.status === "up" ? "Online" : "Offline"}
              </Badge>
            </div>
          </div>

          <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-6">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              <h3 className="text-lg font-bold text-white">Response Time History</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={responseTimeData}>
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis 
                  dataKey="time" 
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  stroke="#475569"
                />
                <YAxis 
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  stroke="#475569"
                  domain={[0, 1200]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#f1f5f9"
                  }}
                  formatter={(value: number | undefined) => [
                    value !== undefined ? `${value.toFixed(2)} ms` : "N/A",
                    "Response Time"
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="responseTime" 
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#colorGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

