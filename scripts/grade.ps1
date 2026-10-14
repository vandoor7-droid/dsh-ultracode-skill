param(
  [string]$Workspace = "$PSScriptRoot\..\ultracode-workspace\iteration-1",
  [string]$EvalsPath = "$PSScriptRoot\..\evals\evals.json"
)
$ErrorActionPreference = 'Stop'
$evals = Get-Content $EvalsPath -Raw -Encoding UTF8 | ConvertFrom-Json

function Get-FencedBlocks([string]$text) {
  $blocks = @()
  foreach ($m in [regex]::Matches($text, '(?s)```[a-zA-Z0-9_-]*\r?\n(.*?)```')) { $blocks += $m.Groups[1].Value }
  return $blocks
}

foreach ($e in $evals.evals) {
  $dir = Get-ChildItem $Workspace -Directory -Filter "eval-$($e.id)-*" | Select-Object -First 1
  if (-not $dir) { Write-Host "MISSING eval dir for id $($e.id)"; continue }
  foreach ($cfg in @('with_skill', 'without_skill')) {
    $resp = Join-Path $dir.FullName "$cfg\outputs\response.md"
    if (-not (Test-Path $resp)) { Write-Host "MISSING $resp"; continue }
    $text = Get-Content $resp -Raw -Encoding UTF8
    $blocks = Get-FencedBlocks $text
    $expectations = @()
    foreach ($a in $e.assertions) {
      $passed = $false; $evidence = ''
      try {
        $scope = if ($a.scope -eq 'script_block') { ($blocks -join "`n") } else { $text }
        if ($a.type -eq 'regex_present') {
          $m = [regex]::Match($scope, $a.pattern)
          $passed = $m.Success
          $evidence = if ($m.Success) { 'matched: ' + (($m.Value -replace "\s+", ' ').Substring(0, [Math]::Min(80, $m.Value.Length))) } else { 'no match for /' + $a.pattern + '/' }
        } elseif ($a.type -eq 'regex_absent') {
          $m = [regex]::Match($scope, $a.pattern)
          $passed = -not $m.Success
          $evidence = if ($m.Success) { 'unexpected match in ' + $a.scope + ': ' + (($m.Value -replace "\s+", ' ').Substring(0, [Math]::Min(80, $m.Value.Length))) } else { 'absent as required' }
        } else {
          $evidence = 'unknown assertion type'
        }
      } catch { $evidence = 'regex error: ' + $_.Exception.Message }
      $expectations += [ordered]@{ text = $a.text; passed = $passed; evidence = $evidence }
    }
    $grading = [ordered]@{ expectations = $expectations; pass_rate = [Math]::Round((@($expectations | Where-Object passed).Count / $expectations.Count), 4) }
    $out = Join-Path $dir.FullName "$cfg\grading.json"
    [System.IO.File]::WriteAllText($out, ($grading | ConvertTo-Json -Depth 6), [System.Text.UTF8Encoding]::new($false))
    $p = @($expectations | Where-Object passed).Count
    Write-Host ("eval{0} {1,-13} {2}/{3}" -f $e.id, $cfg, $p, $expectations.Count)
  }
}
