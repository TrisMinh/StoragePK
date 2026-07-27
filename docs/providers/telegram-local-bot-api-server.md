# Telegram Local Bot API

StoragePK `0.3.0` does not install, start, or supervise a Telegram Local Bot API server.

Telegram's official self-hosted Bot API server is an advanced external option that can support larger files than the public Bot API. It requires:

- Telegram `api_id` and `api_hash`;
- a separately installed and maintained `telegram-bot-api` process;
- a bot token and destination Chat ID;
- localhost or private-network binding;
- lifecycle, firewall, disk, update, and recovery management.

Running that server does not move Telegram storage onto the user's computer. Files sent through it are still stored as Telegram messages and remain accessible according to destination membership.

Until StoragePK implements and validates process supervision, files at or above `49,000,000` bytes should use Google Drive instead of Telegram.

References:

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Official local Bot API server](https://github.com/tdlib/telegram-bot-api)
