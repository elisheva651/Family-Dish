import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import en from '../i18n/en.json'
import he from '../i18n/he.json'

const translations = { en, he }

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('familyDish_language') || 'en'
  })

  const setLanguage = useCallback((lang) => {
    setLanguageState(lang)
    localStorage.setItem('familyDish_language', lang)
  }, [])

  const t = useCallback((key) => {
    return translations[language]?.[key] || translations.en[key] || key
  }, [language])

  const isRTL = language === 'he'

  useEffect(() => {
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr')
    document.documentElement.setAttribute('lang', language)
  }, [language, isRTL])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within LanguageProvider')
  return context
}
