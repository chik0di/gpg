import { z } from 'zod'

export function validDay(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) > 0 && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
}
const id = z.string().uuid()
const day = z.string().refine(validDay, 'Choose a valid date.').nullable()
const text = z.string().max(5000)
export const projectToolsDraftSchema = z.object({
  tasks: z.array(z.object({ id, title: z.string().trim().max(200), due_date: day, completed: z.boolean() })).max(100),
  matrix: z.array(z.object({ id, source_id: id.nullable(), source_title: z.string().trim().min(1).max(1000), question: text, methods: text, findings: text, limitations: text, relevance: text })).max(200),
  outline: z.array(z.object({ id, heading: z.string().trim().max(200), word_budget: z.number().int().min(-100000).max(1000000), notes: text, source_ids: z.array(id).max(50) })).max(100),
  submission: z.array(z.object({ id, title: z.string().trim().max(300), notes: z.string().max(2000), completed: z.boolean() })).max(100).default([]),
  word_target: z.number().int().min(-100000).max(1000000),
}).refine(value => JSON.stringify(value).length <= 500000, 'This project plan is too large.')
  .refine(value => [value.tasks, value.matrix, value.outline, value.submission].every(rows => new Set(rows.map(row => row.id)).size === rows.length), 'Each entry must have a unique identifier.')
  .refine(value => toolsSourceIds(value).length <= 500, 'Link at most 500 different readings.')
export const projectToolsSchema = projectToolsDraftSchema.refine(value => value.tasks.every(task => task.title.length > 0) && value.submission.every(check => check.title.length > 0) && value.outline.every(section => section.heading.length > 0 && section.word_budget >= 0 && section.word_budget <= 100000) && value.word_target >= 0 && value.word_target <= 100000, 'Provide titles and word budgets between 0 and 100,000.')
export type ProjectTools = z.infer<typeof projectToolsSchema>
export const emptyProjectTools: ProjectTools = { tasks: [], matrix: [], outline: [], submission: [], word_target: 0 }

// Calendar days rather than elapsed hours keep plans stable across daylight-saving changes.
export function suggestTasks(deadline: string | null, today: string, makeId: () => string): ProjectTools['tasks'] {
  const labels = ['Understand the brief', 'Research and read sources', 'Build an outline', 'Write the first draft', 'Check references and revise', 'Final review and submission']
  if (!validDay(today)) throw new Error('Invalid start date.')
  const start = Date.parse(`${today}T00:00:00Z`)
  const end = deadline && validDay(deadline) ? Date.parse(`${deadline}T00:00:00Z`) : null
  const fractions = [0, 0.3, 0.45, 0.75, 0.9, 1]
  return labels.map((title, index) => ({ id: makeId(), title, completed: false, due_date: end !== null && end >= start ? new Date(start + Math.floor((end - start) / 86400000 * fractions[index]) * 86400000).toISOString().slice(0, 10) : null }))
}
export function localDay(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
export function toolsSourceIds(tools: { matrix: { source_id: string | null }[]; outline: { source_ids: string[] }[] }) {
  return [...new Set([...tools.matrix.flatMap(row => row.source_id ? [row.source_id] : []), ...tools.outline.flatMap(row => row.source_ids)])]
}
export function downloadTextFile(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a'); a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
// Quoted CSV cells still execute formulas in spreadsheet apps; prefix dangerous cells.
export function matrixCsv(tools: ProjectTools) {
  const cell = (value: string) => `"${(/^[\s]*[=+@-]/.test(value) ? "'" + value : value).replace(/"/g, '""')}"`
  return '\uFEFF' + [['Source', 'Research question', 'Methods', 'Findings', 'Limitations', 'Relevance'], ...tools.matrix.map(row => [row.source_title, row.question, row.methods, row.findings, row.limitations, row.relevance])].map(row => row.map(cell).join(',')).join('\r\n')
}
export function outlineText(tools: ProjectTools, title: string) {
  return `${title}\nWord target: ${tools.word_target || 'Not set'}\n\n` + tools.outline.map((row, i) => `${i + 1}. ${row.heading} (${row.word_budget} words)\n${row.notes}`).join('\n\n')
}

export function standardSubmissionChecks(makeId: () => string): ProjectTools['submission'] {
  return [
    'Every part of the assignment brief addressed',
    'Word count checked against the brief',
    'Claims supported by relevant evidence',
    'In-text citations matched to the bibliography',
    'Quotations and page numbers checked against sources',
    'Formatting and file name checked',
    'Required attachments included',
  ].map(title => ({ id: makeId(), title, notes: '', completed: false }))
}
