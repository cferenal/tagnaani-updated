import { createContext, useContext, useEffect, useMemo, useState } from "react";
import messages from "./siteMessages.json";

const storageKey = "tagna:site-language";
const locales = { en: "en-PH", fil: "fil-PH", ceb: "ceb-PH" };
const LanguageContext = createContext({ language: "en", locale: locales.en, t: (message) => message });

export function SiteLanguageProvider({ children }) {
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "fil" || saved === "ceb") setLanguage(saved);
    } catch {
      // The selector still works when browser storage is unavailable.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const context = useMemo(() => ({
    language,
    locale: locales[language],
    t(message, values) {
      const pair = Object.hasOwn(messages, message) ? messages[message] : undefined;
      const text = (language === "fil" ? pair?.[0] : language === "ceb" ? pair?.[1] : undefined) ?? message;
      return values ? text.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match) : text;
    },
    chooseLanguage(next) {
      if (!Object.hasOwn(locales, next)) return;
      setLanguage(next);
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        // Keep the choice in memory for this visit.
      }
    },
  }), [language]);

  return <LanguageContext.Provider value={context}>{children}</LanguageContext.Provider>;
}

export function useSiteLanguage() {
  return useContext(LanguageContext);
}

export function SiteLanguageSelector() {
  const { language, t, chooseLanguage } = useSiteLanguage();
  return (
    <div className="border-b border-[#643100]/20 bg-[#f6e6d4] px-4">
      <label className="mx-auto flex max-w-6xl items-center justify-end gap-2 py-2 text-sm font-semibold">
        {t("Website language")}
        <select value={language} onChange={(event) => chooseLanguage(event.target.value)}
          className="rounded-lg border px-2 py-1">
          <option value="en" lang="en">English</option>
          <option value="fil" lang="fil">Tagalog</option>
          <option value="ceb" lang="ceb">Bisaya</option>
        </select>
      </label>
    </div>
  );
}
