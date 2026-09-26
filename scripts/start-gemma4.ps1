$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$runtime = Join-Path $root ".runtime\llama.cpp"
$models = Join-Path $root ".runtime\models"
$server = Join-Path $runtime "llama-server.exe"
$model = Join-Path $models "gemma-4-12b-it-qat-q4_0.gguf"
$mmproj = Join-Path $models "mmproj-gemma-4-12b-it-qat-q4_0.gguf"

foreach ($path in @($server, $model, $mmproj)) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Required Gemma runtime artifact is missing: $path"
    }
}

& $server `
    --model $model `
    --mmproj $mmproj `
    --host 127.0.0.1 `
    --port 8081 `
    --ctx-size 8192 `
    --jinja `
    --reasoning off `
    --temp 0 `
    --parallel 1
