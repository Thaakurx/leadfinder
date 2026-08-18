"use client";

import * as React from "react";
import { CheckCircle2, Loader2, Settings as SettingsIcon, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";

export function SettingsDialog() {
  const [open, setOpen] = React.useState(false);
  const [apiKey, setApiKey] = React.useState("");
  const { data } = useSettings();
  const updateSettings = useUpdateSettings();

  const status = data?.googlePlacesApiKey;

  function handleSave() {
    if (!apiKey.trim()) return;
    updateSettings.mutate(
      { googlePlacesApiKey: apiKey.trim() },
      { onSuccess: () => setApiKey("") }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Settings">
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Bring your own Google Cloud API key — no need to edit any files.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {status && (
            <div
              className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-xs"
            >
              {status.hasKey ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              ) : (
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              )}
              <span className="text-muted-foreground">
                {status.hasKey
                  ? status.source === "database"
                    ? "API key configured here in Settings."
                    : "API key loaded from .env.local. Save one below to switch to a Settings-managed key."
                  : "No API key configured yet — searches won't run until you add one."}
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="places-api-key" className="text-xs text-muted-foreground">
              Google Places API key
            </Label>
            <Input
              id="places-api-key"
              type="password"
              autoComplete="off"
              placeholder={status?.hasKey ? "•••••••••••••••• (unchanged)" : "Paste your API key"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Needs a Google Cloud project with <strong>Places API (New)</strong>{" "}
              and <strong>Geocoding API</strong> enabled, and billing turned
              on. Never displayed once saved — paste a new one here to
              replace it.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button
            onClick={handleSave}
            disabled={!apiKey.trim() || updateSettings.isPending}
          >
            {updateSettings.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save key"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
