param(
	[Parameter(Mandatory = $true)]
	[string]$ClassicRoot,
	[Parameter(Mandatory = $true)]
	[string]$OutDir
)

$ErrorActionPreference = "Stop"

$standalone = Join-Path $ClassicRoot "apps\web\.next\standalone"
$static = Join-Path $ClassicRoot "apps\web\.next\static"
$public = Join-Path $ClassicRoot "apps\web\public"
$serverJs = Join-Path $standalone "apps\web\server.js"

if (-not (Test-Path $serverJs)) {
	throw "Standalone server was not built: $serverJs"
}

if (Test-Path $OutDir) {
	Remove-Item -Recurse -Force $OutDir
}
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

Copy-Item -Recurse $standalone (Join-Path $OutDir "resources")
$staticDest = Join-Path $OutDir "resources\apps\web\.next\static"
New-Item -ItemType Directory -Force -Path (Split-Path $staticDest) | Out-Null
Copy-Item -Recurse $static $staticDest
if (Test-Path $public) {
	Copy-Item -Recurse $public (Join-Path $OutDir "resources\apps\web\public")
}

$node = (Get-Command node).Source
Copy-Item $node (Join-Path $OutDir "node.exe")

$bun = (Get-Command bun).Source
$launcher = Join-Path $PSScriptRoot "..\src\launcher.ts"
& $bun build $launcher --compile --outfile (Join-Path $OutDir "opencut-classic.exe")
if ($LASTEXITCODE -ne 0) {
	throw "Failed to compile opencut-classic.exe"
}

Write-Host "Packaged $(Join-Path $OutDir 'opencut-classic.exe')"
