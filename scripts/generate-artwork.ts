import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const outputPath = path.join(process.cwd(), "public", "images", "podcast-cover.jpg");

function escapeForPowerShell(value: string): string {
  return value.replace(/'/g, "''");
}

function generateWithPowerShell(): string {
  const escapedOutputPath = escapeForPowerShell(outputPath);
  const script = `
Add-Type -AssemblyName System.Drawing
$OutputPath = '${escapedOutputPath}'
$OutputDir = Split-Path -LiteralPath $OutputPath
if (-not (Test-Path -LiteralPath $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$bitmap = New-Object System.Drawing.Bitmap 3000, 3000
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#0F1730'))

$backgroundBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Rectangle 0, 0, 3000, 3000),
  [System.Drawing.ColorTranslator]::FromHtml('#102447'),
  [System.Drawing.ColorTranslator]::FromHtml('#2058E8'),
  90
)
$graphics.FillRectangle($backgroundBrush, 0, 0, 3000, 3000)

$goldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#F4B347'))
$creamBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#FFF7E6'))
$softBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#D9E7FF'))
$shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(70, 6, 10, 22))

$graphics.FillEllipse($goldBrush, 250, 180, 520, 520)
$graphics.FillEllipse($softBrush, 2180, 320, 420, 420)
$graphics.FillRectangle($shadowBrush, 270, 1990, 2460, 520)
$graphics.FillRectangle($goldBrush, 260, 1970, 2460, 520)

$centerFormat = New-Object System.Drawing.StringFormat
$centerFormat.Alignment = [System.Drawing.StringAlignment]::Center
$centerFormat.LineAlignment = [System.Drawing.StringAlignment]::Center

$titleFont = New-Object System.Drawing.Font('Segoe UI Black', 240, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$subtitleFont = New-Object System.Drawing.Font('Segoe UI Semibold', 92, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$captionFont = New-Object System.Drawing.Font('Segoe UI Semibold', 78, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$badgeFont = New-Object System.Drawing.Font('Segoe UI Black', 70, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)

$graphics.DrawString("CONFIDENTLY", $titleFont, $creamBrush, (New-Object System.Drawing.RectangleF 0, 720, 3000, 260), $centerFormat)
$graphics.DrawString("WRONG", $titleFont, $creamBrush, (New-Object System.Drawing.RectangleF 0, 980, 3000, 280), $centerFormat)
$graphics.DrawString("The World's Worst Podcast", $subtitleFont, $softBrush, (New-Object System.Drawing.RectangleF 0, 1360, 3000, 120), $centerFormat)
$graphics.DrawString("Chad vs. Marina", $captionFont, $creamBrush, (New-Object System.Drawing.RectangleF 0, 2120, 3000, 120), $centerFormat)
$graphics.DrawString("TOTALLY CERTAIN. MOSTLY INCORRECT.", $badgeFont, $shadowBrush, (New-Object System.Drawing.RectangleF 0, 2310, 3000, 90), $centerFormat)

$bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)

$image = [System.Drawing.Image]::FromFile($OutputPath)
Write-Output "$($image.Width)x$($image.Height)"
$image.Dispose()
$titleFont.Dispose()
$subtitleFont.Dispose()
$captionFont.Dispose()
$badgeFont.Dispose()
$goldBrush.Dispose()
$creamBrush.Dispose()
$softBrush.Dispose()
$shadowBrush.Dispose()
$backgroundBrush.Dispose()
$graphics.Dispose()
$bitmap.Dispose()
`;

  return execFileSync(
    "powershell",
    ["-NoProfile", "-Command", script],
    { encoding: "utf8", stdio: "pipe" },
  ).trim();
}

function main() {
  mkdirSync(path.dirname(outputPath), { recursive: true });

  if (process.platform !== "win32") {
    throw new Error("generate-artwork.ts currently expects Windows PowerShell in this workspace.");
  }

  const dimensions = generateWithPowerShell();
  console.log(`Artwork generated: ${outputPath}`);
  console.log(`Dimensions: ${dimensions}`);
}

main();
