export interface DatabaseHealth {
  connected: boolean;
  status: "healthy" | "unhealthy";
  latency_ms: number;
  error?: string | null;
}

export interface SystemHealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  project: string;
  version: string;
  environment: string;
  timestamp: string;
  uptime_seconds: number;
  database: DatabaseHealth;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

