param(
  [string]$Owner = "arwinazizi",
  [string]$Repo = "ai-energy-intelligence",
  [switch]$Private = $true
)

$ErrorActionPreference = "Stop"

gh auth status | Out-Null

$visibility = if ($Private) { "--private" } else { "--public" }
$description = "Proxy-based measurement layer for AI usage"
$target = "$Owner/$Repo"

Write-Host "Creating GitHub repository $target ..."
gh repo create $target $visibility --source=. --remote=origin --push --description $description --disable-wiki

Write-Host "Done. Verify with:"
Write-Host "  git remote -v"
Write-Host "  gh repo view $target"
