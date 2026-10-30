# scripts/dev-lan.ps1
# Along AI: Start backend and frontend on LAN

$lanIp = $null

# 1. Find LAN IPv4 address by taking the interface used by the default route (lowest metric)
try {
    $routes = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction Stop | Sort-Object RouteMetric, Metric
    foreach ($route in $routes) {
        $ifIndex = $route.InterfaceIndex
        $adapter = Get-NetAdapter -InterfaceIndex $ifIndex -ErrorAction SilentlyContinue
        if ($adapter) {
            $desc = $adapter.InterfaceDescription
            if ($desc -match '(?i)WSL|Docker|Hyper-V|Virtual|VPN|TunnelBear|vEthernet') {
                continue
            }
        }
        $ipObj = Get-NetIPAddress -InterfaceIndex $ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object {
                $_.IPAddress -notlike '169.254.*' -and
                $_.IPAddress -notlike '127.*'
            }
        if ($ipObj) {
            $lanIp = $ipObj[0].IPAddress
            break
        }
    }
} catch {
    # If Get-NetRoute is unavailable, fall back to parsing route print
}

# Fallback: parse route print 0.0.0.0
if (-not $lanIp) {
    $routeLines = route print 0.0.0.0
    foreach ($line in $routeLines) {
        if ($line -match '^\s*0\.0\.0\.0\s+0\.0\.0\.0\s+(\S+)\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+)') {
            $candidate = $matches[2]
            if ($candidate -notlike '169.254.*' -and $candidate -notlike '127.*') {
                $lanIp = $candidate
                break
            }
        }
    }
}

if (-not $lanIp) {
    Write-Error "Could not determine LAN IPv4 address."
    exit 1
}

Write-Host "Detected LAN IP: $lanIp"

function Test-Endpoint ($url) {
    try {
        $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        return $true
    } catch {
        if ($_.Exception.Response) { return $true }
        return $false
    }
}

# Set working directory to project root
$rootDir = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $rootDir

# Check if backend (port 8000) already answers
$backendRunning = Test-Endpoint "http://127.0.0.1:8000/healthz"
if ($backendRunning) {
    Write-Host "Backend already answering on port 8000; skipping start."
} else {
    Write-Host "Starting backend on 0.0.0.0:8000..."
    $backendCmd = "`$env:NEXT_PUBLIC_API_URL='http://$($lanIp):8000'; `$env:PUBLIC_BASE_URL='http://$($lanIp):3001'; `$env:API_BASE_URL='http://$($lanIp):8000'; `$env:LAN_ORIGIN='$lanIp'; Set-Location '$rootDir'; C:\Users\USER\.anaconda\Anaconda\python.exe -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000"
    Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", $backendCmd
}

# Check if frontend (port 3001) already answers
$frontendRunning = Test-Endpoint "http://127.0.0.1:3001"
if ($frontendRunning) {
    Write-Host "Frontend already answering on port 3001; skipping start."
} else {
    Write-Host "Starting frontend on 0.0.0.0:3001..."
    $frontendCmd = "`$env:NEXT_PUBLIC_API_URL='http://$($lanIp):8000'; `$env:PUBLIC_BASE_URL='http://$($lanIp):3001'; `$env:API_BASE_URL='http://$($lanIp):8000'; `$env:LAN_ORIGIN='$lanIp'; Set-Location '$rootDir'; npm --prefix frontend run dev -- -H 0.0.0.0 -p 3001"
    Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", $frontendCmd
}

# Wait until both answer
Write-Host "Waiting for servers to be ready..."
$maxAttempts = 45
$attempt = 0
while ($attempt -lt $maxAttempts) {
    $bReady = Test-Endpoint "http://127.0.0.1:8000/healthz"
    $fReady = Test-Endpoint "http://127.0.0.1:3001"
    if ($bReady -and $fReady) {
        break
    }
    Start-Sleep -Seconds 1
    $attempt++
}

Write-Host "Phone link: http://$($lanIp):3001"
Write-Host "PC link: http://localhost:3001"
Write-Host "Status: http://$($lanIp):8000/api/v1/status"
