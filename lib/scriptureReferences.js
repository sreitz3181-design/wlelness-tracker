// References only — not verse text. The API route asks the model to write
// a short paraphrased reflection tied to each reference's theme, rather
// than quoting exact NIV wording, since we can't guarantee the model
// reproduces translation-specific phrasing correctly. If verbatim NIV
// quotations matter later, the right fix is a licensed source like
// scripture.api.bible (Biblica-approved), not the model's memory.
export const LOVE_REFERENCES = [
  { ref: 'John 3:16', theme: "God's love shown through sending Jesus" },
  { ref: '1 John 4:19', theme: 'we love because He first loved us' },
  { ref: 'Romans 8:38-39', theme: 'nothing can separate us from God\u2019s love' },
  { ref: 'Psalm 103:11', theme: "the vastness of God's love" },
  { ref: 'Jeremiah 31:3', theme: 'everlasting love and unfailing kindness' },
  { ref: 'Romans 5:8', theme: 'love shown while we were still sinners' },
  { ref: '1 John 4:16', theme: 'God is love' },
  { ref: 'Ephesians 2:4-5', theme: 'rich mercy and grace' },
  { ref: 'Psalm 136:1', theme: 'love that endures forever' },
  { ref: 'Zephaniah 3:17', theme: 'God delighting and rejoicing over you' },
  { ref: 'Lamentations 3:22-23', theme: 'mercies new every morning' },
  { ref: 'Psalm 34:18', theme: 'closeness to the brokenhearted' },
  { ref: 'John 15:13', theme: 'love that lays down its life' },
  { ref: 'Isaiah 41:10', theme: 'do not fear, God is with you' },
]

export function referenceForDate(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date - start
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  return LOVE_REFERENCES[dayOfYear % LOVE_REFERENCES.length]
}
