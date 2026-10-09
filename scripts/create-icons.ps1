Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "..\assets\images\sce-logo.png"
if (-not (Test-Path $srcPath)) {
    Write-Error "Source image not found at $srcPath"
    exit 1
}

$srcBytes = [System.IO.File]::ReadAllBytes($srcPath)
$ms = New-Object System.IO.MemoryStream(,$srcBytes)
$srcImg = [System.Drawing.Image]::FromStream($ms)

Write-Host "Original Image: $($srcImg.Width) x $($srcImg.Height)"

# 1. Generate 1024x1024 square icon.png on white background with safe padding
$iconSize = 1024
$iconBmp = New-Object System.Drawing.Bitmap($iconSize, $iconSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($iconBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Fill background with pure white (matches the SCE logo)
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$g.FillRectangle($whiteBrush, 0, 0, $iconSize, $iconSize)

# Target draw area: safe margin (80% of icon size = 820px, so it's not cropped by round masks)
$maxTargetW = 820
$maxTargetH = 820

$scale = [Math]::Min($maxTargetW / $srcImg.Width, $maxTargetH / $srcImg.Height)
$destW = [int]($srcImg.Width * $scale)
$destH = [int]($srcImg.Height * $scale)
$destX = [int](($iconSize - $destW) / 2)
$destY = [int](($iconSize - $destH) / 2)

$g.DrawImage($srcImg, $destX, $destY, $destW, $destH)
$g.Dispose()

# Save icon.png
$outIcon = Join-Path $PSScriptRoot "..\assets\images\icon.png"
$iconBmp.Save($outIcon, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Generated: $outIcon ($iconSize x $iconSize PNG)"

# Save android-icon-foreground.png
$outFg = Join-Path $PSScriptRoot "..\assets\images\android-icon-foreground.png"
$iconBmp.Save($outFg, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Generated: $outFg ($iconSize x $iconSize PNG)"

# 2. Generate splash-icon.png (high-res clean PNG)
$splashW = 600
$splashH = 600
$splashBmp = New-Object System.Drawing.Bitmap($splashW, $splashH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gSplash = [System.Drawing.Graphics]::FromImage($splashBmp)
$gSplash.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gSplash.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gSplash.FillRectangle($whiteBrush, 0, 0, $splashW, $splashH)

$splashScale = [Math]::Min(500 / $srcImg.Width, 500 / $srcImg.Height)
$sDestW = [int]($srcImg.Width * $splashScale)
$sDestH = [int]($srcImg.Height * $splashScale)
$sDestX = [int](($splashW - $sDestW) / 2)
$sDestY = [int](($splashH - $sDestH) / 2)

$gSplash.DrawImage($srcImg, $sDestX, $sDestY, $sDestW, $sDestH)
$gSplash.Dispose()

$outSplash = Join-Path $PSScriptRoot "..\assets\images\splash-icon.png"
$splashBmp.Save($outSplash, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Generated: $outSplash ($splashW x $splashH PNG)"

# Clean up
$iconBmp.Dispose()
$splashBmp.Dispose()
$whiteBrush.Dispose()
$srcImg.Dispose()
$ms.Dispose()

Write-Host "All icons converted to true PNG successfully!"
