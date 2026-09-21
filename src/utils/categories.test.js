import { describe, it, expect } from 'vitest'
import {
  CATEGORY_KEYS,
  getRecipeCategory,
  isBuiltInCategory,
  resolveCategoryInput,
  groupRecipesByCategory,
  collectCustomCategories,
  canSaveRecipe,
  UNCATEGORIZED_PARAM,
} from './categories'

describe('getRecipeCategory', () => {
  it('returns the stored category', () => {
    expect(getRecipeCategory({ category: 'soup' })).toBe('soup')
  })

  it('falls back to the first legacy tag when there is no category', () => {
    expect(getRecipeCategory({ tags: ['savta', 'pesach'] })).toBe('savta')
  })

  it('maps a legacy tag onto a built-in category', () => {
    expect(getRecipeCategory({ tags: ['Desserts'] })).toBe('dessert')
  })

  it('maps a Hebrew legacy tag onto a built-in category', () => {
    expect(getRecipeCategory({ tags: ['מרקים'] })).toBe('soup')
  })

  it('returns null when the recipe has no category and no tags', () => {
    expect(getRecipeCategory({ title: 'Untagged dish' })).toBe(null)
  })

  it('returns null when the legacy tags array is empty', () => {
    expect(getRecipeCategory({ tags: [] })).toBe(null)
  })

  it('prefers the stored category over a legacy tag', () => {
    expect(getRecipeCategory({ category: 'fish', tags: ['dessert'] })).toBe('fish')
  })
})

describe('isBuiltInCategory', () => {
  it('recognises a built-in key', () => {
    expect(isBuiltInCategory('pasta')).toBe(true)
  })

  it('rejects a custom category name', () => {
    expect(isBuiltInCategory('savta')).toBe(false)
  })

  it('rejects null', () => {
    expect(isBuiltInCategory(null)).toBe(false)
  })
})

describe('resolveCategoryInput', () => {
  it('trims and collapses whitespace in a custom name', () => {
    expect(resolveCategoryInput('  pickles   and jam ')).toBe('pickles and jam')
  })

  it('returns a built-in key when the typed name matches one', () => {
    expect(resolveCategoryInput('Fish')).toBe('fish')
  })

  it('returns a built-in key when the typed Hebrew name matches one', () => {
    expect(resolveCategoryInput('דגים')).toBe('fish')
  })

  it('returns null for an empty input', () => {
    expect(resolveCategoryInput('   ')).toBe(null)
  })
})

describe('groupRecipesByCategory', () => {
  it('lists built-in categories in their defined order', () => {
    const groups = groupRecipesByCategory([
      { id: '1', category: 'fish' },
      { id: '2', category: 'soup' },
      { id: '3', category: 'dessert' },
    ])
    expect(groups.map(g => g.category)).toEqual(['soup', 'dessert', 'fish'])
  })

  it('omits categories that have no recipes', () => {
    const groups = groupRecipesByCategory([{ id: '1', category: 'soup' }])
    expect(groups).toHaveLength(1)
  })

  it('puts custom categories after the built-in ones, alphabetically', () => {
    const groups = groupRecipesByCategory([
      { id: '1', category: 'zaatar things' },
      { id: '2', category: 'anise things' },
      { id: '3', category: 'soup' },
    ])
    expect(groups.map(g => g.category)).toEqual(['soup', 'anise things', 'zaatar things'])
  })

  it('puts uncategorized recipes last, under a null category', () => {
    const groups = groupRecipesByCategory([
      { id: '1' },
      { id: '2', category: 'custom' },
      { id: '3', category: 'soup' },
    ])
    expect(groups.map(g => g.category)).toEqual(['soup', 'custom', null])
  })

  it('keeps every recipe, grouping legacy tagged ones by their tag', () => {
    const groups = groupRecipesByCategory([
      { id: '1', tags: ['desserts'] },
      { id: '2', category: 'dessert' },
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].recipes.map(r => r.id)).toEqual(['1', '2'])
  })
})

describe('collectCustomCategories', () => {
  it('returns only the custom names used in the group, sorted', () => {
    const custom = collectCustomCategories([
      { category: 'soup' },
      { category: 'savta' },
      { category: 'pickles' },
      {},
    ])
    expect(custom).toEqual(['pickles', 'savta'])
  })

  it('deduplicates names that differ only by case', () => {
    const custom = collectCustomCategories([
      { category: 'Savta' },
      { category: 'savta' },
    ])
    expect(custom).toEqual(['Savta'])
  })
})

describe('CATEGORY_KEYS', () => {
  it('is the agreed list, in menu order', () => {
    expect(CATEGORY_KEYS).toEqual([
      'soup',
      'salad',
      'dessert',
      'pasta',
      'baking',
      'meat',
      'fish',
    ])
  })
})

describe('canSaveRecipe', () => {
  it('allows saving when there is a name and a category', () => {
    expect(canSaveRecipe({ title: 'Chicken soup', category: 'soup' })).toBe(true)
  })

  it('refuses to save without a category', () => {
    expect(canSaveRecipe({ title: 'Chicken soup', category: null })).toBe(false)
  })

  it('refuses to save with a blank custom category', () => {
    expect(canSaveRecipe({ title: 'Chicken soup', category: '   ' })).toBe(false)
  })

  it('refuses to save without a name', () => {
    expect(canSaveRecipe({ title: '  ', category: 'soup' })).toBe(false)
  })
})

describe('UNCATEGORIZED_PARAM', () => {
  it('is safe to put in a URL', () => {
    expect(encodeURIComponent(UNCATEGORIZED_PARAM)).toBe(UNCATEGORIZED_PARAM)
  })

  it('cannot be mistaken for a real category name', () => {
    expect(resolveCategoryInput(UNCATEGORIZED_PARAM)).not.toBe(null)
    expect(isBuiltInCategory(UNCATEGORIZED_PARAM)).toBe(false)
    expect(UNCATEGORIZED_PARAM).not.toMatch(/^[a-z]+$/)
  })
})
