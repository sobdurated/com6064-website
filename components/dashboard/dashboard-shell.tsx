"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { useModel } from "@/components/model-provider";
import { usePipeline } from "@/components/pipeline-provider";

import { DASHBOARD_NAV_ITEMS } from "@/components/dashboard/nav-items";
import { Dialog } from "@/components/retroui/Dialog";
import { Button } from "@/components/retroui/Button";
import { Card } from "@/components/retroui/Card";
import { Input } from "@/components/retroui/Input";
import { cn } from "@/lib/utils";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      {DASHBOARD_NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 border-2 px-3 py-2 text-sm font-medium transition",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-card hover:bg-accent",
            )}
          >
            <Icon className="size-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function MobileDrawer() {
  return (
    <Dialog>
      <Dialog.Trigger asChild>
        <Button className="md:hidden" size="sm" aria-label="Open navigation">
          <List className="size-4" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Content size="sm">
        <Dialog.Header>Navigate</Dialog.Header>
        <div className="p-4">
          <NavLinks />
        </div>
      </Dialog.Content>
    </Dialog>
  );
}

function ModelSettingsDialog() {
  const { model, setModel } = useModel();
  const { pipelineUrl, setPipelineUrl } = usePipeline();

  return (
    <Dialog>
      <Dialog.Trigger asChild>
        <Button size="sm" variant="outline" aria-label="Settings">
          <Settings className="size-4 mr-2" />
          Settings
        </Button>
      </Dialog.Trigger>
      <Dialog.Content size="sm">
        <Dialog.Header>Settings</Dialog.Header>
        <div className="p-4 space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-semibold">Sentiment Model</p>
            <p className="text-xs text-muted-foreground">Select the model to use for sentiment analysis across the dashboard.</p>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 border-2 p-3 rounded cursor-pointer hover:bg-accent/50 transition-colors">
                <input
                  type="radio"
                  name="model"
                  value="llm"
                  checked={model === "llm"}
                  onChange={() => setModel("llm")}
                  className="size-4"
                />
                <div className="flex flex-col">
                  <span className="font-semibold">Llama 3.1 LLM</span>
                </div>
              </label>
              <label className="flex items-center gap-2 border-2 p-3 rounded cursor-pointer hover:bg-accent/50 transition-colors">
                <input
                  type="radio"
                  name="model"
                  value="transformer"
                  checked={model === "transformer"}
                  onChange={() => setModel("transformer")}
                  className="size-4"
                />
                <div className="flex flex-col">
                  <span className="font-semibold">Turkish BERTurk</span>
                </div>
              </label>
            </div>
          </div>

          <div className="border-t-2" />

          <div className="space-y-2">
            <p className="text-sm font-semibold">Pipeline Server URL</p>
            <p className="text-xs text-muted-foreground">
              Set the URL of the running pipeline server (e.g. an ngrok tunnel). Leave empty to disable pipeline controls.
            </p>
            <Input
              id="settings-pipeline-url"
              type="url"
              value={pipelineUrl}
              onChange={(e) => setPipelineUrl(e.target.value)}
              placeholder="https://xxxx.ngrok-free.app"
            />
            {pipelineUrl && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                ✓ Pipeline controls enabled
              </p>
            )}
          </div>
        </div>
      </Dialog.Content>
    </Dialog>
  );
}

export function DashboardShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffe5e6_0%,#fff_42%,#f7f7f7_100%)] dark:bg-[radial-gradient(circle_at_top_left,#2a0c0e_0%,#1a1a1a_42%,#1a1a1a_100%)]">
      <header className="sticky top-0 z-30 border-b-2 bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              COM6064 - Turkish Sentiment Analysis
            </p>
            <h1 className="text-xl font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ModelSettingsDialog />
            <MobileDrawer />
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[240px_1fr] md:px-6 md:py-6">
        <aside className="hidden md:block">
          <Card className="w-full">
            <Card.Content className="p-3">
              <NavLinks />
            </Card.Content>
          </Card>
        </aside>
        <main className="space-y-4">{children}</main>
      </div>
    </div>
  );
}

