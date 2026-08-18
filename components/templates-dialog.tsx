"use client";

import * as React from "react";
import { Loader2, MessageSquareText, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TEMPLATE_PLACEHOLDERS, type TemplateDTO } from "@/lib/types";
import {
  useCreateTemplate,
  useDeleteTemplate,
  useTemplates,
  useUpdateTemplate,
} from "@/hooks/use-templates";

export function TemplatesDialog() {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TemplateDTO | "new" | null>(null);
  const [name, setName] = React.useState("");
  const [body, setBody] = React.useState("");
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);

  const { data, isLoading } = useTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const templates = data?.templates ?? [];
  const saving = createTemplate.isPending || updateTemplate.isPending;

  function startNew() {
    setName("");
    setBody("");
    setEditing("new");
  }

  function startEdit(template: TemplateDTO) {
    setName(template.name);
    setBody(template.body);
    setEditing(template);
  }

  function insertToken(token: string) {
    const el = bodyRef.current;
    if (!el) {
      setBody((b) => b + token);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + token.length;
    });
  }

  function handleSave() {
    if (!name.trim() || !body.trim()) return;
    if (editing === "new") {
      createTemplate.mutate(
        { name: name.trim(), body: body.trim() },
        { onSuccess: () => setEditing(null) }
      );
    } else if (editing) {
      updateTemplate.mutate(
        { id: editing.id, data: { name: name.trim(), body: body.trim() } },
        { onSuccess: () => setEditing(null) }
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setEditing(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <MessageSquareText className="h-3.5 w-3.5" /> Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Message templates</DialogTitle>
          <DialogDescription>
            Reusable outreach messages with placeholders that auto-fill from
            each lead when you personalize and send from its detail view.
          </DialogDescription>
        </DialogHeader>

        {editing ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="template-name" className="text-xs text-muted-foreground">
                Template name
              </Label>
              <Input
                id="template-name"
                placeholder="e.g. Dental clinic intro"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="template-body" className="text-xs text-muted-foreground">
                Message
              </Label>
              <Textarea
                id="template-body"
                ref={bodyRef}
                rows={10}
                placeholder="Hi Dr. [Name],..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Click to insert
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATE_PLACEHOLDERS.map((p) => (
                  <button
                    key={p.token}
                    type="button"
                    title={p.label}
                    onClick={() => insertToken(p.token)}
                    className="rounded-full border px-2.5 py-1 text-xs hover:bg-accent"
                  >
                    {p.token}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !name.trim() || !body.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save template"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={startNew}>
              <Plus className="h-3.5 w-3.5" /> New template
            </Button>

            {isLoading && (
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            )}

            {!isLoading && templates.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No templates yet — create one to start sending personalized
                messages from a lead's detail view.
              </p>
            )}

            <div className="max-h-[50vh] space-y-2 overflow-y-auto">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-start justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-medium">{template.name}</p>
                      {template.isDefault && (
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {template.body}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={
                        template.isDefault ? "Unset as default" : "Set as default"
                      }
                      title={
                        template.isDefault
                          ? "Default — auto-loads in every lead's message box"
                          : "Set as default"
                      }
                      disabled={updateTemplate.isPending}
                      onClick={() =>
                        updateTemplate.mutate({
                          id: template.id,
                          data: { isDefault: !template.isDefault },
                        })
                      }
                    >
                      <Star
                        className={cn(
                          "h-3.5 w-3.5",
                          template.isDefault && "fill-amber-400 text-amber-400"
                        )}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="Edit template"
                      onClick={() => startEdit(template)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      aria-label="Delete template"
                      disabled={deleteTemplate.isPending}
                      onClick={() => {
                        if (confirm(`Delete template "${template.name}"?`)) {
                          deleteTemplate.mutate(template.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
