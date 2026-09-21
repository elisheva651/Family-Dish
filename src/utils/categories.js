// A dish belongs to exactly one category. Built-in categories are stored as the
// stable keys below so they can be shown in either language; anything else is a
// custom category, stored as the person typed it.
export const CATEGORY_KEYS = [
  'soup',
  'salad',
  'dessert',
  'pasta',
  'baking',
  'meat',
  'fish',
]

// Stands in for "no category yet" in a URL, where null cannot be spelled.
export const UNCATEGORIZED_PARAM = '_none_'

// Names that mean a built-in category, so free-text tags written before
// categories existed land in the right group instead of becoming duplicates.
const ALIASES = {
  soup: ['soup', 'soups', 'מרק', 'מרקים'],
  salad: ['salad', 'salads', 'סלט', 'סלטים'],
  dessert: ['dessert', 'desserts', 'sweet', 'sweets', 'cake', 'cakes', 'קינוח', 'קינוחים', 'עוגה', 'עוגות'],
  pasta: ['pasta', 'pastas', 'פסטה', 'פסטות'],
  baking: ['baking', 'bread', 'breads', 'breads & baking', 'breads and baking', 'לחם', 'לחמים', 'אפייה', 'אפיה', 'לחמים ואפייה'],
  meat: ['meat', 'meats', 'poultry', 'chicken', 'meat & poultry', 'meat and poultry', 'בשר', 'עוף', 'בשר ועוף'],
  fish: ['fish', 'fishes', 'seafood', 'דג', 'דגים'],
}

const ALIAS_LOOKUP = Object.entries(ALIASES).reduce((acc, [key, names]) => {
  names.forEach(name => { acc[name] = key })
  return acc
}, {})

const clean = (value) => String(value ?? '').trim().replace(/\s+/g, ' ')

// Turns typed or legacy text into a category: a built-in key when it matches
// one, otherwise the tidied-up custom name. Null when there is nothing there.
export function resolveCategoryInput(input) {
  const name = clean(input)
  if (!name) return null
  return ALIAS_LOOKUP[name.toLowerCase()] || name
}

export function isBuiltInCategory(category) {
  return CATEGORY_KEYS.includes(category)
}

// Legacy recipes carry a `tags` array instead of a category. That array is
// never written or removed - it is only read here as a fallback.
export function getRecipeCategory(recipe) {
  return resolveCategoryInput(recipe?.category ?? recipe?.tags?.[0])
}

export function getCategoryLabel(category, t) {
  if (category === null || category === undefined) return t('category.uncategorized')
  return isBuiltInCategory(category) ? t(`category.${category}`) : category
}

// Custom category names already used in the group, offered as suggestions so
// the family converges on the same words. First spelling seen wins.
export function collectCustomCategories(recipes) {
  const seen = new Map()
  recipes.forEach(recipe => {
    const category = getRecipeCategory(recipe)
    if (!category || isBuiltInCategory(category)) return
    const key = category.toLowerCase()
    if (!seen.has(key)) seen.set(key, category)
  })
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}

// Built-in categories in menu order, then custom ones alphabetically, then the
// dishes still waiting for a category. Empty groups are left out.
export function groupRecipesByCategory(recipes) {
  const groups = new Map()
  recipes.forEach(recipe => {
    const category = getRecipeCategory(recipe)
    if (!groups.has(category)) groups.set(category, [])
    groups.get(category).push(recipe)
  })

  const order = [
    ...CATEGORY_KEYS,
    ...collectCustomCategories(recipes),
    null,
  ]

  return order
    .filter(category => groups.has(category))
    .map(category => ({ category, recipes: groups.get(category) }))
}

// A dish needs a name and a category before it can be saved.
export function canSaveRecipe({ title, category }) {
  return Boolean(clean(title)) && Boolean(resolveCategoryInput(category))
}
