# StoragePK 0.3.0 for Windows

Download `StoragePK_0.3.0_x64-setup.exe` from the GitHub `v0.3.0` pre-release for a normal Windows installation.

The `StoragePK_0.3.0_x64_en-US.msi` package is for managed or administrative deployment. These artifacts are currently unsigned, so Windows SmartScreen can show a warning.

Version `0.3.0` packages the publisher-owned Google Desktop OAuth client. End users only select **Đăng nhập với Google Drive**, approve `drive.file` in the browser, and return automatically through the PKCE-protected loopback callback.

Binary installers are intentionally not committed to Git. Local builds are produced under `apps/desktop/src-tauri/target/release/bundle` and published as immutable GitHub Release assets.

Every release also contains `SHA256SUMS.txt` for exact artifact verification and `storagepk-node-sbom.cdx.json` for dependency inventory. Do not rely on hashes from an older local build.

The final local `0.3.0` release check produced an approximately 3.0 MB NSIS installer, a 4.4 MB MSI, and a 12.8 MB unpacked application executable. GitHub-built asset sizes can differ slightly; verify downloads with the release checksum manifest.
