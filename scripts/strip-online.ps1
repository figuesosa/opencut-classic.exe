param(
	[Parameter(Mandatory = $true)]
	[string]$ClassicRoot
)

$ErrorActionPreference = "Stop"

function Replace-Required {
	param(
		[string]$Path,
		[string]$Old,
		[string]$New
	)
	$fullPath = Join-Path $ClassicRoot $Path
	$content = [System.IO.File]::ReadAllText($fullPath)
	$content = $content.Replace("`r`n", "`n")
	if (-not $content.Contains($Old)) {
		throw "Pattern not found in ${Path}"
	}
	$updated = $content.Replace($Old, $New)
	$utf8 = New-Object System.Text.UTF8Encoding $false
	[System.IO.File]::WriteAllText($fullPath, $updated, $utf8)
}

Replace-Required `
	-Path "apps\web\src\components\editor\panels\assets\assets-panel-store.tsx" `
	-Old "	Happy01Icon,`n	HeadphonesIcon,`n	MagicWand05Icon," `
	-New "	Happy01Icon,`n	MagicWand05Icon,"

Replace-Required `
	-Path "apps\web\src\components\editor\panels\assets\assets-panel-store.tsx" `
	-Old "	`"media`",`n	`"sounds`",`n	`"text`"," `
	-New "	`"media`",`n	`"text`","

Replace-Required `
	-Path "apps\web\src\components\editor\panels\assets\assets-panel-store.tsx" `
	-Old "	sounds: {`n		icon: createHugeiconsIcon({ icon: HeadphonesIcon }),`n		label: `"Sounds`",`n	},`n" `
	-New ""

Replace-Required `
	-Path "apps\web\src\components\editor\panels\assets\index.tsx" `
	-Old "import { SoundsView } from `"@/sounds/components/assets-view`";`n" `
	-New ""

Replace-Required `
	-Path "apps\web\src\components\editor\panels\assets\index.tsx" `
	-Old "		media: <MediaView />,`n		sounds: <SoundsView />,`n		text: <TextView />," `
	-New "		media: <MediaView />,`n		text: <TextView />,"

Replace-Required `
	-Path "apps\web\src\components\editor\editor-header.tsx" `
	-Old "import { FeedbackPopover } from `"@/feedback/components/feedback-popover`";`n" `
	-New ""

Replace-Required `
	-Path "apps\web\src\components\editor\editor-header.tsx" `
	-Old "				<FeedbackPopover />`n" `
	-New ""

Write-Host "Removed the Sounds tab and feedback button."
