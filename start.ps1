param([switch]$NoBrowser)

$ErrorActionPreference = 'Stop'
$nttlPort = if ($env:PORT) { [int]$env:PORT } else { 5176 }
$env:PORT = [string]$nttlPort
$nttlUrl = "http://127.0.0.1:$nttlPort/"

function Test-NttlServer {
    try {
        $nttlPage = Invoke-WebRequest -UseBasicParsing -Uri $nttlUrl -TimeoutSec 2
        return ($nttlPage.StatusCode -eq 200 -and $nttlPage.Content.Contains('name="application-name" content="Thanh Loan 20-10"'))
    } catch {
        return $false
    }
}

try {
    if (-not (Test-NttlServer)) {
        $nttlNodeCommand = Get-Command node -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($nttlNodeCommand) {
            $nttlNodePath = $nttlNodeCommand.Source
        } else {
            $nttlNodePath = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
        }
        if (-not (Test-Path -LiteralPath $nttlNodePath -PathType Leaf)) {
            throw 'Node.js was not found. Install Node.js, then run START.bat again.'
        }
        $nttlLogFolder = Join-Path ([System.IO.Path]::GetTempPath()) 'nttl-preview-logs'
        New-Item -ItemType Directory -Path $nttlLogFolder -Force | Out-Null
        $nttlErrorLog = Join-Path $nttlLogFolder "server-$nttlPort-error.log"
        $nttlServerProcess = Start-Process -FilePath $nttlNodePath -ArgumentList 'server.cjs' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $nttlLogFolder "server-$nttlPort.log") -RedirectStandardError $nttlErrorLog -PassThru
        $nttlReady = $false
        for ($nttlAttempt = 0; $nttlAttempt -lt 20; $nttlAttempt++) {
            if (Test-NttlServer) { $nttlReady = $true; break }
            if ($nttlServerProcess.HasExited) { break }
            Start-Sleep -Milliseconds 200
        }
        if (-not $nttlReady) {
            $nttlDetails = if (Test-Path -LiteralPath $nttlErrorLog) { Get-Content -LiteralPath $nttlErrorLog -Raw } else { '' }
            throw "Could not start NTTL on port $nttlPort. $nttlDetails"
        }
    }
    Write-Host "NTTL is ready: $nttlUrl"
    if (-not $NoBrowser) { Start-Process $nttlUrl }
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
