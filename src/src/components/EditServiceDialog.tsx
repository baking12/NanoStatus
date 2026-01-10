import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Monitor, NewService } from "../types";

interface EditServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monitor: Monitor | null;
  editedService: NewService;
  onServiceChange: (service: NewService) => void;
  onUpdate: () => void;
}

export function EditServiceDialog({
  open,
  onOpenChange,
  monitor,
  editedService,
  onServiceChange,
  onUpdate,
}: EditServiceDialogProps) {
  if (!monitor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Service</DialogTitle>
          <DialogDescription className="text-slate-400">
            Update the service details below.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-name" className="text-slate-300">Service Name</Label>
            <Input
              id="edit-name"
              placeholder="My Service"
              value={editedService.name}
              onChange={(e) => onServiceChange({ ...editedService, name: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-url" className="text-slate-300">URL</Label>
            <Input
              id="edit-url"
              placeholder="https://example.com"
              value={editedService.url}
              onChange={(e) => onServiceChange({ ...editedService, url: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-icon" className="text-slate-300">Icon (optional)</Label>
            <Input
              id="edit-icon"
              placeholder="📧"
              value={editedService.icon}
              onChange={(e) => onServiceChange({ ...editedService, icon: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-checkInterval" className="text-slate-300">Check Interval (seconds)</Label>
            <Input
              id="edit-checkInterval"
              type="number"
              min="10"
              max="3600"
              placeholder="60"
              value={editedService.checkInterval}
              onChange={(e) => onServiceChange({ ...editedService, checkInterval: parseInt(e.target.value) || 60 })}
              className="bg-slate-800 border-slate-700 text-white"
            />
            <p className="text-xs text-slate-500">
              How often to check this service (10-3600 seconds, default: 60)
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="edit-thirdParty"
              checked={editedService.isThirdParty}
              onChange={(e) => onServiceChange({ ...editedService, isThirdParty: e.target.checked })}
              className="rounded border-slate-600 bg-slate-800"
            />
            <Label htmlFor="edit-thirdParty" className="text-sm font-normal text-slate-300">
              Third-party service
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-700 text-white hover:bg-slate-800 hover:text-white">
            Cancel
          </Button>
          <Button 
            onClick={onUpdate}
            disabled={!editedService.name || !editedService.url}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
          >
            Update Service
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

