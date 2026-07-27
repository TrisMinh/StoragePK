Add-Type -AssemblyName System.Drawing

$directory = Join-Path (Get-Location) "apps/desktop/src-tauri/icons"
New-Item -ItemType Directory -Force -Path $directory | Out-Null
$bitmap = [System.Drawing.Bitmap]::new(256, 256)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::FromArgb(47, 111, 237))
$brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
$graphics.FillRectangle($brush, 68, 128, 30, 58)
$graphics.FillRectangle($brush, 113, 92, 30, 94)
$graphics.FillRectangle($brush, 158, 54, 30, 132)
$graphics.Dispose()
$brush.Dispose()
$icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
$stream = [System.IO.FileStream]::new((Join-Path $directory "icon.ico"), [System.IO.FileMode]::Create)
$icon.Save($stream)
$stream.Dispose()
$icon.Dispose()
$bitmap.Dispose()
