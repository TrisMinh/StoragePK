const clientId = process.env.STORAGEPK_GOOGLE_CLIENT_ID?.trim();
const clientSecret = process.env.STORAGEPK_GOOGLE_CLIENT_SECRET?.trim();

if (
  !clientId ||
  !clientId.endsWith(".apps.googleusercontent.com") ||
  /\s/.test(clientId) ||
  !clientSecret
) {
  console.error(
    "Missing or invalid STORAGEPK_GOOGLE_CLIENT_ID/STORAGEPK_GOOGLE_CLIENT_SECRET. Production desktop installers must package one Google Desktop OAuth client.",
  );
  process.exit(1);
}

console.log("Google Desktop OAuth client ID is configured for this production build.");
