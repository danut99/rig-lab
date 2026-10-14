$roleIds = @('fire-shaman','fire-warrior','fire-protector') + @((Get-Content -LiteralPath 'source/element-palettes.json' -Raw | ConvertFrom-Json).id)
foreach ($roleId in $roleIds) {
 $modelDir = Join-Path (Get-Location) "public/models/$roleId"
 $atlasPages = Get-Content -LiteralPath (Join-Path $modelDir 'rig.atlas') | Where-Object { $_ -match '^\S+\.png$' }
 $assetNames = @('animated.json','rig.atlas','reference.png','README.md','idle-preview.png','walk-preview.png','attack-preview.png','walk-layers.json') + $atlasPages
 $exportFiles = @($assetNames | ForEach-Object { Join-Path $modelDir $_ })
 $exportFiles += (Join-Path (Get-Location) "source/$roleId/prompt.txt")
 Compress-Archive -LiteralPath $exportFiles -DestinationPath "public/models/$roleId-spine.zip" -Force
 Write-Output $roleId
}
foreach ($role in @('shaman','warrior','protector')) {
 $zipFiles = @($roleIds | Where-Object { $_.EndsWith("-$role") } | ForEach-Object { Join-Path (Get-Location) "public/models/$_-spine.zip" })
 Compress-Archive -LiteralPath $zipFiles -DestinationPath "public/models/$role-all-habitats.zip" -CompressionLevel NoCompression -Force
}
