param(
  [ValidateSet("lite", "full")]
  [string]$Mode = "lite",
  [string]$OutputPath = "",
  [switch]$IncludeUntracked
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  if ($Mode -eq "lite") {
    $OutputPath = "docs/ai-project-context-lite.md"
  }
  else {
    $OutputPath = "docs/ai-project-context-full.md"
  }
}

$binaryExtensions = @(
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz", ".7z", ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".mp3", ".wav", ".ogg", ".webm", ".lock"
)

function Is-BinaryPath {
  param([string]$Path)

  $ext = [System.IO.Path]::GetExtension($Path).ToLowerInvariant()
  return $binaryExtensions -contains $ext
}

function Is-LiteScopeFile {
  param([string]$Path)

  $patterns = @(
    "^src/",
    "^docs/",
    "^README\.md$",
    "^package\.json$",
    "^tsconfig\.json$",
    "^next\.config\.ts$",
    "^middleware\.ts$",
    "^postcss\.config\.mjs$",
    "^eslint\.config\.mjs$",
    "^components\.json$",
    "^AGENTS\.md$",
    "^CLAUDE\.md$"
  )

  foreach ($pattern in $patterns) {
    if ($Path -match $pattern) {
      return $true
    }
  }

  return $false
}

$files = @()
$tracked = git ls-files
if ($LASTEXITCODE -ne 0) {
  throw "Falha ao listar arquivos versionados via git ls-files."
}

$files += $tracked

if ($IncludeUntracked) {
  $untracked = git ls-files --others --exclude-standard
  if ($LASTEXITCODE -eq 0) {
    $files += $untracked
  }
}

$files = $files |
  Where-Object { $_ -and $_.Trim().Length -gt 0 } |
  Where-Object { $_ -notmatch "^\.env(\.|$)" } |
  Where-Object { $_ -notmatch "^node_modules/" } |
  Where-Object { $_ -notmatch "^\.next/" } |
  Where-Object { $_ -notmatch "^docs/ai-project-context.*\.md$" } |
  Where-Object { -not (Is-BinaryPath $_) } |
  Where-Object {
    if ($Mode -eq "lite") {
      return Is-LiteScopeFile $_
    }

    return $true
  } |
  Sort-Object -Unique

$outputFullPath = Join-Path $root $OutputPath
$outputDir = Split-Path -Parent $outputFullPath
if (-not (Test-Path $outputDir)) {
  New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$sb = New-Object System.Text.StringBuilder

$timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss zzz")
$null = $sb.AppendLine("# Contexto Unificado do Projeto")
$null = $sb.AppendLine()
$null = $sb.AppendLine("Gerado em: $timestamp")
$null = $sb.AppendLine("Raiz: $root")
$null = $sb.AppendLine("Modo: $Mode")
$null = $sb.AppendLine("Arquivos incluidos: $($files.Count)")
$null = $sb.AppendLine("Observacao: arquivos .env* e binarios foram excluidos por seguranca.")
$null = $sb.AppendLine()

$null = $sb.AppendLine("## Estrutura (arquivos incluidos)")
$null = $sb.AppendLine()
foreach ($file in $files) {
  $null = $sb.AppendLine("- $file")
}
$null = $sb.AppendLine()

$null = $sb.AppendLine("## Conteudo dos arquivos")
$null = $sb.AppendLine()

foreach ($file in $files) {
  $null = $sb.AppendLine("### Arquivo: $file")
  $null = $sb.AppendLine('```')

  try {
    $content = Get-Content -LiteralPath $file -Raw -Encoding UTF8
    $null = $sb.AppendLine($content)
  }
  catch {
    $null = $sb.AppendLine("[Erro ao ler arquivo: $($_.Exception.Message)]")
  }

  $null = $sb.AppendLine('```')
  $null = $sb.AppendLine()
}

[System.IO.File]::WriteAllText($outputFullPath, $sb.ToString(), [System.Text.Encoding]::UTF8)
Write-Host "Arquivo gerado em: $outputFullPath"
