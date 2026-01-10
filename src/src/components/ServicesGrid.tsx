import { AnimatePresence } from "framer-motion";
import { ServiceCard } from "./ServiceCard";
import type { Monitor } from "../types";

interface ServicesGridProps {
  monitors: Monitor[];
  selectedMonitor: Monitor | null;
  onSelectMonitor: (monitor: Monitor) => void;
}

export function ServicesGrid({ monitors, selectedMonitor, onSelectMonitor }: ServicesGridProps) {
  return (
    <>
      {/* Mobile/Tablet: Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
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
      {/* Desktop: Vertical list */}
      <div className="hidden lg:block space-y-3">
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
    </>
  );
}

