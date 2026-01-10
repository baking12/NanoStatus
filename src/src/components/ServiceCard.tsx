import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Server } from "lucide-react";
import { Monitor } from "../types";

interface ServiceCardProps {
  monitor: Monitor;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}

export function ServiceCard({ monitor, isSelected, onClick, index }: ServiceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      whileHover={{ scale: 1.02, y: -4 }}
      onClick={onClick}
      className={`relative group cursor-pointer rounded-2xl overflow-hidden border transition-all duration-300 ${
        isSelected
          ? "border-blue-500/50 bg-gradient-to-br from-blue-500/10 to-purple-500/10 shadow-2xl shadow-blue-500/20"
          : "border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 hover:border-slate-600/50"
      } backdrop-blur-xl shadow-xl shadow-black/20`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {monitor.icon ? (
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-2xl">
                {monitor.icon}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-700/50 border border-slate-600/50">
                <Server className="h-5 w-5 text-slate-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-white mb-1 truncate">{monitor.name}</h3>
              <p className="text-xs text-slate-400 truncate">{monitor.url}</p>
            </div>
          </div>
          <div className={`p-2 rounded-lg ${
            monitor.status === "up" 
              ? "bg-emerald-500/20 border border-emerald-500/30" 
              : "bg-rose-500/20 border border-rose-500/30"
          }`}>
            {monitor.status === "up" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : (
              <XCircle className="h-5 w-5 text-rose-400" />
            )}
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Uptime</span>
            <span className="font-bold text-white">{Math.round(monitor.uptime)}%</span>
          </div>
          {monitor.status === "up" && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Response</span>
              <span className="font-bold text-white">{monitor.responseTime}ms</span>
            </div>
          )}
          <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${monitor.uptime}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full ${
                monitor.uptime === 100 ? "bg-gradient-to-r from-emerald-500 to-emerald-400" :
                monitor.uptime === 0 ? "bg-gradient-to-r from-rose-500 to-rose-400" :
                "bg-gradient-to-r from-amber-500 to-amber-400"
              }`}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

