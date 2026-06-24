import "./style.css";
import { EditorStore } from "./state/store";
import { renderApp } from "./ui/render";
import { initLocale } from "./i18n";

// Resolve the active UI language before the first render.
initLocale();

const googleVerificationCode = String(import.meta.env.VITE_GOOGLE_SITE_VERIFICATION ?? "fu6LDPfebphULUc-nfObEg9oKMJVEl-4lQevJ9FSYlA").trim();
if (googleVerificationCode.length > 0) {
  const verificationTag = document.querySelector<HTMLMetaElement>('meta[name="google-site-verification"]');
  if (verificationTag) {
    verificationTag.content = googleVerificationCode;
  }
}

const configuredSiteUrl = String(import.meta.env.VITE_SITE_URL ?? "https://iu2frl.github.io/md380-codeplug-editor/").trim();
if (configuredSiteUrl.length > 0) {
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical) {
    canonical.href = configuredSiteUrl;
  }
  const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]')
    ?? document.querySelector<HTMLMetaElement>('meta[name="og:url"]');
  if (ogUrl) {
    ogUrl.content = configuredSiteUrl;
  }
}

const app = document.querySelector<HTMLElement>("#app");

if (!app) {
  throw new Error("Unable to find app root element.");
}

renderApp(app, new EditorStore());
