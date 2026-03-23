/// <reference types="vite/client" />

interface Window {
  initFeaturebase?: (userData: { id: number; email: string; username: string; createdAt: string } | null) => void;
  Featurebase: any;
}
