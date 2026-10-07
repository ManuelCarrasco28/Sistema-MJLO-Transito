<#
  Ejecuta la app móvil apuntando al backend de TU PC.

  Lee MOBILE_API_URL del archivo .env de la raíz del proyecto (el .env no se sube a GitHub: cada persona
  tiene el suyo, con la IP de su propia PC) y se la pasa a Flutter como --dart-define=API_URL=...

  Uso:
    .\run-dev.ps1                     # flutter run con la IP del .env
    .\run-dev.ps1 -d R58M123ABC       # cualquier argumento extra se pasa a flutter run
    .\run-dev.ps1 -MostrarSolo        # solo muestra el comando, no lo ejecuta

  Si MOBILE_API_URL no existe en el .env, se usa el valor por defecto de la app (10.0.2.2, emulador de Android).
#>
param(
    [switch]$MostrarSolo,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ArgumentosFlutter
)

$raiz = Split-Path -Parent $PSScriptRoot
$archivoEnv = Join-Path $raiz '.env'
$url = $null
$clave = $null

if (Test-Path $archivoEnv) {
    $linea = Get-Content $archivoEnv -Encoding UTF8 | Where-Object { $_ -match '^\s*MOBILE_API_URL\s*=' } | Select-Object -First 1
    if ($linea) {
        $url = ($linea -replace '^\s*MOBILE_API_URL\s*=\s*', '').Trim().Trim('"').Trim("'")
    }
}

if (Test-Path $archivoEnv) {
    $lc = Get-Content $archivoEnv -Encoding UTF8 | Where-Object { $_ -match '^\s*app\.mobileKey\s*=' } | Select-Object -First 1
    if ($lc) { $clave = ($lc -replace '^\s*app\.mobileKey\s*=\s*', '').Trim().Trim('"').Trim("'") }
}

$argumentos = @('run')
if ($url) {
    Write-Host "Backend de la app: $url (de MOBILE_API_URL en .env)" -ForegroundColor Cyan
    $argumentos += "--dart-define=API_URL=$url"
} else {
    Write-Host 'MOBILE_API_URL no está en el .env: se usa la dirección por defecto de la app (10.0.2.2, emulador).' -ForegroundColor Yellow
}
if ($clave) { $argumentos += "--dart-define=MOBILE_KEY=$clave" }
if ($ArgumentosFlutter) { $argumentos += $ArgumentosFlutter }

if ($MostrarSolo) {
    Write-Host ('flutter ' + ($argumentos -join ' '))
    return
}

Set-Location $PSScriptRoot
& flutter @argumentos
