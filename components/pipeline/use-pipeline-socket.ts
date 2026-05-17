"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { usePipeline } from "@/components/pipeline-provider";

export type PipelineStep =
  | "all"
  | "fetch"
  | "preprocess"
  | "sentiment"
  | "sentiment_llm"
  | "geospatial"
  | "sentiment_aggregation";

export type RunStatus = "idle" | "running" | "success" | "failed" | "stopped";

export interface LogEntry {
  timestamp: string;
  text: string;
  run_id: string;
}

export interface RunInfo {
  id: string;
  step: PipelineStep;
  status: RunStatus;
  started_at?: string;
  finished_at?: string;
  return_code?: number;
}

export interface PipelineState {
  status: RunStatus;
  currentStep: PipelineStep | null;
  currentRunId: string | null;
  startedAt: string | null;
  logs: LogEntry[];
  runs: RunInfo[];
  wsConnected: boolean;
}

export function usePipelineSocket() {
  const { pipelineUrl } = usePipeline();
  const socketRef = useRef<Socket | null>(null);

  const [state, setState] = useState<PipelineState>({
    status: "idle",
    currentStep: null,
    currentRunId: null,
    startedAt: null,
    logs: [],
    runs: [],
    wsConnected: false,
  });

  useEffect(() => {
    if (!pipelineUrl) {
      setState((s) => ({
        ...s,
        wsConnected: false,
        status: "idle",
        logs: [],
        runs: [],
        currentStep: null,
        currentRunId: null,
        startedAt: null,
      }));
      return;
    }

    const socket = io(pipelineUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 3000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setState((s) => ({ ...s, wsConnected: true }));
    });

    socket.on("disconnect", () => {
      setState((s) => ({ ...s, wsConnected: false }));
    });

    socket.on("status", (data) => {
      setState((s) => ({
        ...s,
        status: data.status ?? "idle",
        currentStep: data.step ?? null,
        currentRunId: data.id ?? null,
        startedAt: data.started_at ?? null,
      }));
    });

    socket.on("logs_replay", (logs: LogEntry[]) => {
      setState((s) => ({
        ...s,
        logs: Array.isArray(logs) ? logs : [],
      }));
    });

    socket.on("log", (entry: LogEntry) => {
      setState((s) => ({
        ...s,
        logs: [...s.logs, entry],
      }));
    });

    socket.on("run_started", (data) => {
      setState((s) => ({
        ...s,
        status: "running",
        currentStep: data.step,
        currentRunId: data.id,
        startedAt: data.started_at,
      }));
    });

    socket.on("run_finished", (data) => {
      setState((s) => ({
        ...s,
        status: data.status ?? "idle",
        currentStep: data.step,
        currentRunId: data.id,
        runs: [
          {
            id: data.id,
            step: data.step,
            status: data.status,
            return_code: data.return_code,
            finished_at: data.finished_at,
          },
          ...s.runs,
        ],
      }));
    });

    fetch(`${pipelineUrl.replace(/\/$/, "")}/api/runs`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setState((s) => ({ ...s, runs: data }));
        }
      })
      .catch(() => {});

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [pipelineUrl]);

  const triggerRun = useCallback(
    (step: PipelineStep, input: Record<string, string | number>) => {
      if (!socketRef.current?.connected) return;
      socketRef.current.emit("trigger_run", { step, input });
    },
    [],
  );

  const stopRun = useCallback(async () => {
    if (!pipelineUrl) return;
    const base = pipelineUrl.replace(/\/$/, "");
    const res = await fetch(`${base}/api/stop`, { method: "POST" });
    return res.json();
  }, [pipelineUrl]);

  const clearLogs = useCallback(() => {
    setState((s) => ({ ...s, logs: [] }));
  }, []);

  return { ...state, triggerRun, stopRun, clearLogs };
}
