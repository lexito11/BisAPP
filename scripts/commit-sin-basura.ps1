# Commit sin basura: quita .next y node_modules del seguimiento y hace commit.
# Ejecutar desde la raíz del proyecto:  .\scripts\commit-sin-basura.ps1
# O en PowerShell:  cd "C:\Users\ALEXANDER\OneDrive\Desktop\BisAPP"; .\scripts\commit-sin-basura.ps1

Set-Location $PSScriptRoot\..

Write-Host "1. Dejando de trackear basura (.next, node_modules)..." -ForegroundColor Cyan
git rm -r --cached frontend/.next 2>$null
git rm -r --cached frontend/node_modules 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "   (Algunos ya no estaban trackeados, ok)" -ForegroundColor Gray }

Write-Host "2. Agregando cambios (gitignore excluye basura)..." -ForegroundColor Cyan
git add .

Write-Host "3. Estado (no debe aparecer .next ni node_modules):" -ForegroundColor Cyan
git status --short

$r = Read-Host "4. Hacer commit? (s/n)"
if ($r -eq 's' -or $r -eq 'S') {
  git commit -m "UI: BisAPP, boton azul, tabla scroll, config sin sombra, leyenda, Volver sin flecha"
  Write-Host "Listo." -ForegroundColor Green
} else {
  Write-Host "Commit cancelado. Cambios siguen en staging." -ForegroundColor Yellow
}
