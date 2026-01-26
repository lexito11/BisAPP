/**
 * Elimina solo la carpeta de cache de Next.js (frontend/.next/cache).
 * Ejecutar: node scripts/clean-cache.js
 * Desde CMD o PowerShell si el terminal de Cursor falla.
 */
const fs = require('fs')
const path = require('path')

const cacheDir = path.join(__dirname, '..', 'frontend', '.next', 'cache')
if (fs.existsSync(cacheDir)) {
  fs.rmSync(cacheDir, { recursive: true, force: true })
  console.log('✓ Cache eliminada: frontend/.next/cache')
} else {
  console.log('No hay cache que eliminar.')
}
