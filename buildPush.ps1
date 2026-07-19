param(
  [Parameter(Position = 0)]
  [string]$Message
)

$ErrorActionPreference = 'Stop'

function Assert-LastCommandSucceeded {
  param([string]$Step)

  if ($LASTEXITCODE -ne 0) {
    throw "$Step failed with exit code $LASTEXITCODE."
  }
}

# Confirm the script is being run inside a Git repository.
git rev-parse --is-inside-work-tree *> $null
Assert-LastCommandSucceeded 'Git repository check'

if ([string]::IsNullOrWhiteSpace($Message)) {
  $Message = Read-Host 'Commit message'

  if ([string]::IsNullOrWhiteSpace($Message)) {
    $Message = 'Update Juntos Fit'
  }
}

Write-Host ''
Write-Host 'Building Juntos Fit...' -ForegroundColor Cyan
npm run build
Assert-LastCommandSucceeded 'Build'

Write-Host ''
Write-Host 'Staging changes...' -ForegroundColor Cyan
git add .
Assert-LastCommandSucceeded 'Git add'

# Commit only when there are staged changes.
git diff --cached --quiet

if ($LASTEXITCODE -eq 1) {
  Write-Host ''
  Write-Host "Committing: $Message" -ForegroundColor Cyan
  git commit -m $Message
  Assert-LastCommandSucceeded 'Git commit'
}
elseif ($LASTEXITCODE -eq 0) {
  Write-Host ''
  Write-Host 'Nothing new to commit.' -ForegroundColor Yellow
}
else {
  throw "Could not inspect staged changes. Git returned exit code $LASTEXITCODE."
}

Write-Host ''
Write-Host 'Pushing to GitHub...' -ForegroundColor Cyan
git push
Assert-LastCommandSucceeded 'Git push'

Write-Host ''
Write-Host 'Done. Cloudflare should deploy automatically.' -ForegroundColor Green
