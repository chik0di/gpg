const FEEDBACK_EXTENSIONS = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg']
const DELIVERY_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'zip']

export function revisionFileError(file: File, delivery: boolean): string | null {
  const extensions = delivery ? DELIVERY_EXTENSIONS : FEEDBACK_EXTENSIONS
  if (!extensions.includes(file.name.split('.').pop()?.toLowerCase() || '')) return 'Unsupported file type.'
  const maxMb = delivery ? 100 : 20
  if (file.size === 0 || file.size > maxMb * 1024 * 1024) return `Choose a non-empty file under ${maxMb} MB.`
  return null
}

export function revisionStoragePath(orderId: string, file: File, delivery: boolean) {
  const name = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120)
  return `revisions/${orderId}/${delivery ? 'deliveries' : 'feedback'}/${crypto.randomUUID()}_${name}`
}
