// Allow CSS/image imports in TypeScript — Next.js processes these at build time
declare module '*.css'
declare module '*.svg' {
  const content: string
  export default content
}
