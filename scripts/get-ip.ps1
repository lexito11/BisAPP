# Script para obtener la IP local de la computadora
# Útil para acceder a la aplicación desde dispositivos móviles

Write-Host "`n=== IP Local de tu Computadora ===" -ForegroundColor Cyan
Write-Host "Usa esta IP para acceder desde tu celular: http://IP:3000`n" -ForegroundColor Yellow

# Obtener todas las interfaces de red activas
$adapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and 
    $_.IPAddress -notlike "169.254.*" -and
    $_.PrefixOrigin -eq "Dhcp" -or $_.PrefixOrigin -eq "Manual"
} | Select-Object IPAddress, InterfaceAlias | Sort-Object InterfaceAlias

if ($adapters) {
    Write-Host "IPs disponibles:" -ForegroundColor Green
    foreach ($adapter in $adapters) {
        Write-Host "  - $($adapter.IPAddress) ($($adapter.InterfaceAlias))" -ForegroundColor White
    }
    Write-Host "`nEjemplo de URL para tu celular:" -ForegroundColor Yellow
    Write-Host "  http://$($adapters[0].IPAddress):3000" -ForegroundColor Cyan -BackgroundColor DarkBlue
} else {
    Write-Host "No se encontraron IPs locales. Asegúrate de estar conectado a una red." -ForegroundColor Red
}

Write-Host "`nAsegúrate de ejecutar 'npm run dev:network' en la carpeta frontend`n" -ForegroundColor Yellow
