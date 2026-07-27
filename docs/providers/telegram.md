# Telegram Setup

Telegram is an optional secondary backup destination.

## Connect

1. Create a bot with `@BotFather` and copy its bot token.
2. Start the bot in a private chat, or add it to a private group/channel with permission to send documents.
3. Obtain the destination Chat ID.
4. Enter the Bot Token and Chat ID in StoragePK.
5. Select **Kiểm tra lại** and confirm the connection.

The bot token is stored in Windows Credential Manager and must never be posted in issues, screenshots, or logs.

## Current Limit

StoragePK `0.3.0` uses Telegram's public Bot API and preserves each local file as one document. It accepts files below `49,000,000` bytes. Larger files remain local and should be routed to Google Drive.

StoragePK does not silently split files.

## Access and Deletion

- Any Telegram account that can access the destination may be able to download uploaded files.
- StoragePK permissions do not override Telegram chat, group, or channel membership.
- Disconnecting Telegram does not delete existing messages.
- Deleting a local StoragePK item does not automatically delete its Telegram copy.

Use a private destination and regularly review its members and bot permissions.
