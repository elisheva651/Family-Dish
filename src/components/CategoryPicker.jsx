import { useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { CATEGORY_KEYS, isBuiltInCategory } from '../utils/categories'
import './CategoryPicker.css'

// Pick exactly one category for a dish. `value` is a built-in key, a custom
// name, or null. Custom names are reported as typed - aliases are resolved
// when the recipe is saved.
export default function CategoryPicker({ value, onChange, suggestions = [] }) {
  const { t } = useLanguage()
  const hasCustomValue = Boolean(value) && !isBuiltInCategory(value)
  const isSuggested = hasCustomValue && suggestions.includes(value)
  const [otherOpen, setOtherOpen] = useState(hasCustomValue && !isSuggested)

  const chooseOther = () => {
    setOtherOpen(true)
    if (isBuiltInCategory(value)) onChange(null)
  }

  const choose = (category) => {
    setOtherOpen(false)
    onChange(category)
  }

  const options = [...CATEGORY_KEYS, ...suggestions]

  return (
    <div className="category-picker">
      <div className="category-options">
        {options.map(option => (
          <button
            key={option}
            type="button"
            className={`category-option ${value === option && !otherOpen ? 'selected' : ''}`}
            aria-pressed={value === option && !otherOpen}
            onClick={() => choose(option)}
          >
            {isBuiltInCategory(option) ? t(`category.${option}`) : option}
          </button>
        ))}

        <button
          type="button"
          className={`category-option ${otherOpen ? 'selected' : ''}`}
          aria-pressed={otherOpen}
          onClick={chooseOther}
        >
          {t('category.other')}
        </button>
      </div>

      {otherOpen && (
        <input
          className="category-custom-input"
          type="text"
          placeholder={t('category.customPlaceholder')}
          value={hasCustomValue ? value : ''}
          onChange={(e) => onChange(e.target.value.trim() ? e.target.value : null)}
          autoFocus
        />
      )}
    </div>
  )
}
