"use client";

import { useState, useRef, useEffect } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/retroui/Card";
import { Button } from "@/components/retroui/Button";
import { Input } from "@/components/retroui/Input";
import { Badge } from "@/components/retroui/Badge";
import { Text } from "@/components/retroui/Text";
import { usePipeline } from "@/components/pipeline-provider";
import {
  usePipelineSocket,
  type PipelineStep,
  type LogEntry,
} from "@/components/pipeline/use-pipeline-socket";
import {
  Play,
  Square,
  Trash2,
  Wifi,
  WifiOff,
  Terminal,
  Loader2,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
} from "lucide-react";

const STEPS: { value: PipelineStep; label: string; description: string }[] = [
  { value: "all", label: "All Steps", description: "Run the entire pipeline end-to-end" },
  { value: "fetch", label: "Fetch", description: "Scrape & collect raw data" },
  { value: "preprocess", label: "Preprocess", description: "Clean & normalize text" },
  { value: "sentiment", label: "Sentiment", description: "BERTurk transformer analysis" },
  { value: "sentiment_llm", label: "Sentiment LLM", description: "Llama 3.1 LLM analysis" },
  { value: "geospatial", label: "Geospatial", description: "Province & coordinate mapping" },
  { value: "sentiment_aggregation", label: "Aggregation", description: "Aggregate final scores" },
];

function StatusIndicator({ status, wsConnected }: { status: string; wsConnected: boolean }) {
  if (!wsConnected) {
    return (
      <Badge variant="outline" className="flex items-center gap-1.5 border-muted-foreground text-muted-foreground">
        <WifiOff className="size-3" />
        Disconnected
      </Badge>
    );
  }

  const map: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    idle: {
      color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
      icon: <CheckCircle2 className="size-3" />,
      label: "Idle",
    },
    running: {
      color: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
      icon: <Loader2 className="size-3 animate-spin" />,
      label: "Running",
    },
    success: {
      color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
      icon: <CheckCircle2 className="size-3" />,
      label: "Success",
    },
    failed: {
      color: "bg-rose-500/20 text-rose-700 dark:text-rose-400",
      icon: <AlertTriangle className="size-3" />,
      label: "Failed",
    },
    stopped: {
      color: "bg-zinc-500/20 text-zinc-600 dark:text-zinc-400",
      icon: <Square className="size-3" />,
      label: "Stopped",
    },
  };

  const s = map[status] ?? map.idle;

  return (
    <Badge className={`flex items-center gap-1.5 ${s.color}`}>
      {s.icon}
      {s.label}
    </Badge>
  );
}

function LogViewer({ logs, onClear }: { logs: LogEntry[]; onClear: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    // If user scrolled up more than 60px from bottom, disable auto-scroll
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 60);
  };

  return (
    <Card className="w-full flex flex-col">
      <div className="flex items-center justify-between border-b-2 px-4 py-2 bg-secondary text-secondary-foreground">
        <div className="flex items-center gap-2">
          <Terminal className="size-4" />
          <span className="text-sm font-semibold">Pipeline Logs</span>
          <Badge variant="outline" size="sm" className="text-xs border-secondary-foreground/30 text-secondary-foreground/70">
            {logs.length} lines
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {!autoScroll && (
            <button
              onClick={() => {
                setAutoScroll(true);
                if (containerRef.current) {
                  containerRef.current.scrollTop = containerRef.current.scrollHeight;
                }
              }}
              className="flex items-center gap-1 text-xs text-secondary-foreground/70 hover:text-secondary-foreground transition cursor-pointer"
            >
              <ChevronDown className="size-3" />
              Jump to bottom
            </button>
          )}
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-secondary-foreground/70 hover:text-secondary-foreground transition cursor-pointer"
            title="Clear logs"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[400px] overflow-y-auto overflow-x-hidden p-3 font-mono text-xs leading-relaxed bg-card"
      >
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <Terminal className="size-8 opacity-30" />
            <p>No logs yet. Trigger a pipeline run to see output here.</p>
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex gap-2 hover:bg-accent/30 px-1 rounded transition-colors">
              <span className="text-muted-foreground shrink-0 select-none tabular-nums">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className="whitespace-pre-wrap break-all">{log.text}</span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function DisabledOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-[2px]">
      <Card className="max-w-sm">
        <Card.Content className="flex flex-col items-center gap-3 text-center">
          <AlertTriangle className="size-8 text-primary" />
          <Text as="h4" className="font-semibold">Pipeline Not Configured</Text>
          <Text className="text-muted-foreground text-sm">
            Set the pipeline server URL in <strong>Settings</strong> (top-right) to enable pipeline controls.
          </Text>
        </Card.Content>
      </Card>
    </div>
  );
}

export default function PipelinePage() {
  const { pipelineUrl, isConnected: urlConfigured } = usePipeline();
  const pipeline = usePipelineSocket();

  const [selectedStep, setSelectedStep] = useState<PipelineStep>("all");
  const [province, setProvince] = useState("");
  const [category, setCategory] = useState("");
  const [numResults, setNumResults] = useState<number>(1);
  const [maxTopics, setMaxTopics] = useState<number>(1);
  const [isStopping, setIsStopping] = useState(false);

  const isRunning = pipeline.status === "running";
  const isDisabled = !urlConfigured;

  const handleRun = () => {
    if (isDisabled || isRunning) return;
    pipeline.triggerRun(selectedStep, {
      province,
      category,
      num_results: numResults,
      max_topics: maxTopics,
    });
  };

  const handleStop = async () => {
    if (isDisabled) return;
    setIsStopping(true);
    try {
      await pipeline.stopRun();
    } catch (e) {
      console.error("Failed to stop run:", e);
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <DashboardShell title="Pipeline Control">
      <div className="relative">
        {isDisabled && <DisabledOverlay />}

        <div className={isDisabled ? "pointer-events-none select-none" : ""}>
          {/* Status bar */}
          <Card className="w-full">
            <Card.Content className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <StatusIndicator status={pipeline.status} wsConnected={pipeline.wsConnected} />
                {pipeline.wsConnected && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Wifi className="size-3 text-emerald-500" />
                    Connected to <code className="bg-muted px-1.5 py-0.5 text-[10px] rounded">{pipelineUrl}</code>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {pipeline.currentStep && (
                  <span>
                    Step: <strong className="text-foreground">{pipeline.currentStep}</strong>
                  </span>
                )}
                {pipeline.startedAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {new Date(pipeline.startedAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </Card.Content>
          </Card>

          {/* Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            {/* Left: Step select + Input fields */}
            <div className="lg:col-span-1 space-y-4">
              {/* Step Selector */}
              <Card className="w-full">
                <div className="border-b-2 px-4 py-2">
                  <Text className="text-sm font-semibold flex items-center gap-2">
                    <Zap className="size-4 text-primary" />
                    Pipeline Step
                  </Text>
                </div>
                <Card.Content className="p-0">
                  <div className="flex flex-col">
                    {STEPS.map((step) => (
                      <label
                        key={step.value}
                        className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer border-b last:border-b-0 transition-colors ${selectedStep === step.value
                          ? "bg-primary/10 dark:bg-primary/20"
                          : "hover:bg-accent/30"
                          }`}
                      >
                        <input
                          type="radio"
                          name="pipeline-step"
                          value={step.value}
                          checked={selectedStep === step.value}
                          onChange={() => setSelectedStep(step.value)}
                          className="mt-0.5 size-4 accent-primary cursor-pointer"
                          disabled={isRunning}
                        />
                        <div className="flex flex-col">
                          <span className={`text-sm font-medium ${selectedStep === step.value ? "text-primary" : ""}`}>
                            {step.label}
                          </span>
                          <span className="text-xs text-muted-foreground">{step.description}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </Card.Content>
              </Card>

              {/* Input Parameters */}
              <Card className="w-full">
                <div className="border-b-2 px-4 py-2">
                  <Text className="text-sm font-semibold">Input Parameters</Text>
                </div>
                <Card.Content className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Province</label>
                    <Input
                      id="pipeline-province"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      placeholder="e.g. İstanbul"
                      disabled={isRunning}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                    <Input
                      id="pipeline-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. ulaşım"
                      disabled={isRunning}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Num Results</label>
                      <Input
                        id="pipeline-num-results"
                        type="number"
                        value={numResults}
                        onChange={(e) => setNumResults(Number(e.target.value))}
                        min={1}
                        max={100}
                        disabled={isRunning}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Topics</label>
                      <Input
                        id="pipeline-max-topics"
                        type="number"
                        value={maxTopics}
                        onChange={(e) => setMaxTopics(Number(e.target.value))}
                        min={1}
                        max={20}
                        disabled={isRunning}
                      />
                    </div>
                  </div>
                </Card.Content>
              </Card>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  id="pipeline-run-btn"
                  className="flex-1"
                  onClick={handleRun}
                  disabled={isRunning || isDisabled}
                >
                  <Play className="size-4 mr-2" />
                  Run Pipeline
                </Button>
                <Button
                  id="pipeline-stop-btn"
                  variant="outline"
                  onClick={handleStop}
                  disabled={!isRunning || isStopping || isDisabled}
                  className="border-destructive text-destructive hover:bg-destructive/10"
                >
                  {isStopping ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <Square className="size-4 mr-2" />
                  )}
                  Stop
                </Button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <LogViewer logs={pipeline.logs} onClear={pipeline.clearLogs} />

              {pipeline.runs.length > 0 && (
                <Card className="w-full">
                  <div className="border-b-2 px-4 py-2">
                    <Text className="text-sm font-semibold">Recent Runs</Text>
                  </div>
                  <Card.Content className="p-0">
                    <div className="divide-y">
                      {pipeline.runs.slice(0, 10).map((run) => (
                        <div
                          key={run.id}
                          className="flex items-center justify-between px-4 py-2.5 text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <StatusIndicator status={run.status} wsConnected={true} />
                            <span className="font-medium">{run.step}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {run.return_code !== undefined && (
                              <span>
                                Exit: <code className="bg-muted px-1 py-0.5 rounded">{run.return_code}</code>
                              </span>
                            )}
                            {run.finished_at && (
                              <span>{new Date(run.finished_at).toLocaleTimeString()}</span>
                            )}
                            <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">
                              {run.id.slice(0, 8)}
                            </code>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card.Content>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
