# Pasos para hacer commit sin basura

**Abre CMD o PowerShell** en la carpeta del proyecto (el terminal de Cursor puede fallar).

## Opción A: Script automático

```powershell
cd "C:\Users\ALEXANDER\OneDrive\Desktop\BisAPP"
.\scripts\commit-sin-basura.ps1
```

El script deja de trackear `frontend/.next` y `frontend/node_modules`, hace `git add .`, muestra el estado y te pregunta si hacer commit.

---

## Opción B: Comandos manuales

### 1. Dejar de trackear basura (solo índice, no borra en disco)

```bash
git rm -r --cached frontend/.next
git rm -r --cached frontend/node_modules
```

(Si alguno no estaba trackeado, Git avisará; sigue con el siguiente paso.)

### 2. Agregar cambios

```bash
git add .
```

`.gitignore` excluye `node_modules/`, `frontend/.next/` y otra basura.

### 3. Revisar qué se va a commitear

```bash
git status
```

Comprueba que **no** aparezcan `frontend/.next/` ni `node_modules/`.

### 4. Hacer commit

```bash
git commit -m "UI: BisAPP, boton azul, tabla scroll, config sin sombra, leyenda, Volver sin flecha"
```

---

## Si el push falló por archivos >100 MB (node_modules en el historial)

GitHub rechaza archivos &gt;100 MB. Si `node_modules` o `.next` se subieron antes, hay que **limpiar el historial** y volver a hacer push:

**Abre CMD o PowerShell** en la raíz del proyecto y ejecuta **en este orden**:

```bash
cd "C:\Users\ALEXANDER\OneDrive\Desktop\BisAPP"
```

```bash
git checkout --orphan limpio
```

```bash
git add .
```

```bash
git status
```
*(Comprueba que no aparezcan `node_modules` ni `.next`.)*

```bash
git commit -m "BisAPP: UI, boton azul, tabla scroll, config, leyenda, Volver"
```

```bash
git branch -D main
```

```bash
git branch -m main
```

```bash
git push -f origin main
```

Con esto se crea un historial nuevo **sin** `node_modules` ni `.next`. El `-f` sobrescribe la rama `main` en GitHub.

---

**Para limpiar cache en el futuro:**  
Desde la raíz: `node scripts/clean-cache.js`  
O desde `frontend`: `npm run clean:cache`
