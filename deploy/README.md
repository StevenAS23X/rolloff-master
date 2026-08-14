# Deploying on the Pi

## Managing the stack with Dockge

The compose file is `compose.yaml` at the repo root — Dockge's default name,
so it'll be picked up automatically once the folder lives where Dockge looks
for stacks.

**Clear out the container/image from the old manual setup** (skip if you
never ran `docker compose up` outside Dockge):
```bash
cd /home/pi/rolloff-master   # wherever you'd cloned it before
docker compose down
docker image rm rolloff-master-rolloff   # name may vary — check `docker images`
```

**Move the repo under Dockge's stacks directory** (default `/opt/stacks`;
check yours under Dockge → Settings if you changed it):
```bash
sudo mv /home/pi/rolloff-master /opt/stacks/rolloff-tracker
```
(Or clone fresh straight into `/opt/stacks/rolloff-tracker` instead of
moving.) Open Dockge — it should list `rolloff-tracker` as a new stack
(hit the refresh/scan icon if it doesn't show up immediately). Click into
it and press **Deploy** to build and start it. From then on, start/stop,
logs, and rebuilds all happen from the Dockge UI instead of the CLI.

**Note:** Dockge manages the container lifecycle, but it doesn't pull from
git — that's what the auto-update timer below still does. The two work
together fine: the timer keeps the checked-out code in sync with GitHub and
runs `docker compose up -d --build` when it changes (which Dockge will just
see as the stack updating); Dockge is your day-to-day UI for start/stop/logs
on top of that. If you moved the repo, update `REPO_DIR` in
`auto-update.sh` (and the service file) to the new `/opt/stacks/...` path
first.

## Auto-update timer

Checks the repo every 5 minutes and redeploys automatically if there's a new
commit — no manual `git pull` needed.

## Setup (one-time, on the Pi)

1. Defaults assume the stack lives at `/opt/stacks/rolloff-tracker` and the
   Pi user is `pi`. If either's different, edit `REPO_DIR` in
   `auto-update.sh` and `User=` / the `ExecStart` path in
   `rolloff-autoupdate.service` to match. Whichever user you set needs to
   be able to run `docker` (in the `docker` group) and have write access
   to the repo for `git pull`.

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
