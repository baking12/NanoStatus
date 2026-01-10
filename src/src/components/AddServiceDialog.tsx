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
import type { NewService } from "../types";

interface AddServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newService: NewService;
  onServiceChange: (service: NewService) => void;
  onCreate: () => void;
}

export function AddServiceDialog({
  open,
  onOpenChange,
  newService,
  onServiceChange,
  onCreate,
}: AddServiceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Add New Service</DialogTitle>
          <DialogDescription className="text-slate-400">
            Add a new service to monitor. Enter the service name and URL.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-slate-300">Service Name</Label>
            <Input
              id="name"
              placeholder="My Service"
              value={newService.name}
              onChange={(e) => onServiceChange({ ...newService, name: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="url" className="text-slate-300">URL</Label>
            <Input
              id="url"
              placeholder="https://example.com"
              value={newService.url}
              onChange={(e) => onServiceChange({ ...newService, url: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="icon" className="text-slate-300">Icon (optional)</Label>
            <Input
              id="icon"
              placeholder="📧"
              value={newService.icon}
              onChange={(e) => onServiceChange({ ...newService, icon: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="checkInterval" className="text-slate-300">Check Interval (seconds)</Label>
            <Input
              id="checkInterval"
              type="number"
              min="10"
              max="3600"
              placeholder="60"
              value={newService.checkInterval}
              onChange={(e) => onServiceChange({ ...newService, checkInterval: parseInt(e.target.value) || 60 })}
              className="bg-slate-800 border-slate-700 text-white"
            />
            <p className="text-xs text-slate-500">
              How often to check this service (10-3600 seconds, default: 60)
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="thirdParty"
              checked={newService.isThirdParty}
              onChange={(e) => onServiceChange({ ...newService, isThirdParty: e.target.checked })}
              className="rounded border-slate-600 bg-slate-800"
            />
            <Label htmlFor="thirdParty" className="text-sm font-normal text-slate-300">
              Third-party service
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-700">
            Cancel
          </Button>
          <Button 
            onClick={onCreate}
            disabled={!newService.name || !newService.url}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            Add Service
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

