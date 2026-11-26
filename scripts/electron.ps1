$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$version = (Get-Content (Join-Path $repoRoot "VERSION") -Raw).Trim()
$editor = Join-Path $repoRoot "dist\editor"
if (-not (Test-Path (Join-Path $editor "apps\web\server.js"))) {
	throw "Editor files were not staged."
}

Push-Location (Join-Path $repoRoot "electron")
try {
	npm install
	if ($LASTEXITCODE -ne 0) {
		throw "Failed to install Electron"
	}
	npm pkg set "version=$version"
	npx electron-builder --win zip msi --x64
	if ($LASTEXITCODE -ne 0) {
		throw "Failed to build the Electron app"
	}
} finally {
	Pop-Location
}

Write-Host "Built the Electron app $version"
