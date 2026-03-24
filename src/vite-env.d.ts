/// <reference types="vite/client" />

interface Window {
  bootFeaturebase?: (userData: { id: number; email: string; username: string; createdAt: string } | null) => void;
  openFeaturebaseChat?: () => void;
  featureBaseLoaded?: boolean;
  featurebaseBooted?: boolean;
  Featurebase: any;
}
