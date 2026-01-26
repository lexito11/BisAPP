# Instalación de Tailwind CSS para Responsive

## Pasos para instalar Tailwind

**Abre CMD o PowerShell** en la carpeta `frontend` y ejecuta:

```bash
npm install -D tailwindcss postcss autoprefixer
```

## Configuración completada

Ya están creados:
- ✅ `tailwind.config.js` - Configuración de Tailwind
- ✅ `postcss.config.js` - Configuración de PostCSS
- ✅ `globals.css` - Actualizado con directivas de Tailwind
- ✅ `package.json` - Dependencias agregadas (instalar con npm)

## Cómo usar Tailwind para Responsive

### Breakpoints de Tailwind:
- `sm:` - 640px y arriba (móviles grandes)
- `md:` - 768px y arriba (tablets)
- `lg:` - 1024px y arriba (laptops)
- `xl:` - 1280px y arriba (desktop)
- `2xl:` - 1536px y arriba (pantallas grandes)

### Ejemplo de conversión:

**Antes (inline styles):**
```tsx
<div style={{ 
  display: 'flex', 
  gap: '12px',
  padding: '24px'
}}>
```

**Después (Tailwind responsive):**
```tsx
<div className="flex flex-col md:flex-row gap-3 md:gap-4 p-4 md:p-6">
  {/* En móvil: columna, en tablet+: fila */}
</div>
```

### Clases comunes responsive:

- **Layout:** `flex-col md:flex-row` (columna en móvil, fila en tablet+)
- **Padding:** `p-4 md:p-6 lg:p-8` (padding crece con pantalla)
- **Texto:** `text-sm md:text-base lg:text-lg` (tamaño crece)
- **Grid:** `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` (columnas adaptativas)
- **Ocultar/Mostrar:** `hidden md:block` (oculto en móvil, visible en tablet+)

## Próximos pasos

1. Instalar dependencias: `npm install -D tailwindcss postcss autoprefixer`
2. Reiniciar el servidor dev: `npm run dev`
3. Empezar a convertir componentes usando clases de Tailwind
