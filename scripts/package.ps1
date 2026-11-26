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

Copy-Item -Path (Join-Path $standalone "*") -Destination $OutDir -Recurse
$staticDest = Join-Path $OutDir "apps\web\.next\static"
New-Item -ItemType Directory -Force -Path (Split-Path $staticDest) | Out-Null
Copy-Item -Recurse $static $staticDest
if (Test-Path $public) {
	$publicDest = Join-Path $OutDir "apps\web\public"
	if (Test-Path $publicDest) {
		Remove-Item -Recurse -Force $publicDest
	}
	Copy-Item -Recurse $public $publicDest
}

Write-Host "Staged the editor in $OutDir"
