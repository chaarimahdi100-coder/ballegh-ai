"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { fr } from "./translations/fr";
import { ar } from "./translations/ar";
import type { Language, Direction } from "@/lib/types";

type Translations = typeof fr;

interface I18nContextType {
  language: Language;
  direction: Direction;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("fr");

  useEffect(() => {
    // Check saved preference or fallback to 'fr'
    const saved = localStorage.getItem("ballegh_lang") as Language;
    if (saved === "fr" || saved === "ar") {
      setLanguageState(saved);
    }
  }, []);

  const direction: Direction = language === "ar" ? "rtl" : "ltr";

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("ballegh_lang", lang);
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === "fr" ? "ar" : "fr");
  };

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
      document.documentElement.dir = direction;
    }
  }, [language, direction]);

  const t = (path: string, params?: Record<string, string | number>): string => {
    const keys = path.split(".");
    const dictionary: Translations = language === "ar" ? (ar as unknown as Translations) : fr;
    const fallbackDict = fr;

    let current: unknown = dictionary;
    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = (current as Record<string, unknown>)[key];
      } else {
        // Fallback to FR
        current = undefined;
        break;
      }
    }

    if (current === undefined) {
      let fallbackCurrent: unknown = fallbackDict;
      for (const key of keys) {
        if (fallbackCurrent && typeof fallbackCurrent === "object" && key in fallbackCurrent) {
          fallbackCurrent = (fallbackCurrent as Record<string, unknown>)[key];
        } else {
          fallbackCurrent = undefined;
          break;
        }
      }
      current = fallbackCurrent;
    }

    if (typeof current !== "string") {
      return path;
    }

    let text = current;
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        text = text.replace(new RegExp(`{${key}}`, "g"), String(value));
      });
    }

    return text;
  };

  return (
    <I18nContext.Provider
      value={{
        language,
        direction,
        setLanguage,
        toggleLanguage,
        t,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
