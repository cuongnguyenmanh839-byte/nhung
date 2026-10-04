param([string]$SdkPath = "$env:LOCALAPPDATA/Android/Sdk")
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
    $bundledJdk = Get-ChildItem -LiteralPath "$projectRoot/.tooling/jdk21" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($bundledJdk) {
        # The Windows Java launcher cannot load java.dll from some accented paths.
        $jdkTemp = Join-Path $env:TEMP 'atk-light-jdk21'
        if (-not (Test-Path -LiteralPath "$jdkTemp/bin/java.exe")) {
            Copy-Item -LiteralPath $bundledJdk.FullName -Destination $jdkTemp -Recurse
        }
        $env:JAVA_HOME = $jdkTemp
    }
    if (-not $env:JAVA_HOME) { throw 'Set JAVA_HOME to a JDK 21 installation.' }
    $sdkLocation = [System.IO.Path]::GetFullPath($SdkPath).Replace('\','/')
    [System.IO.File]::WriteAllText("$projectRoot/android/local.properties", "sdk.dir=$sdkLocation`n")
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Web build failed.' }
    & npm.cmd exec cap sync android
    if ($LASTEXITCODE -ne 0) { throw 'Capacitor sync failed.' }
    $buildRoot = $projectRoot
    if ($projectRoot -match '[^\x00-\x7F]') {
        $buildRoot = Join-Path $env:TEMP 'atk-light-build-610a06d8'
        New-Item -ItemType Directory -Force "$buildRoot/android", "$buildRoot/node_modules/@capacitor" | Out-Null
        Get-ChildItem -LiteralPath "$projectRoot/android" -Force | Copy-Item -Destination "$buildRoot/android" -Recurse -Force
        Copy-Item -LiteralPath "$projectRoot/node_modules/@capacitor/android" -Destination "$buildRoot/node_modules/@capacitor" -Recurse -Force
    }
    Push-Location "$buildRoot/android"
    try {
        & ./gradlew.bat --no-daemon --gradle-user-home "$buildRoot/.gradle-home" assembleDebug
        if ($LASTEXITCODE -ne 0) { throw 'Android build failed.' }
    } finally { Pop-Location }
    New-Item -ItemType Directory -Force "$projectRoot/releases" | Out-Null
    Copy-Item -LiteralPath "$buildRoot/android/app/build/outputs/apk/debug/app-debug.apk" -Destination "$projectRoot/releases/ATK-LIGHT-debug.apk" -Force
    Write-Host 'APK: releases/ATK-LIGHT-debug.apk'
} finally { Pop-Location }
