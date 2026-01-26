# Ejemplo: Conversión a Tailwind Responsive

## Ejemplo 1: Header Responsive

**ANTES (inline styles):**
```tsx
<div style={{ 
  background: '#047858',
  padding: '8px 24px',
  color: 'white',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
}}>
  <div className="container" style={{ maxWidth: '1400px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/icons/dosusuarios1.svg" alt="Roles" style={{ width: '50px', height: '50px' }} /> 
          Gestión de Usuarios
        </h1>
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        {/* Botones */}
      </div>
    </div>
  </div>
</div>
```

**DESPUÉS (Tailwind responsive):**
```tsx
<div className="bg-[#047858] text-white shadow-md py-2 px-4 md:px-6">
  <div className="max-w-[1400px] mx-auto">
    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
      <div>
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-1 flex items-center gap-3">
          <img src="/icons/dosusuarios1.svg" alt="Roles" className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12" /> 
          <span className="hidden sm:inline">Gestión de Usuarios</span>
          <span className="sm:hidden">Usuarios</span>
        </h1>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full sm:w-auto">
        {/* Botones - en móvil se apilan verticalmente */}
      </div>
    </div>
  </div>
</div>
```

## Ejemplo 2: Grid de Usuarios Responsive

**ANTES:**
```tsx
<div style={{ display: 'grid', gap: '16px' }}>
  {users.map((user) => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      padding: '16px',
      background: '#FFFFFF',
      border: '1px solid #E5E7EB',
      borderRadius: '8px'
    }}>
      {/* Contenido */}
    </div>
  ))}
</div>
```

**DESPUÉS:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {users.map((user) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
      {/* Contenido - en móvil se apila, en tablet+ se muestra en fila */}
    </div>
  ))}
</div>
```

## Ejemplo 3: Botones Responsive

**ANTES:**
```tsx
<button style={{ 
  display: 'flex',
  alignItems: 'center',
  background: '#2563EB', 
  color: 'white',
  padding: '8px 16px',
  fontSize: '16px'
}}>
  <img src="/icons/iconoatras-blanco.svg" style={{ width: '28px', height: '28px', marginRight: '8px' }} /> 
  Volver
</button>
```

**DESPUÉS:**
```tsx
<button className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 md:px-4 md:py-2 text-sm md:text-base rounded-lg transition-all hover:scale-105 active:scale-95">
  <img src="/icons/iconoatras-blanco.svg" className="w-5 h-5 md:w-7 md:h-7 mr-2" /> 
  <span className="hidden sm:inline">Volver</span>
  <span className="sm:hidden">←</span>
</button>
```

## Clases Tailwind más usadas para Responsive

### Espaciado
- `p-2 md:p-4 lg:p-6` - Padding que crece con pantalla
- `gap-2 md:gap-4` - Gap entre elementos
- `m-2 md:m-4` - Margin

### Tamaños de texto
- `text-sm md:text-base lg:text-lg` - Texto más grande en pantallas grandes
- `text-xs sm:text-sm md:text-base` - Texto pequeño en móvil

### Layout
- `flex-col md:flex-row` - Columna en móvil, fila en tablet+
- `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` - Grid adaptativo
- `w-full md:w-auto` - Ancho completo en móvil, auto en tablet+

### Visibilidad
- `hidden md:block` - Oculto en móvil, visible en tablet+
- `block md:hidden` - Visible solo en móvil
- `sm:hidden lg:block` - Oculto en móvil y tablet, visible en desktop

### Tamaños de iconos/imágenes
- `w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10` - Iconos más grandes en pantallas grandes
