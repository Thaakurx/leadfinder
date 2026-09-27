"use client";

import * as React from "react";
import { CircleHelp, ExternalLink, Gift, ShieldCheck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Pricing and console paths last verified against Google's docs in
// September 2026 — re-check developers.google.com/maps/billing-and-pricing
// when updating.
const LAST_CHECKED = "September 2026";

function Link({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 font-medium text-primary underline underline-offset-2"
    >
      {children}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function Path({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-muted px-1 py-0.5 font-medium text-foreground">
      {children}
    </span>
  );
}

interface Step {
  title: string;
  body: React.ReactNode;
}

const STEPS: Step[] = [
  {
    title: "Sign in to Google Cloud Console",
    body: (
      <p>
        Open <Link href="https://console.cloud.google.com/">console.cloud.google.com</Link>{" "}
        and sign in with any Google account. If it’s your first time, accept the
        terms of service and pick your country.
      </p>
    ),
  },
  {
    title: "Create a project",
    body: (
      <p>
        Click the project picker at the top of the page, then <Path>New Project</Path>.
        Give it a name like <em>LeadFinder</em>, click <Path>Create</Path>, and make
        sure the new project is selected in the picker before you continue.
      </p>
    ),
  },
  {
    title: "Turn on billing (required, even for free usage)",
    body: (
      <>
        <p>
          Go to <Link href="https://console.cloud.google.com/billing">Billing</Link> and
          link a billing account to your project. You’ll need a credit or debit
          card for identity verification.
        </p>
        <p>
          New Google Cloud customers get a <strong>$300 welcome credit</strong> as
          part of the free trial (details below). Without billing, Google rejects
          every request with a <code>REQUEST_DENIED</code> error.
        </p>
      </>
    ),
  },
  {
    title: "Enable the two APIs LeadFinder uses",
    body: (
      <>
        <p>Open each link below (with your project selected) and click <Path>Enable</Path>:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <Link href="https://console.cloud.google.com/apis/library/places.googleapis.com">
              Places API (New)
            </Link>{" "}
            — finds the businesses.
          </li>
          <li>
            <Link href="https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com">
              Geocoding API
            </Link>{" "}
            — turns a city or address into map coordinates.
          </li>
        </ul>
        <p>
          Make sure it says <strong>Places API (New)</strong>. The older one, just
          called “Places API”, is the legacy version and won’t work with this app.
        </p>
      </>
    ),
  },
  {
    title: "Create the API key",
    body: (
      <p>
        Go to{" "}
        <Link href="https://console.cloud.google.com/google/maps-apis/credentials">
          Google Maps Platform → Keys &amp; Credentials
        </Link>{" "}
        (or <Path>APIs &amp; Services → Credentials</Path>), click{" "}
        <Path>Create credentials → API key</Path>, and copy the key it shows you.
        It starts with <code>AIza…</code>.
      </p>
    ),
  },
  {
    title: "Restrict the key (strongly recommended)",
    body: (
      <>
        <p>Click the key’s name to edit it:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Under <Path>API restrictions</Path>, choose <Path>Restrict key</Path>, tick{" "}
            <strong>Places API (New)</strong> and <strong>Geocoding API</strong>, then
            click <Path>Save</Path>.
          </li>
          <li>
            Under <Path>Application restrictions</Path>, choose <Path>None</Path>, or{" "}
            <Path>IP addresses</Path> with your server’s IP if you host LeadFinder
            online. Don’t use “Websites (HTTP referrers)”. LeadFinder calls Google
            from the server, so a website restriction blocks every request.
          </li>
        </ul>
        <p>Changes can take up to 5 minutes to apply.</p>
      </>
    ),
  },
  {
    title: "Paste it into LeadFinder",
    body: (
      <p>
        Close this guide, paste the key into the <strong>Google Places API key</strong>{" "}
        field in Settings, and click <Path>Save key</Path>. Then run a small test search
        to make sure it works.
      </p>
    ),
  },
  {
    title: "Protect yourself from surprise bills",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <Link href="https://console.cloud.google.com/billing/budgets">Budgets &amp; alerts</Link>:
          set a monthly budget (e.g. $10) so Google emails you before costs pile up.
        </li>
        <li>
          <Link href="https://console.cloud.google.com/google/maps-apis/quotas">Quotas</Link>:
          lower the daily request limit for Places API (New) to cap how much you can
          ever spend in a day.
        </li>
      </ul>
    ),
  },
];

const FREE_CAPS: { api: string; when: string; free: string; after: string }[] = [
  {
    api: "Text / Nearby Search — Pro",
    when: "Searches with no extra fields ticked",
    free: "5,000 requests",
    after: "$32 per 1,000",
  },
  {
    api: "Text / Nearby Search — Enterprise",
    when: "Phone, website, rating, hours or price level ticked",
    free: "1,000 requests",
    after: "$35 per 1,000",
  },
  {
    api: "Geocoding",
    when: "Once per search, to find the location",
    free: "10,000 requests",
    after: "$5 per 1,000",
  },
];

const TROUBLESHOOTING: { error: string; fix: string }[] = [
  {
    error: "\"This API has not been used in project … or it is disabled\"",
    fix: "Enable Places API (New) and Geocoding API (step 4), wait a few minutes, then try again.",
  },
  {
    error: "\"Billing has not been enabled\" / REQUEST_DENIED",
    fix: "Link a billing account to the same project the key belongs to (step 3).",
  },
  {
    error: "\"API key not valid\"",
    fix: "Copy the key again without extra spaces, and check it wasn't deleted or rotated.",
  },
  {
    error: "\"Requests from referer … are blocked\"",
    fix: "Set Application restrictions to None or IP addresses, not HTTP referrers (step 6).",
  },
];

export function ApiKeyGuideDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="link"
          size="sm"
          className="h-auto gap-1 p-0 text-xs"
        >
          <CircleHelp className="h-3.5 w-3.5" />
          How do I get a key?
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Get your Google Places API key</DialogTitle>
          <DialogDescription>
            A step-by-step guide. It takes about 5–10 minutes and most people stay
            inside the free monthly usage.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <div className="min-w-0 space-y-1.5 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{step.title}</p>
                {step.body}
              </div>
            </li>
          ))}
        </ol>

        <section className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
          <h3 className="flex items-center gap-1.5 font-semibold">
            <Gift className="h-4 w-4 text-emerald-600" />
            Free credits and free usage
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              <strong className="text-foreground">$300 welcome credit</strong> for new
              Google Cloud customers. It lasts 90 days or until you’ve used $300,
              whichever comes first.
            </li>
            <li>
              <strong className="text-foreground">Free usage every month</strong>, on top
              of the credit. Each API has its own free allowance, and it resets on the
              1st of every month. (Google replaced the old $200 monthly credit with
              these allowances in March 2025.)
            </li>
          </ul>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="py-1.5 pr-3 font-medium">API (billing tier)</th>
                  <th className="py-1.5 pr-3 font-medium">Used when</th>
                  <th className="py-1.5 pr-3 font-medium">Free each month</th>
                  <th className="py-1.5 font-medium">After that</th>
                </tr>
              </thead>
              <tbody>
                {FREE_CAPS.map((row) => (
                  <tr key={row.api} className="border-b last:border-0">
                    <td className="py-1.5 pr-3 font-medium">{row.api}</td>
                    <td className="py-1.5 pr-3 text-muted-foreground">{row.when}</td>
                    <td className="py-1.5 pr-3">{row.free}</td>
                    <td className="py-1.5 text-muted-foreground">{row.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            One search request returns up to 20 businesses, so 1,000 free Enterprise
            requests can mean up to 20,000 leads a month with phone and website
            included. LeadFinder shows a cost estimate before every search.
          </p>
        </section>

        <section className="space-y-2 text-sm">
          <h3 className="flex items-center gap-1.5 font-semibold">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            Common errors
          </h3>
          <dl className="space-y-2">
            {TROUBLESHOOTING.map((t) => (
              <div key={t.error}>
                <dt className="text-xs font-medium">{t.error}</dt>
                <dd className="text-xs text-muted-foreground">{t.fix}</dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="flex items-start gap-1.5 border-t pt-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Your key is stored on your LeadFinder server and never shown again after
            saving. Prices last checked {LAST_CHECKED}. See Google’s{" "}
            <Link href="https://developers.google.com/maps/billing-and-pricing/pricing">
              official pricing
            </Link>{" "}
            for the latest numbers.
          </span>
        </p>
      </DialogContent>
    </Dialog>
  );
}
