"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Archive,
  AtSign,
  Check,
  Contact,
  Copy,
  Facebook,
  Ghost,
  Globe,
  Instagram,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  Phone,
  Pin,
  Send,
  Sparkles,
  Star,
  Twitter,
  X,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  LEAD_STATUSES,
  type LeadDTO,
  type LeadStatus,
  type SocialPlatform,
} from "@/lib/types";
import { cn, formatPriceLevel, whatsappLink } from "@/lib/utils";
import { renderTemplate } from "@/lib/message-template";
import { useEnrichLead, useUpdateLead } from "@/hooks/use-leads";
import { useTemplates } from "@/hooks/use-templates";

interface LeadDetailDrawerProps {
  lead: LeadDTO | null;
  onOpenChange: (open: boolean) => void;
}

const SOCIAL_META: Record<SocialPlatform, { icon: LucideIcon; label: string }> = {
  facebook: { icon: Facebook, label: "Facebook" },
  instagram: { icon: Instagram, label: "Instagram" },
  linkedin: { icon: Linkedin, label: "LinkedIn" },
  twitter: { icon: Twitter, label: "X / Twitter" },
  youtube: { icon: Youtube, label: "YouTube" },
  tiktok: { icon: Music2, label: "TikTok" },
  whatsapp: { icon: MessageCircle, label: "WhatsApp" },
  pinterest: { icon: Pin, label: "Pinterest" },
  telegram: { icon: Send, label: "Telegram" },
  threads: { icon: AtSign, label: "Threads" },
  snapchat: { icon: Ghost, label: "Snapchat" },
  discord: { icon: MessageCircle, label: "Discord" },
};

function googleMapsUrl(placeId: string): string {
  return `https://www.google.com/maps/place/?q=place_id:${placeId}`;
}

export function LeadDetailDrawer({ lead, onOpenChange }: LeadDetailDrawerProps) {
  const updateLead = useUpdateLead();
  const enrichLead = useEnrichLead();
  const { data: templatesData } = useTemplates();
  const templates = templatesData?.templates ?? [];
  const [notes, setNotes] = React.useState(lead?.notes ?? "");
  const [assignedTo, setAssignedTo] = React.useState(lead?.assignedTo ?? "");
  const [contactName, setContactName] = React.useState(lead?.contactName ?? "");
  const [tagInput, setTagInput] = React.useState("");
  const [selectedTemplateId, setSelectedTemplateId] = React.useState("");
  const [messageDraft, setMessageDraft] = React.useState("");

  React.useEffect(() => {
    setNotes(lead?.notes ?? "");
    setAssignedTo(lead?.assignedTo ?? "");
    setContactName(lead?.contactName ?? "");
  }, [lead?.id, lead?.notes, lead?.assignedTo, lead?.contactName]);

  const defaultTemplate = templates.find((t) => t.isDefault) ?? null;

  // Reset the composer only when switching leads — not on every unrelated
  // save (notes/assignedTo/contactName), which would otherwise wipe an
  // in-progress draft. Depending on defaultTemplate?.id (not the whole list)
  // means this still fires once the default template finishes loading, even
  // if that happens after the drawer already opened for this lead.
  React.useEffect(() => {
    if (lead && defaultTemplate) {
      setSelectedTemplateId(defaultTemplate.id);
      setMessageDraft(renderTemplate(defaultTemplate.body, lead));
    } else {
      setSelectedTemplateId("");
      setMessageDraft("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id, defaultTemplate?.id]);

  function applyTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (!template || !lead) return;
    setMessageDraft(
      renderTemplate(template.body, { ...lead, contactName: contactName || lead.contactName })
    );
  }

  async function copyMessage() {
    await navigator.clipboard.writeText(messageDraft);
    toast.success("Message copied");
  }

  function addTag() {
    if (!lead) return;
    const value = tagInput.trim();
    if (!value || lead.tags.includes(value)) return;
    updateLead.mutate({ id: lead.id, data: { tags: [...lead.tags, value] } });
    setTagInput("");
  }

  function removeTag(tag: string) {
    if (!lead) return;
    updateLead.mutate({ id: lead.id, data: { tags: lead.tags.filter((t) => t !== tag) } });
  }

  return (
    <Sheet open={!!lead} onOpenChange={onOpenChange}>
      <SheetContent hideClose className="w-full overflow-y-auto p-0 sm:max-w-lg">
        {lead && (
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b px-6 py-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-semibold leading-tight">
                    {lead.name}
                  </h2>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {lead.category.slice(0, 3).join(" · ") || "Uncategorized"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Toggle favourite"
                    onClick={() =>
                      updateLead.mutate({ id: lead.id, data: { favourite: !lead.favourite } })
                    }
                  >
                    <Star
                      className={cn(
                        "h-4 w-4",
                        lead.favourite && "fill-amber-400 text-amber-400"
                      )}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Toggle archived"
                    onClick={() =>
                      updateLead.mutate({ id: lead.id, data: { archived: !lead.archived } })
                    }
                  >
                    <Archive className={cn("h-4 w-4", lead.archived && "text-foreground")} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Close"
                    onClick={() => onOpenChange(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {lead.rating != null && (
                  <span className="flex items-center gap-1 text-sm font-medium">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {lead.rating.toFixed(1)}
                    <span className="font-normal text-muted-foreground">
                      ({lead.reviewCount ?? 0})
                    </span>
                  </span>
                )}
                {lead.businessStatus && (
                  <Badge
                    variant={lead.businessStatus === "OPERATIONAL" ? "success" : "warning"}
                    className="text-[10px]"
                  >
                    {lead.businessStatus.replaceAll("_", " ").toLowerCase()}
                  </Badge>
                )}
                {lead.businessSizeEstimate && (
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {lead.businessSizeEstimate}
                  </Badge>
                )}
                {formatPriceLevel(lead.priceLevel) && (
                  <Badge variant="outline" className="text-[10px]">
                    {formatPriceLevel(lead.priceLevel)}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-6 px-6 py-5">
              {/* Contact card — the essentials, front and center */}
              <div className="space-y-0.5 rounded-lg border">
                {lead.phone && (
                  <div className="flex items-center border-b last:border-b-0">
                    <a
                      href={`tel:${lead.phone}`}
                      className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-sm"
                    >
                      <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{lead.phone}</span>
                    </a>
                    <button
                      type="button"
                      title="Copy number"
                      onClick={() => {
                        navigator.clipboard.writeText(lead.phone as string);
                        toast.success("Number copied");
                      }}
                      className="mr-2 shrink-0 rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-2 border-b px-3 py-2.5 text-sm last:border-b-0">
                    <a
                      href={
                        lead.hasWhatsapp === false
                          ? `tel:${lead.phone}`
                          : whatsappLink(lead.phone)
                      }
                      target={lead.hasWhatsapp === false ? undefined : "_blank"}
                      rel={lead.hasWhatsapp === false ? undefined : "noopener noreferrer"}
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-2.5 truncate",
                        lead.hasWhatsapp === false ? "text-muted-foreground" : "text-blue-600"
                      )}
                    >
                      {lead.hasWhatsapp === false ? (
                        <Contact className="h-4 w-4 shrink-0" />
                      ) : (
                        <MessageCircle className="h-4 w-4 shrink-0" />
                      )}
                      <span className="truncate">
                        {lead.hasWhatsapp === false
                          ? "No WhatsApp — call instead"
                          : "Message on WhatsApp"}
                      </span>
                    </a>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        title="Confirm this number has WhatsApp"
                        onClick={() =>
                          updateLead.mutate({
                            id: lead.id,
                            data: { hasWhatsapp: lead.hasWhatsapp === true ? null : true },
                          })
                        }
                        className={cn(
                          "rounded p-1 hover:bg-accent",
                          lead.hasWhatsapp === true
                            ? "text-emerald-600"
                            : "text-muted-foreground"
                        )}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Mark as no WhatsApp"
                        onClick={() =>
                          updateLead.mutate({
                            id: lead.id,
                            data: { hasWhatsapp: lead.hasWhatsapp === false ? null : false },
                          })
                        }
                        className={cn(
                          "rounded p-1 hover:bg-accent",
                          lead.hasWhatsapp === false
                            ? "text-destructive"
                            : "text-muted-foreground"
                        )}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
                {lead.website && (
                  <ContactLine icon={Globe} href={lead.website} external>
                    {lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </ContactLine>
                )}
                {lead.address && (
                  <ContactLine icon={MapPin}>{lead.address}</ContactLine>
                )}
                <ContactLine
                  icon={Pin}
                  href={googleMapsUrl(lead.placeId)}
                  external
                  accent
                >
                  View on Google Maps
                </ContactLine>
              </div>

              {lead.companyDescription && (
                <section>
                  <Label className="text-xs text-muted-foreground">About</Label>
                  <p className="mt-1 text-sm">{lead.companyDescription}</p>
                </section>
              )}

              {lead.openingHours && lead.openingHours.length > 0 && (
                <section>
                  <Label className="text-xs text-muted-foreground">
                    Opening hours
                  </Label>
                  <ul className="mt-1 space-y-0.5 text-sm">
                    {lead.openingHours.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </section>
              )}

              <Separator />

              {/* Enrichment */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">
                      Enrichment
                    </Label>
                    <Badge variant="outline" className="text-[10px]">
                      {lead.enrichmentStatus}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={enrichLead.isPending}
                    onClick={() => enrichLead.mutate(lead.id)}
                  >
                    {enrichLead.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Re-crawl website
                  </Button>
                </div>

                {lead.enrichmentError && (
                  <p className="text-xs text-destructive">{lead.enrichmentError}</p>
                )}

                {lead.emails.length > 0 && (
                  <div className="space-y-1">
                    {lead.emails.map((email) => (
                      <div key={email} className="flex items-center gap-2 text-sm">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <a
                          href={`mailto:${email}`}
                          className="truncate text-blue-600 hover:underline"
                        >
                          {email}
                        </a>
                        {lead.emailVerified && (
                          <Badge
                            variant={
                              lead.emailVerified === "valid"
                                ? "success"
                                : lead.emailVerified === "invalid"
                                  ? "destructive"
                                  : "outline"
                            }
                            className="shrink-0 text-[10px]"
                          >
                            {lead.emailVerified}
                          </Badge>
                        )}
                      </div>
                    ))}
                    <p className="text-[11px] text-muted-foreground">
                      Verified = syntax + MX record only, not mailbox deliverability.
                    </p>
                  </div>
                )}

                {Object.keys(lead.socialLinks).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.entries(lead.socialLinks) as [SocialPlatform, string][]).map(
                      ([platform, url]) => {
                        const meta = SOCIAL_META[platform];
                        const Icon = meta?.icon;
                        return (
                          <a
                            key={platform}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={meta?.label ?? platform}
                            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-accent"
                          >
                            {Icon && <Icon className="h-3.5 w-3.5" />}
                            {meta?.label ?? platform}
                          </a>
                        );
                      }
                    )}
                  </div>
                )}

                {(lead.bookingLink || lead.menuLink) && (
                  <div className="flex flex-wrap gap-1.5">
                    {lead.bookingLink && (
                      <a
                        href={lead.bookingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs hover:bg-accent"
                      >
                        Booking link
                      </a>
                    )}
                    {lead.menuLink && (
                      <a
                        href={lead.menuLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs hover:bg-accent"
                      >
                        Menu link
                      </a>
                    )}
                  </div>
                )}

                {lead.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {lead.techStack.map((tech) => (
                      <Badge key={tech} variant="secondary" className="text-[10px]">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                )}

                {lead.sslValid != null && (
                  <p className="text-xs">
                    <span className="text-muted-foreground">SSL: </span>
                    <span className={lead.sslValid ? "text-emerald-600" : "text-amber-600"}>
                      {lead.sslValid ? "Valid" : "Invalid/expired"}
                      {lead.sslIssuer ? ` · ${lead.sslIssuer}` : ""}
                    </span>
                  </p>
                )}
              </section>

              <Separator />

              {/* Personalized message */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Message</Label>
                  {templates.length === 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      No templates yet
                    </span>
                  )}
                </div>

                {templates.length > 0 && (
                  <Select value={selectedTemplateId} onValueChange={applyTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template…" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Textarea
                  rows={7}
                  placeholder="Pick a template above, or write a message here…"
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={!messageDraft.trim()}
                    onClick={copyMessage}
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy message
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5"
                    disabled={!messageDraft.trim() || !lead.phone || lead.hasWhatsapp === false}
                    onClick={() =>
                      window.open(whatsappLink(lead.phone as string, messageDraft), "_blank")
                    }
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> Send on WhatsApp
                  </Button>
                </div>
                {!lead.phone && (
                  <p className="text-[11px] text-muted-foreground">
                    No phone number on this lead — WhatsApp send is
                    unavailable, but you can still copy the message.
                  </p>
                )}
                {lead.phone && lead.hasWhatsapp === false && (
                  <p className="text-[11px] text-muted-foreground">
                    Marked as no WhatsApp — copy the message and reach out by
                    phone/email instead.
                  </p>
                )}
              </section>

              <Separator />

              {/* Lead management */}
              <section className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Lead status
                    </Label>
                    <Select
                      value={lead.status}
                      onValueChange={(status) =>
                        updateLead.mutate({
                          id: lead.id,
                          data: { status: status as LeadStatus },
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Assigned to
                    </Label>
                    <div className="flex gap-1.5">
                      <Input
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        placeholder="e.g. Priya"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updateLead.isPending || assignedTo === (lead.assignedTo ?? "")}
                        onClick={() =>
                          updateLead.mutate({
                            id: lead.id,
                            data: { assignedTo: assignedTo || null },
                          })
                        }
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Contact name (for message personalization)
                  </Label>
                  <div className="flex gap-1.5">
                    <Input
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g. Dr. Sharma"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updateLead.isPending || contactName === (lead.contactName ?? "")}
                      onClick={() =>
                        updateLead.mutate({
                          id: lead.id,
                          data: { contactName: contactName || null },
                        })
                      }
                    >
                      Save
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tags</Label>
                  {lead.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {lead.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="cursor-pointer gap-1"
                          onClick={() => removeTag(tag)}
                        >
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Add a tag and press Enter"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <Button size="sm" variant="outline" onClick={addTag} disabled={!tagInput.trim()}>
                      Add
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Add notes about this lead…"
                  />
                  <Button
                    size="sm"
                    disabled={updateLead.isPending || notes === (lead.notes ?? "")}
                    onClick={() =>
                      updateLead.mutate({ id: lead.id, data: { notes } })
                    }
                  >
                    {updateLead.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Save notes"
                    )}
                  </Button>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Place ID: <code>{lead.placeId}</code>
                </p>
              </section>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ContactLine({
  icon: Icon,
  href,
  external,
  accent,
  children,
}: {
  icon: LucideIcon;
  href?: string;
  external?: boolean;
  accent?: boolean;
  children: React.ReactNode;
}) {
  const content = (
    <div className="flex items-center gap-2.5 px-3 py-2.5 text-sm">
      <Icon className={cn("h-4 w-4 shrink-0", accent ? "text-blue-600" : "text-muted-foreground")} />
      <span className={cn("truncate", accent && "text-blue-600")}>{children}</span>
    </div>
  );

  if (!href) {
    return <div className="border-b last:border-b-0">{content}</div>;
  }

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="block border-b transition-colors last:border-b-0 hover:bg-accent"
    >
      {content}
    </a>
  );
}
