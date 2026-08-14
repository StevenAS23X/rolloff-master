# Auto-update on the Pi

Checks the repo every 5 minutes and redeploys automatically if there's a new
commit — no manual `git pull` needed.

## Setup (one-time, on the Pi)

1. If your clone isn't at `/home/pi/rolloff-master` or your Pi user isn't
   `pi`, edit `REPO_DIR` in `auto-update.sh` and `User=` / the `ExecStart`
   path in `rolloff-autoupdate.service` to match.

2. Install the systemd units:
   ```bash
   sudo cp deploy/rolloff-autoupdate.service deploy/rolloff-autoupdate.timer /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now rolloff-autoupdate.timer
   ```

3. Confirm it's scheduled:
   ```bash
   systemctl list-timers rolloff-autoupdate.timer
   ```

## Useful commands

- Run a check right now instead of waiting for the timer:
  `sudo systemctl start rolloff-autoupdate.service`
- Watch what it did on the last run:
  `journalctl -u rolloff-autoupdate.service -n 50`
- Change the check interval: edit `OnUnitActiveSec` in
  `rolloff-autoupdate.timer`, then `sudo systemctl daemon-reload`.
- Stop auto-updating: `sudo systemctl disable --now rolloff-autoupdate.timer`.

## How it works

`auto-update.sh` runs `git fetch`, compares the local commit to
`origin/<branch>`, and only runs `git pull` + `docker compose up -d --build`
when they differ — so most checks are a no-op and idle CPU usage is
negligible.
