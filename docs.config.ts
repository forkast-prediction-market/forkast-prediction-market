import { defineConfig, defineDocs } from 'fumadocs-mdx/config'

export const docs = defineDocs({
  dir: 'docs',
})

export default defineConfig({
  lastModifiedTime: 'git',
})
