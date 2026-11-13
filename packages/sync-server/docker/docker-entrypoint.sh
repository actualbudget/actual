#!/bin/sh
set -e

#####################################################
# Starts the sync server as an unprivileged user:
# `actual` (uid/gid 1001), or PUID/PGID if they're set.
# Older images ran as root, so data directories from
# those images are handed over to that user first.
#####################################################

# Node works out what the server will use, the same way load-config.js does, as
# the server only reads config.json after this script has dropped privileges.
# It prints one "kind value" line each:
#   dir     a data folder, as a real path
#   file    a file the server only reads (a missing one is left for the server)
#   unsafe  a data folder or file setting that can't be used, and why
#   port    the port
# A config the server can't parse is left for the server to report.
# shellcheck disable=SC2016 # JavaScript, not shell expansions
settings=$(node -e '
  const fs = require("fs");
  const path = require("path");
  const { env } = process;
  const lines = new Set();

  let configPath = env.ACTUAL_CONFIG_PATH;
  if (!configPath) {
    configPath = "/app/config.json";
    if (!fs.existsSync(configPath)) {
      const dataDir = env.ACTUAL_DATA_DIR || (fs.existsSync("/data") ? "/data" : "/app");
      configPath = path.join(dataDir, "config.json");
    }
  }
  let config = {};
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8")) ?? {};
  } catch {}

  // The environment beats config.json, even when it is set to an empty value.
  const setting = (name, value) => (name in env ? env[name] : value);
  const hasBadCharacter = value => /[\n\0]/.test(value);
  // Root can be locked out of a share the run user owns (e.g. root squash), so
  // only the run user can tell what is in there.
  const isRootLockedOut = error => error.code === "EACCES" && process.getuid() === 0;

  function addDir(label, value) {
    if (typeof value !== "string") return;
    const unsafe = why => lines.add(`unsafe ${label} is ${value || "empty"}, ${why}`.replace(/[\n\0]/g, " "));
    if (hasBadCharacter(value)) return unsafe("which has a line break or NUL character");
    let real = path.resolve(value);
    try {
      real = fs.realpathSync(real);
      if (!fs.statSync(real).isDirectory()) return unsafe("which is not a folder");
    } catch (error) {
      if (error.code !== "ENOENT" && !isRootLockedOut(error)) return unsafe(`which can not be used as a folder (${error.code})`);
    }
    // Handing over the app folder would let the server change its own code.
    // Only root hands anything over.
    if (process.getuid() === 0 && !path.relative(real, "/app").startsWith("..")) {
      return unsafe("which is or contains the server app folder (/app)");
    }
    lines.add(`dir ${real}`);
  }

  function addFile(label, file) {
    if (hasBadCharacter(file)) {
      lines.add(`unsafe ${label} has a line break or NUL character in its path`);
      return;
    }
    try {
      fs.statSync(file);
    } catch (error) {
      if (error.code === "ENOENT" || isRootLockedOut(error)) return;
    }
    lines.add(`file ${file}`);
  }

  if (!env.ACTUAL_DATA_DIR) addDir("the default data folder", "/data");
  for (const [name, key] of [
    ["ACTUAL_DATA_DIR", "dataDir"],
    ["ACTUAL_SERVER_FILES", "serverFiles"],
    ["ACTUAL_USER_FILES", "userFiles"],
  ]) {
    addDir(name in env ? name : `${key} in ${configPath}`, setting(name, config[key]));
  }

  addFile("ACTUAL_CONFIG_PATH", configPath);
  // The server only uses HTTPS when both are set; either may be inline PEM.
  const httpsKey = setting("ACTUAL_HTTPS_KEY", config.https?.key);
  const httpsCert = setting("ACTUAL_HTTPS_CERT", config.https?.cert);
  if (httpsKey && httpsCert) {
    for (const [label, value] of [["the HTTPS key", httpsKey], ["the HTTPS certificate", httpsCert]]) {
      if (typeof value === "string" && !value.startsWith("-----BEGIN")) addFile(label, value);
    }
  }
  for (const name of Object.keys(env)) {
    if (/^ACTUAL_\w+_FILE$/.test(name) && env[name]) addFile(name, env[name]);
  }

  lines.add(`port ${Number(env.ACTUAL_PORT || config.port || env.PORT || 5006) || 0}`);
  process.stdout.write([...lines].join("\n"));
')

list() {
  printf '%s\n' "$settings" | sed -n "s/^$1 //p"
}

# Every list below has one entry per line, so paths with spaces stay intact.
IFS='
'
set -f
data_dirs=$(list dir)
read_files=$(list file)
unsafe=$(list unsafe)
port=$(list port)
uid=$(id -u)

# Runs a command as the user the server will run as.
if [ "$uid" = 0 ]; then
  run_uid="${PUID:-$(id -u actual)}"
  run_gid="${PGID:-$(id -g actual)}"
  run_as() {
    setpriv --reuid="$run_uid" --regid="$run_gid" --clear-groups "$@"
  }
else
  run_as() {
    "$@"
  }
fi

can_read() {
  # shellcheck disable=SC2016 # expanded by the inner shell
  run_as sh -c 'cat -- "$1" > /dev/null' sh "$1" 2>/dev/null
}

# Succeeds if the data folder $1, created if need be, can be written and
# everything in it is usable, including what links in it lead to, which may have
# stayed out of reach. Writes a real file rather than using `test -w`: busybox's
# `test -w` only checks permission bits, so it misses read-only and root-squashed
# mounts. The files the server only reads, such as config.json or a certificate,
# may be read-only, and are checked on their own. A dangling link or a loop
# doesn't get in the way, as the server doesn't rely on one.
data_dir_usable() {
  run_as mkdir -p -- "$1" 2>/dev/null || return 1
  # shellcheck disable=SC2016 # expanded by the inner shell
  run_as sh -c 'probe=$(mktemp "$1/.actual-write-test.XXXXXX") && rm -f "$probe"' \
    sh "$1" 2>/dev/null || return 1
  # shellcheck disable=SC2016 # JavaScript, not shell expansions
  run_as node -e '
    const fs = require("fs");
    const path = require("path");
    const { R_OK, W_OK, X_OK } = fs.constants;
    // The same file can be at several paths, through a mount or a hard link.
    const stat = file => fs.statSync(file, { bigint: true });
    const identity = ({ dev, ino }) => `${dev}:${ino}`;
    const readOnly = new Set();
    for (const file of process.argv[2].split("\n")) {
      try {
        readOnly.add(identity(stat(file)));
      } catch {}
    }
    const seen = new Set();
    const pending = [process.argv[1]];
    while (pending.length > 0) {
      const entry = pending.pop();
      try {
        const real = fs.realpathSync.native(entry);
        if (seen.has(real)) continue;
        seen.add(real);
        const stats = stat(real);
        if (readOnly.has(identity(stats))) continue;
        if (stats.isDirectory()) {
          fs.accessSync(real, R_OK | W_OK | X_OK);
          for (const name of fs.readdirSync(real)) pending.push(path.join(real, name));
        } else {
          fs.accessSync(real, R_OK | W_OK);
        }
      } catch (error) {
        if (!["ENOENT", "ENOTDIR", "ELOOP"].includes(error.code)) process.exit(1);
      }
    }
  ' "$1" "$read_files" 2>/dev/null
}

# Docker creates a directory when a bind-mount source is missing on the host,
# and the server can't start with one in place of a file, whoever it runs as.
for file in $read_files; do
  if [ -d "$file" ]; then
    printf '%s\n' "Error: $file is a directory, not a file." >&2
    printf '%s\n' "If it's bind-mounted, check that the source file exists on the host." >&2
    exit 1
  fi
done

# Started as a non-root user (e.g. `docker run --user`), so nothing can be
# handed over. Fail early if the data is still root-owned: otherwise the server
# starts and passes its health check, but every sign-in fails with
# SQLITE_READONLY.
if [ "$uid" != 0 ]; then
  for problem in $unsafe; do
    printf '%s\n' "Error: $problem." >&2
  done
  if [ -n "$unsafe" ]; then exit 1; fi
  for dir in $data_dirs; do
    if ! data_dir_usable "$dir"; then
      printf '%s\n' "Error: uid $uid can't write to $dir or something in it." >&2
      printf '%s\n' "Data from older images is owned by root. Start the container without --user once" >&2
      printf '%s\n' "to hand it over automatically, or run: chown -R $uid:$(id -g) <your data folder>" >&2
      exit 1
    fi
  done
  for file in $read_files; do
    if ! can_read "$file"; then
      printf '%s\n' "Error: uid $uid can't read $file." >&2
      printf '%s\n' "Give uid $uid read access to $file, or start the container without --user." >&2
      exit 1
    fi
  done
  exec "$@"
fi

# Prints why the server is staying root; the caller then runs it unchanged.
warn_staying_root() {
  printf '%s\n' "Warning: $1, so the server is still running as root." >&2
  printf '%s\n' "$2, or start the container with --user $run_uid:$run_gid." >&2
}

for problem in $unsafe; do
  warn_staying_root "$problem" "Set it to a usable path, such as a folder in your data volume"
done
if [ -n "$unsafe" ]; then exec "$@"; fi

# Ports below ip_unprivileged_port_start need NET_BIND_SERVICE (e.g. 443 with
# --network host). Docker usually sets it to 0 inside the container, so the
# capability is only requested when it's needed.
unprivileged_start="$(cat /proc/sys/net/ipv4/ip_unprivileged_port_start 2>/dev/null || true)"
caps=""
if [ "$port" -gt 0 ] 2>/dev/null && [ "$port" -lt "${unprivileged_start:-1024}" ]; then
  caps="--inh-caps=+net_bind_service
--ambient-caps=+net_bind_service"
fi

# Try the exact switch first. It fails if the container was started with
# capabilities dropped (e.g. --cap-drop ALL), which also rules out changing
# file owners.
# shellcheck disable=SC2086 # $caps is intentionally split into flags
if ! run_as $caps true 2>/dev/null; then
  warn_staying_root "can't switch to uid $run_uid for port $port" \
    "Allow the SETUID, SETGID, CHOWN and, below port ${unprivileged_start:-1024}, NET_BIND_SERVICE capabilities"
  exec "$@"
fi

# The server creates its data folders, but not their parents, and the run user
# can't create anything under a root-owned parent (e.g. ACTUAL_SERVER_FILES set
# to /opt/actual/server-files). So create them now, while still root.
for dir in $data_dirs; do
  mkdir -p -- "$dir" 2>/dev/null || true
  # Only touch files the run user doesn't already own, so restarts are cheap.
  # -h changes symlinks themselves, never what they point to outside the data dir.
  # A folder or file that can't be created or handed over (e.g. a read-only
  # mounted one) only matters if the checks below find it's unusable.
  find "$dir" \( \! -user "$run_uid" -o \! -group "$run_gid" \) \
    -exec chown -h "$run_uid:$run_gid" {} + 2>/dev/null || true
done

for dir in $data_dirs; do
  if ! data_dir_usable "$dir"; then
    warn_staying_root "uid $run_uid can't write to $dir or something in it" \
      "Give uid $run_uid write access to $dir"
    exec "$@"
  fi
done

for file in $read_files; do
  if ! can_read "$file"; then
    warn_staying_root "uid $run_uid can't read $file" \
      "Give uid $run_uid read access to $file"
    exec "$@"
  fi
done

# root's HOME isn't readable by the run user.
export HOME=/tmp
# shellcheck disable=SC2086 # $caps is intentionally split into flags
exec setpriv --reuid="$run_uid" --regid="$run_gid" --clear-groups $caps "$@"
