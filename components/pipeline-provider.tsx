"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface PipelineContextType {
  pipelineUrl: string;
  setPipelineUrl: (url: string) => void;
  isConnected: boolean;
}

const PipelineContext = createContext<PipelineContextType | undefined>(undefined);

export function PipelineProvider({ children }: { children: React.ReactNode }) {
  const [pipelineUrl, setPipelineUrlState] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem("pipeline_url");
    if (saved) {
      setPipelineUrlState(saved);
    }
  }, []);

  const setPipelineUrl = (url: string) => {
    const trimmed = url.trim();
    setPipelineUrlState(trimmed);
    if (trimmed) {
      localStorage.setItem("pipeline_url", trimmed);
    } else {
      localStorage.removeItem("pipeline_url");
    }
    window.dispatchEvent(new Event("pipeline_url_changed"));
  };

  return (
    <PipelineContext.Provider value={{ pipelineUrl, setPipelineUrl, isConnected: !!pipelineUrl }}>
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline() {
  const context = useContext(PipelineContext);
  if (!context) {
    throw new Error("usePipeline must be used within a PipelineProvider");
  }
  return context;
}
