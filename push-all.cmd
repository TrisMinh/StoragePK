@echo off
setlocal EnableExtensions DisableDelayedExpansion

cd /d "%~dp0"
title StoragePK - Validate, Build and Publish

where git >nul 2>nul || (
  echo [ERROR] Git is not installed or unavailable in PATH.
  exit /b 1
)
where node >nul 2>nul || (
  echo [ERROR] Node.js is not installed or unavailable in PATH.
  exit /b 1
)
where npm >nul 2>nul || (
  echo [ERROR] npm is not installed or unavailable in PATH.
  exit /b 1
)
where gh >nul 2>nul || (
  echo [ERROR] GitHub CLI is required to trigger the release workflow.
  exit /b 1
)

if not exist ".git" (
  echo [1/7] Initializing Git repository...
  git init || exit /b 1
)

for /f "delims=" %%b in ('git branch --show-current 2^>nul') do set "BRANCH=%%b"
if not defined BRANCH (
  set "BRANCH=main"
  git checkout -b main || exit /b 1
)

git remote get-url origin >nul 2>nul
if errorlevel 1 (
  set /p "REMOTE_URL=Enter Git remote URL: "
  if not defined REMOTE_URL (
    echo [ERROR] A remote URL is required.
    exit /b 1
  )
  git remote add origin "%REMOTE_URL%" || exit /b 1
)

for /f "delims=" %%v in ('node -p "require('./package.json').version"') do set "VERSION=%%v"
if not defined VERSION (
  echo [ERROR] Could not read package version.
  exit /b 1
)
set "TAG=v%VERSION%"

echo [2/7] Installing locked dependencies...
call npm ci || exit /b 1

echo [3/7] Running production release gates...
call npm run release || exit /b 1

echo [4/7] Building and verifying Windows installers...
call npm run release:desktop || exit /b 1

echo [5/7] Committing source changes...
git add -A || exit /b 1
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "chore: release %TAG%" || exit /b 1
) else (
  echo No source changes to commit.
)

echo [6/7] Pushing %BRANCH%...
git push -u origin "%BRANCH%" || exit /b 1

git rev-parse -q --verify "refs/tags/%TAG%" >nul 2>nul
if errorlevel 1 (
  git tag -a "%TAG%" -m "StoragePK %VERSION%" || exit /b 1
) else (
  for /f "delims=" %%h in ('git rev-parse HEAD') do set "HEAD_COMMIT=%%h"
  for /f "delims=" %%h in ('git rev-list -n 1 "%TAG%"') do set "TAG_COMMIT=%%h"
  if not "%HEAD_COMMIT%"=="%TAG_COMMIT%" (
    echo [ERROR] %TAG% already points to another commit. Bump package version before publishing.
    exit /b 1
  )
)

echo [7/7] Pushing %TAG% to trigger GitHub Release...
git push origin "%TAG%" || exit /b 1
gh workflow run release.yml --ref "%BRANCH%" -f "release_tag=%TAG%" -f "allow_unsigned_prerelease=true" || exit /b 1

echo.
echo StoragePK %VERSION% was validated, built, pushed, and tagged.
echo GitHub Actions is publishing the explicitly approved unsigned pre-release.
pause
