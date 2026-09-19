// Grocery list helpers: parse ingredient strings like "2 Chicken Breast" or
// "1 1/2 lb Ground Turkey" into {quantity, unit, name}, and combine duplicate
// lines into one with summed quantities.
//
// All arithmetic lives here on purpose (deterministic). The AI route is only
// ever asked which *names* refer to the same thing to buy — never to add
// numbers — and its answer arrives as groups of names that are then summed
// here.

// Spelling variants -> one canonical unit. A unit only counts when it comes
// directly after a leading number ("2 lb Ground Turkey"), so a name like
// "Canned Diced Tomatoes" is never misread.
const UNIT_ALIASES = {
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  cup: 'cup', cups: 'cup',
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  can: 'can', cans: 'can',
  bag: 'bag', bags: 'bag',
  bunch: 'bunch', bunches: 'bunch',
  pkg: 'pkg', package: 'pkg', packages: 'pkg',
  jar: 'jar', jars: 'jar',
  box: 'box', boxes: 'box',
  bottle: 'bottle', bottles: 'bottle',
  clove: 'clove', cloves: 'clove',
  dozen: 'dozen',
  gal: 'gal', gallon: 'gal', gallons: 'gal',
  qt: 'qt', quart: 'qt', quarts: 'qt',
  pt: 'pt', pint: 'pt', pints: 'pt',
}

// A leading quantity: "2", "1.5", ".5", "1/2", or "1 1/2" — followed by
// whitespace and the rest of the name. Requiring the whitespace keeps
// "2% Milk" from being read as a quantity of 2.
const LEADING_QTY = /^\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|\.\d+)\s+(.+)$/

function toNumber(text) {
  return text
    .trim()
    .split(/\s+/)
    .reduce((sum, part) => {
      if (part.includes('/')) {
        const [n, d] = part.split('/').map(Number)
        return d ? sum + n / d : sum
      }
      return sum + Number(part)
    }, 0)
}

// "2 Chicken Breast" -> {quantity: 2, unit: '', name: 'Chicken Breast'}
// "Garlic"           -> {quantity: 1, unit: '', name: 'Garlic'}
// "2 lb Ground Turkey" -> {quantity: 2, unit: 'lb', name: 'Ground Turkey'}
export function parseIngredient(raw) {
  const text = String(raw || '').trim().replace(/\s+/g, ' ')
  const fallback = { quantity: 1, unit: '', name: text }
  const m = text.match(LEADING_QTY)
  if (!m) return fallback

  const quantity = toNumber(m[1])
  let rest = m[2].trim()
  let unit = ''

  const tokens = rest.split(' ')
  const first = tokens[0].toLowerCase().replace(/\.$/, '')
  if (UNIT_ALIASES[first] && tokens.length > 1) {
    unit = UNIT_ALIASES[first]
    rest = tokens.slice(1).join(' ').replace(/^of\s+/i, '').trim()
  }

  if (!(quantity > 0) || !rest) return fallback
  return { quantity, unit, name: rest }
}

function singular(word) {
  if (word.length <= 3) return word
  if (/ies$/.test(word) && word.length > 4) return word.slice(0, -3) + 'y'
  if (/oes$/.test(word)) return word.slice(0, -2)
  if (/(ss|us|is)$/.test(word)) return word
  if (/s$/.test(word)) return word.slice(0, -1)
  return word
}

// A matching key for a name: lowercase, spacing/punctuation collapsed, last
// word singularized, so "Chicken Breasts" and "chicken breast" match. A
// trailing parenthetical is kept as part of the key — "Frozen Broccoli (or
// Green Beans)" stays distinct from plain "Frozen Broccoli".
export function normalizeKey(name) {
  const lower = String(name || '').toLowerCase().replace(/&/g, ' and ').replace(/\s+/g, ' ').trim()
  const m = lower.match(/^(.*?)\s*\(([^)]*)\)\s*$/)
  const base = (m ? m[1] : lower).replace(/[.,;:]+$/, '').trim()
  const qualifier = m ? m[2].trim() : ''
  const words = base.split(' ')
  words[words.length - 1] = singular(words[words.length - 1])
  return words.join(' ') + (qualifier ? ` (${qualifier})` : '')
}

function round2(n) {
  return Math.round(n * 100) / 100
}

// Combine lines into buckets, summing quantity. Lines join a bucket when they
// have the same normalized name AND the same unit (never adds "2 lb" to
// "3 cans"), or when the AI says their names are the same thing (`groups`:
// [{canonical, members: [names]}]). Each line is anything with
// {name, quantity, unit}; extra fields (id, source, ...) ride along in
// `items`. Returns [{name, quantity, unit, items: [lines...]}] in first-seen
// order.
export function combineLines(lines, groups = []) {
  const groupOfKey = new Map()
  groups.forEach((g, gi) => {
    ;(g.members || []).forEach((member) => groupOfKey.set(normalizeKey(member), gi))
  })

  const buckets = new Map()
  for (const line of lines) {
    const key = normalizeKey(line.name)
    const gi = groupOfKey.get(key)
    const unit = line.unit || ''
    const bucketKey = `${gi !== undefined ? `g${gi}` : key}|${unit}`

    let bucket = buckets.get(bucketKey)
    if (!bucket) {
      bucket = {
        name: gi !== undefined ? groups[gi].canonical || line.name : line.name,
        quantity: 0,
        unit,
        items: [],
      }
      buckets.set(bucketKey, bucket)
    }
    bucket.quantity += Number(line.quantity) > 0 ? Number(line.quantity) : 1
    bucket.items.push(line)
  }

  return Array.from(buckets.values()).map((b) => ({ ...b, quantity: round2(b.quantity) }))
}

// The first item in `items` with the same name (ignoring case/plurals) and
// the same unit as `parsed`, or undefined.
export function findMatch(items, parsed) {
  const key = normalizeKey(parsed.name)
  return items.find((i) => normalizeKey(i.name) === key && (i.unit || '') === (parsed.unit || ''))
}

export function formatQuantity(q) {
  return String(round2(Number(q) || 0))
}

// "8 Chicken Breast", "2 lb Ground Turkey", or just "Salsa" for a plain 1.
export function formatLine({ quantity, unit, name }) {
  const q = Number(quantity) || 1
  const qty = q === 1 && !unit ? '' : `${formatQuantity(q)}${unit ? ' ' + unit : ''} `
  return `${qty}${name}`
}
