import { cpSync } from 'node:fs'

cpSync('data', 'dist/data', { recursive: true })
