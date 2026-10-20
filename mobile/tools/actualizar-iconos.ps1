param([Parameter(Mandatory = $true)][string]$SourceImage)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$mobileRoot = Split-Path $PSScriptRoot -Parent
$source = [System.Drawing.Image]::FromFile((Resolve-Path -LiteralPath $SourceImage).Path)
function Export-Icon([string]$relativePath, [int]$size, [double]$scale = 1) {
    $output = Join-Path $mobileRoot $relativePath
    [IO.Directory]::CreateDirectory((Split-Path $output -Parent)) | Out-Null
    $bitmap = [System.Drawing.Bitmap]::new($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#0A2540'))
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $edge = [int]($size * $scale)
        $offset = [int](($size - $edge) / 2)
        $graphics.DrawImage($source, $offset, $offset, $edge, $edge)
        $bitmap.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $graphics.Dispose(); $bitmap.Dispose() }
}
try {
    Export-Icon 'assets/images/app_icon.png' 1024
    $densities = @{mdpi=48; hdpi=72; xhdpi=96; xxhdpi=144; xxxhdpi=192}
    foreach ($entry in $densities.GetEnumerator()) {
        Export-Icon "android/app/src/main/res/mipmap-$($entry.Key)/ic_launcher.png" $entry.Value
        Export-Icon "android/app/src/main/res/mipmap-$($entry.Key)/ic_launcher_foreground.png" ([int]($entry.Value * 2.25)) 0.60
    }
    $catalog = Get-Content (Join-Path $mobileRoot 'ios/Runner/Assets.xcassets/AppIcon.appiconset/Contents.json') -Raw | ConvertFrom-Json
    foreach ($item in $catalog.images) {
        if ($item.filename) {
            $size = [double]::Parse(($item.size -split 'x')[0], [Globalization.CultureInfo]::InvariantCulture)
            $factor = [int]($item.scale -replace 'x', '')
            Export-Icon "ios/Runner/Assets.xcassets/AppIcon.appiconset/$($item.filename)" ([int]($size * $factor))
        }
    }
    foreach ($size in @(192, 512)) {
        Export-Icon "web/icons/Icon-$size.png" $size
        Export-Icon "web/icons/Icon-maskable-$size.png" $size 0.70
    }
    Export-Icon 'web/favicon.png' 32
} finally { $source.Dispose() }
