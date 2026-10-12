import { readFileSync } from 'node:fs'
import path from 'node:path'

function toDataUri(filename: string): string {
  const buffer = readFileSync(path.join(process.cwd(), filename))
  return `data:image/jpeg;base64,${buffer.toString('base64')}`
}

export const logoDataUri = toDataUri('logo.jpeg')
export const stampDataUri = toDataUri('tampon.jpeg')
