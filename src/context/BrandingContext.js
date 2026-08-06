import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { BASE_URL } from "../config/api";
import {
  getCustomThemes,
  getStoredTheme,
  hydrateServerThemes,
} from "../utils/theme";

const DEFAULT_LOGO_URL = "/logo.png";
const DEFAULT_FAVICON_URL = "/favicon.ico";

const BrandingContext = createContext({
  logoUrl: DEFAULT_LOGO_URL,
  faviconUrl: DEFAULT_FAVICON_URL,
  customLogo: false,
  customFavicon: false,
  colorTheme: "default",
  customThemes: [],
  themeUpdatedAt: null,
  brandingLoading: true,
  refreshBranding: async () => {},
});

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState({
    logoUrl: DEFAULT_LOGO_URL,
    faviconUrl: DEFAULT_FAVICON_URL,
    customLogo: false,
    customFavicon: false,
    updatedAt: null,
    faviconUpdatedAt: null,
    colorTheme: getStoredTheme(),
    customThemes: getCustomThemes(),
    themeUpdatedAt: null,
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

      const logoVersion = data.updatedAt
        ? encodeURIComponent(data.updatedAt)
        : Date.now();

      const faviconVersion = data.faviconUpdatedAt
        ? encodeURIComponent(data.faviconUpdatedAt)
        : Date.now();

      const logoUrl = data.customLogo
        ? `${BASE_URL}${data.logoUrl}?v=${logoVersion}`
        : DEFAULT_LOGO_URL;

      const faviconUrl = data.customFavicon
        ? `${BASE_URL}${data.faviconUrl}?v=${faviconVersion}`
        : `${DEFAULT_FAVICON_URL}?v=${faviconVersion}`;

      const themeConfiguration = hydrateServerThemes(
        data.colorTheme,
        data.customThemes,
      );

      setBranding({
        customLogo: Boolean(data.customLogo),
        customFavicon: Boolean(data.customFavicon),
        logoUrl,
        faviconUrl,
        updatedAt: data.updatedAt || null,
        faviconUpdatedAt: data.faviconUpdatedAt || null,
        colorTheme: themeConfiguration.colorTheme,
        customThemes: themeConfiguration.customThemes,
        themeUpdatedAt: data.themeUpdatedAt || null,
      });
    } catch (error) {
      console.error("Failed to load application branding:", error);

      setBranding((current) => ({
        ...current,
        customLogo: false,
        customFavicon: false,
        logoUrl: DEFAULT_LOGO_URL,
        faviconUrl: DEFAULT_FAVICON_URL,
        updatedAt: null,
        faviconUpdatedAt: null,
      }));
    } finally {
      setBrandingLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBranding();
  }, [refreshBranding]);

  useEffect(() => {
    let faviconLink = document.querySelector('link[rel~="icon"]');

    if (!faviconLink) {
      faviconLink = document.createElement("link");
      faviconLink.rel = "icon";
      document.head.appendChild(faviconLink);
    }

    faviconLink.href = branding.faviconUrl || DEFAULT_FAVICON_URL;
  }, [branding.faviconUrl]);

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
