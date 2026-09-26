$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$model = Join-Path $root ".runtime\models\gemma-4-12b-it-qat-q4_0.gguf"
$expectedSize = 6975877728

while ($true) {
    $size = if (Test-Path -LiteralPath $model) {
        (Get-Item -LiteralPath $model).Length
    } else {
        0
    }

    if ($size -eq $expectedSize) {
        break
    }

    if ($size -gt $expectedSize) {
        throw "$model is larger than the expected $expectedSize bytes."
    }

    Start-Sleep -Seconds 30
}

& (Join-Path $PSScriptRoot "start-gemma4.ps1")
