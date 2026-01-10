import { AnimatePresence } from "framer-motion";
import { ServiceCard } from "./ServiceCard";
import { Monitor } from "../types";

interface ServicesGridProps {
  monitors: Monitor[];
  selectedMonitor: Monitor | null;
  onSelectMonitor: (monitor: Monitor) => void;
}

export function ServicesGrid({ monitors, selectedMonitor, onSelectMonitor }: ServicesGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <AnimatePresence>
        {monitors.map((monitor, index) => (
          <ServiceCard
            key={monitor.id}
            monitor={monitor}
            isSelected={selectedMonitor !== null && String(selectedMonitor.id) === String(monitor.id)}
            onClick={() => onSelectMonitor(monitor)}
            index={index}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

