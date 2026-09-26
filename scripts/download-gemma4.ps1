$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$models = Join-Path $root ".runtime\models"
$repo = "https://huggingface.co/google/gemma-4-12B-it-qat-q4_0-gguf/resolve/main"

$artifacts = @(
    @{
        Name = "gemma-4-12b-it-qat-q4_0.gguf"
        Size = 6975877728
    },
    @{
        Name = "mmproj-gemma-4-12b-it-qat-q4_0.gguf"
        Size = 175115264
    }
)

New-Item -ItemType Directory -Force -Path $models | Out-Null

foreach ($artifact in $artifacts) {
    $target = Join-Path $models $artifact.Name
    $url = "$repo/$($artifact.Name)?download=true"

    while ($true) {
        $currentSize = if (Test-Path -LiteralPath $target) {
            (Get-Item -LiteralPath $target).Length
        } else {
            0
        }

        if ($currentSize -eq $artifact.Size) {
            Write-Output "$($artifact.Name) is complete ($currentSize bytes)."
            break
        }

        if ($currentSize -gt $artifact.Size) {
            throw "$target is larger than the expected $($artifact.Size) bytes. Refusing to overwrite it."
        }

        $percent = [math]::Round(($currentSize / $artifact.Size) * 100, 2)
        Write-Output "Downloading $($artifact.Name): $currentSize / $($artifact.Size) bytes ($percent%)."

        & curl.exe `
            --location `
            --fail `
            --connect-timeout 30 `
            --speed-time 120 `
            --speed-limit 1024 `
            --continue-at - `
            --output $target `
            $url

        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Download interrupted with curl exit code $LASTEXITCODE. Retrying in 10 seconds."
            Start-Sleep -Seconds 10
        }
    }
}

Write-Output "Gemma 4 QAT model artifacts are ready."
