"use client";

import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import hi from "./hi.json";

// One shared instance. Adding a language = import its JSON and add it here.
if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
    },
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18next;
