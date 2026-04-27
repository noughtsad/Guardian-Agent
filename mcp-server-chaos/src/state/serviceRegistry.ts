export type ServiceStatus = "healthy" | "degraded" | "down";

export type FaultType = "latency_spike" | "error_rate_spike" | "complete_outage";

export type Service = {
  name: string;
  status: ServiceStatus;
  latencyMs: number;
  errorRatePct: number;
  region: string;
  version: string;
  lastDeployedAt: string;
  faultInjectedAt: string | null;
  faultType: FaultType | null;
  onCallEngineer: string;
  dependsOn: string[];
};

export type IncidentLog = {
  id: string;
  serviceId: string;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "CRITICAL";
  message: string;
  traceId: string;
};

const initialServices: Service[] = [
  {
    name: "auth-service",
    status: "healthy",
    latencyMs: 42,
    errorRatePct: 0.1,
    region: "us-east-1",
    version: "v2.4.1",
    lastDeployedAt: "2025-04-20T10:30:00Z",
    faultInjectedAt: null,
    faultType: null,
    onCallEngineer: "priya@company.com",
    dependsOn: ["user-service"],
  },
  {
    name: "payment-service",
    status: "degraded",
    latencyMs: 1240,
    errorRatePct: 6.8,
    region: "us-east-1",
    version: "v1.9.3",
    lastDeployedAt: "2025-04-21T08:15:00Z",
    faultInjectedAt: "2025-04-27T04:00:00Z",
    faultType: "latency_spike",
    onCallEngineer: "arjun@company.com",
    dependsOn: ["auth-service", "ledger-service"],
  },
  {
    name: "user-service",
    status: "healthy",
    latencyMs: 65,
    errorRatePct: 0.2,
    region: "us-east-1",
    version: "v3.1.0",
    lastDeployedAt: "2025-04-18T14:00:00Z",
    faultInjectedAt: null,
    faultType: null,
    onCallEngineer: "priya@company.com",
    dependsOn: [],
  },
  {
    name: "notification-service",
    status: "healthy",
    latencyMs: 110,
    errorRatePct: 0.5,
    region: "eu-west-1",
    version: "v1.2.7",
    lastDeployedAt: "2025-04-22T09:00:00Z",
    faultInjectedAt: null,
    faultType: null,
    onCallEngineer: "fatima@company.com",
    dependsOn: ["user-service"],
  },
  {
    name: "ledger-service",
    status: "down",
    latencyMs: 0,
    errorRatePct: 100,
    region: "us-east-1",
    version: "v4.0.2",
    lastDeployedAt: "2025-04-27T02:00:00Z",
    faultInjectedAt: "2025-04-27T02:10:00Z",
    faultType: "complete_outage",
    onCallEngineer: "arjun@company.com",
    dependsOn: ["user-service"],
  },
  {
    name: "analytics-service",
    status: "healthy",
    latencyMs: 300,
    errorRatePct: 1.1,
    region: "ap-south-1",
    version: "v0.8.5",
    lastDeployedAt: "2025-04-15T12:00:00Z",
    faultInjectedAt: null,
    faultType: null,
    onCallEngineer: "ryo@company.com",
    dependsOn: ["user-service", "ledger-service"],
  },
];

// Mutable in-memory registry — deep copy so mutations don't affect the seed
const registry: Service[] = initialServices.map((s) => ({ ...s }));

export function getAllServices(): Service[] {
  return registry;
}

export function getService(name: string): Service {
  const svc = registry.find((s) => s.name === name);
  if (!svc) {
    const available = registry.map((s) => s.name).join(", ");
    throw new Error(`Service '${name}' not found. Available: ${available}`);
  }
  return svc;
}

export function updateService(name: string, patch: Partial<Service>): Service {
  const svc = getService(name);
  Object.assign(svc, patch);
  return svc;
}

export function getUnhealthyServices(): Service[] {
  return registry.filter((s) => s.status !== "healthy");
}

export function getDependents(serviceName: string): Service[] {
  return registry.filter((s) => s.dependsOn.includes(serviceName));
}
