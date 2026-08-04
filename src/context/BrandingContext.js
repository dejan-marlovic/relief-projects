import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BASE_URL } from "../config/api";

const DEFAULT_LOGO_URL = "/logo.png";

const BrandingContext = createContext({
  logoUrl: DEFAULT_LOGO_URL,
  customLogo: false,
  brandingLoading: true,
  refreshBranding: async () => {},
});

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState({
    logoUrl: DEFAULT_LOGO_URL,
    customLogo: false,
    updatedAt: null,
  });

  const [brandingLoading, setBrandingLoading] = useState(true);

  const refreshBranding = useCallback(async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/branding`, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Could not load application branding.");
      }

      const data = await response.json();

      const baseLogoUrl = data.customLogo
        ? `${BASE_URL}${data.logoUrl}`
        : DEFAULT_LOGO_URL;

      const version = data.updatedAt
        ? encodeURIComponent(data.updatedAt)
        : Date.now();

      setBranding({
        customLogo: Boolean(data.customLogo),
        logoUrl: data.customLogo
          ? `${baseLogoUrl}?v=${version}`
          : DEFAULT_LOGO_URL,
        updatedAt: data.updatedAt || null,
      });
    } catch (error) {
      console.error("Failed to load application branding:", error);

      setBranding({
        customLogo: false,
        logoUrl: DEFAULT_LOGO_URL,
        updatedAt: null,
      });
    } finally {
      setBrandingLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBranding();
  }, [refreshBranding]);

  const value = useMemo(
    () => ({
      ...branding,
      brandingLoading,
      refreshBranding,
    }),
    [branding, brandingLoading, refreshBranding],
  );

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
