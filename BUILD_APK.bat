@echo off
echo ============================================
echo  Legend of the Lost Orchard - APK Builder
echo ============================================
echo.

echo STEP 1: Checking if Matter.js is present...
if not exist "www\matter.min.js" (
    echo ERROR: www\matter.min.js is missing!
    echo Please download it from:
    echo https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js
    echo Save it as: www\matter.min.js
    pause
    exit
)

set MATTER_SIZE=0
for %%A in ("www\matter.min.js") do set MATTER_SIZE=%%~zA
if %MATTER_SIZE% LSS 100000 (
    echo ERROR: matter.min.js is too small - download failed!
    echo Please manually download from CDN link above
    pause
    exit
)

echo matter.min.js OK - Size: %MATTER_SIZE% bytes
echo.

echo STEP 2: Syncing web assets to Android...
call npx cap sync android
if errorlevel 1 (
    echo ERROR: cap sync failed!
    pause
    exit
)
echo.
echo STEP 3: Done! Now open Android Studio:
call npx cap open android
echo.
echo In Android Studio:
echo   Build - Generate App Bundles or APKs - Generate APKs
echo.
pause
