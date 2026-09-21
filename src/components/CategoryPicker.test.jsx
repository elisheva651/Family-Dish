import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageProvider } from '../contexts/LanguageContext'
import CategoryPicker from './CategoryPicker'

function renderPicker(props = {}) {
  const onChange = props.onChange || vi.fn()
  render(
    <LanguageProvider>
      <CategoryPicker value={null} suggestions={[]} {...props} onChange={onChange} />
    </LanguageProvider>
  )
  return { onChange }
}

describe('CategoryPicker', () => {
  it('offers every built-in category', () => {
    renderPicker()
    const names = ['Soups', 'Salads', 'Desserts', 'Pastas', 'Breads & Baking', 'Meat & Poultry', 'Fish']
    names.forEach(name => {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    })
  })

  it('reports the category that was chosen', () => {
    const { onChange } = renderPicker()
    fireEvent.click(screen.getByRole('button', { name: 'Soups' }))
    expect(onChange).toHaveBeenCalledWith('soup')
  })

  it('marks the chosen category as selected', () => {
    renderPicker({ value: 'fish' })
    expect(screen.getByRole('button', { name: 'Fish' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Soups' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('offers custom categories the group already uses', () => {
    const { onChange } = renderPicker({ suggestions: ['savta'] })
    fireEvent.click(screen.getByRole('button', { name: 'savta' }))
    expect(onChange).toHaveBeenCalledWith('savta')
  })

  it('reveals a text box when Other is chosen and reports what is typed', () => {
    const { onChange } = renderPicker()
    expect(screen.queryByPlaceholderText('Name your category')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Other' }))
    fireEvent.change(screen.getByPlaceholderText('Name your category'), {
      target: { value: 'pickles' },
    })

    expect(onChange).toHaveBeenLastCalledWith('pickles')
  })

  it('shows a custom value in the text box, with Other selected', () => {
    renderPicker({ value: 'pickles' })
    expect(screen.getByPlaceholderText('Name your category')).toHaveValue('pickles')
    expect(screen.getByRole('button', { name: 'Other' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('clears the category when the custom name is emptied', () => {
    const { onChange } = renderPicker({ value: 'pickles' })
    fireEvent.change(screen.getByPlaceholderText('Name your category'), {
      target: { value: '' },
    })
    expect(onChange).toHaveBeenLastCalledWith(null)
  })
})
