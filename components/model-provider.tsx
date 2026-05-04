"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type ModelType = "llm" | "transformer";

interface ModelContextType {
  model: ModelType;
  setModel: (model: ModelType) => void;
}

const ModelContext = createContext<ModelContextType | undefined>(undefined);

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const [model, setModelState] = useState<ModelType>("llm");

  useEffect(() => {
    const savedModel = localStorage.getItem("sentiment_model") as ModelType;
    if (savedModel === "llm" || savedModel === "transformer") {
      setModelState(savedModel);
    }
  }, []);

  const setModel = (newModel: ModelType) => {
    setModelState(newModel);
    localStorage.setItem("sentiment_model", newModel);
    window.dispatchEvent(new Event("sentiment_model_changed"));
  };

  return (
    <ModelContext.Provider value={{ model, setModel }}>
      {children}
    </ModelContext.Provider>
  );
}

export function useModel() {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error("useModel must be used within a ModelProvider");
  }
  return context;
}
