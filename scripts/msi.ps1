param(
	[Parameter(Mandatory = $true)]
	[string]$Version,
	[Parameter(Mandatory = $true)]
	[string]$PayloadDir,
	[Parameter(Mandatory = $true)]
	[string]$OutFile
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path (Join-Path $PayloadDir "opencut-classic.exe"))) {
	throw "Missing opencut-classic.exe in $PayloadDir"
}

dotnet tool install --global wix --version 5.0.2
if ($LASTEXITCODE -ne 0) {
	throw "Failed to install WiX"
}

$wix = Join-Path $env:USERPROFILE ".dotnet\tools\wix.exe"
$payload = (Resolve-Path $PayloadDir).Path
$installer = Join-Path $PSScriptRoot "..\installer\Package.wxs"

& $wix extension add WixToolset.UI.wixext/5.0.2
if ($LASTEXITCODE -ne 0) {
	throw "Failed to add the WiX UI extension"
}

& $wix build $installer -ext WixToolset.UI.wixext/5.0.2 -d "Version=$Version" -d "PayloadDir=$payload" -o $OutFile
if ($LASTEXITCODE -ne 0) {
	throw "Failed to build the MSI"
}

Write-Host "Built $OutFile"
