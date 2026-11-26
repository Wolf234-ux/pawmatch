#!/usr/bin/env bash
# Prepares the generated android/ folder: PawMatch icon + splash, version, small release build.
# Usage: V=<version> bash tool/fix_android.sh
set -euo pipefail
V="${V:-1}"
RES=android/app/src/main/res
GRADLE=android/app/build.gradle

# 1. PawMatch launcher icon (legacy PNGs; drop adaptive-icon XML that points to the Capacitor logo)
rm -rf "$RES"/mipmap-anydpi-v26 "$RES"/drawable/ic_launcher_background.xml "$RES"/drawable-v24
cp -r resources/android/* "$RES"/

# 2. One small splash image instead of 10 large Capacitor splash screens (~300 KB saved)
rm -rf "$RES"/drawable-land-* "$RES"/drawable-port-*
cp resources/splash.png "$RES"/drawable/splash.png

# 3. Version shown on the phone (1.V.0); versionCode must grow for updates to install
sed -i "s/versionCode [0-9]*/versionCode $((V + 100))/; s/versionName \"[^\"]*\"/versionName \"1.$V.0\"/" "$GRADLE"

# 4. Release build: R8 code shrinking + unused resource removal, signed with ~/.android/debug.keystore
#    (the fixed PAWMATCH_KEYSTORE when set), so it installs without Play Store.
sed -i "s/minifyEnabled false/minifyEnabled true\n            shrinkResources true\n            signingConfig signingConfigs.debug/" "$GRADLE"
sed -i "s/getDefaultProguardFile('proguard-android.txt')/getDefaultProguardFile('proguard-android-optimize.txt')/" "$GRADLE"

# 5. Keep Capacitor's bridge classes (they are found by reflection)
cat >> android/app/proguard-rules.pro <<'RULES'

# Capacitor
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * { *; }
-keep public class * extends com.getcapacitor.Plugin { *; }
-keepattributes *Annotation*,JavascriptInterface
-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }
-dontwarn org.apache.cordova.**
RULES

grep -nE "versionCode|versionName|minifyEnabled|shrinkResources|signingConfig|proguard" "$GRADLE"
