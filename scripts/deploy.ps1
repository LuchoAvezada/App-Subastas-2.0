# Publica el frontend en el NUC desde un commit exacto de main.
# Se niega a compilar con cambios sin commitear: lo que corre en el NUC siempre
# es un commit que existe en git. Deja dist/version.txt con el commit, para
# consultarlo con:  curl http://20.20.20.77/version.txt
#
# Uso (desde la raíz del repo):  .\scripts\deploy.ps1
# Pide la contraseña SSH dos veces (copia y publicación) y la de sudo una vez.
# Las migraciones SQL NO se aplican acá: ver docs/ejecucion-local.md.

param(
    [string]$Servidor = 'administrator@20.20.20.77',
    [switch]$PermitirOtraRama
)
$ErrorActionPreference = 'Stop'

# graphify-out se regenera solo y no forma parte de la app
$pendientes = git status --porcelain | Where-Object { $_ -notmatch 'graphify-out/' }
if ($pendientes) {
    Write-Host "Hay cambios sin commitear; commitealos antes de publicar:" -ForegroundColor Red
    $pendientes
    exit 1
}

$rama = git branch --show-current
if ($rama -ne 'main' -and -not $PermitirOtraRama) {
    Write-Host "Rama actual: '$rama'. Solo se publica desde main (o usa -PermitirOtraRama)." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path .env.production.local)) {
    # La URL de la API sale del navegador (F10): el archivo solo necesita la anon key
    Write-Host "Falta .env.production.local (VITE_SUPABASE_ANON_KEY)." -ForegroundColor Red
    exit 1
}

$commit = git rev-parse --short HEAD
npm.cmd run build
if ($LASTEXITCODE -ne 0) { exit 1 }

"commit: $commit`nrama: $rama`nfecha_commit: $(git log -1 --format=%cI)`npublicado: $(Get-Date -Format s)" |
    Out-File -Encoding ascii dist\version.txt

# Carpeta nueva en cada corrida: si ya existiera, scp copiaría dist adentro de ella
$destino = "deploy-$commit-$(Get-Date -Format yyyyMMddHHmmss)"
scp -r dist "${Servidor}:~/$destino"
if ($LASTEXITCODE -ne 0) { exit 1 }

ssh -t $Servidor "sudo rsync -a --delete ~/$destino/ /var/www/subastas/ && sudo chmod -R go=rX /var/www/subastas && cat /var/www/subastas/version.txt"
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "Publicado $commit en $Servidor" -ForegroundColor Green
