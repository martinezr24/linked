# linked
App for long distance couples

## PostgreSQL (local dev)

Install and start with Homebrew:

```bash
brew install postgresql@18
./scripts/start-postgresql.sh
```

Create the app database and schema (lists, goals, events, pairing):

```bash
./scripts/setup-database.sh
```

Connect:

```bash
/opt/homebrew/opt/postgresql@18/bin/psql linked_db
```

If `brew services list` shows `other` or `psql` cannot connect, run `./scripts/start-postgresql.sh` again (uses `launchctl kickstart`, which is required on some Macs after `brew services start`).
