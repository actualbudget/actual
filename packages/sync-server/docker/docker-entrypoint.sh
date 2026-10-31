#!/bin/sh
set -e

#####################################################
# Starts the sync server as an unprivileged user:
# `actual` (uid/gid 1001), or PUID/PGID if they're set.
# Older images ran as root, so data directories from
# those images are handed over to that user first.
#####################################################

# Prints the data directories the server will use, one per line (so paths with
# spaces stay intact): the ones set through the environment, plus any set in
# config.json, which the server reads after this script has dropped privileges.
configured_dirs() {
  echo "${ACTUAL_DATA_DIR:-/data}"
  echo "${ACTUAL_SERVER_FILES:-}"
  echo "${ACTUAL_USER_FILES:-}"
  config="${ACTUAL_CONFIG_PATH:-}"
  if [ -z "$config" ]; then
    for candidate in /app/config.json "${ACTUAL_DATA_DIR:-/data}/config.json"; do
      if [ -f "$candidate" ]; then
        config="$candidate"
        break
      fi
    done
  fi
  # The environment beats config.json, as in the server. A config the server
  # can't parse is left for the server to report.
  if [ -f "$config" ]; then
    node -e '
      const env = {
        dataDir: "ACTUAL_DATA_DIR",
        serverFiles: "ACTUAL_SERVER_FILES",
        userFiles: "ACTUAL_USER_FILES",
      };
      try {
        const config = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
        for (const key of Object.keys(env)) {
          if (typeof config[key] === "string" && !process.env[env[key]]) {
            console.log(config[key]);
          }
        }
      } catch {}
    ' "$config" 2>/dev/null || true
  fi
}

data_dirs="$(configured_dirs)"

# Succeeds if every file and directory under $1 is usable: readable and
# writable, and searchable for directories. Symlinks are followed, so a link to
# a directory elsewhere is checked too. The rest of the arguments are a command
# prefix to run the check as another user (none to run it as is). This catches
# data that stays out of reach after a failed ownership handover (e.g. a
# root-squashed mount, or a link to a root-only folder) and files the user owns
# but can't write, none of which the write probe on the data folder itself
# detects.
tree_accessible() {
  dir=$1
  shift
  "$@" find -L "$dir" \! -type l -exec sh -c '
    for entry; do
      [ -r "$entry" ] && [ -w "$entry" ] || exit 1
      if [ -d "$entry" ] && [ ! -x "$entry" ]; then exit 1; fi
    done
  ' sh {} + >/dev/null 2>&1
}

# Started as a non-root user (e.g. `docker run --user`), so nothing can be
# handed over. Fail early if the data is still root-owned: otherwise the server
# starts and passes its health check, but every sign-in fails with
# SQLITE_READONLY. Write a real file rather than using `test -w`: busybox's
# `test -w` only checks permission bits, so it misses read-only and
# root-squashed mounts.
if [ "$(id -u)" != "0" ]; then
  while IFS= read -r dir; do
    if [ -d "$dir" ] && ! { (touch "$dir/.actual-write-test" && rm -f "$dir/.actual-write-test") 2>/dev/null && tree_accessible "$dir"; }; then
      echo "Error: uid $(id -u) can't write to $dir or something in it." >&2
      echo "Data from older images is owned by root. Start the container without --user once" >&2
      echo "to hand it over automatically, or run: chown -R $(id -u):$(id -g) <your data folder>" >&2
      exit 1
    fi
  done <<DIRS
$data_dirs
DIRS
  exec "$@"
fi

run_uid="${PUID:-$(id -u actual)}"
run_gid="${PGID:-$(id -g actual)}"

run_as() {
  setpriv --reuid="$run_uid" --regid="$run_gid" --clear-groups "$@"
}

# Prints why the server is staying root; the caller then runs it unchanged.
warn_staying_root() {
  echo "Warning: $1, so the server is still running as root." >&2
  echo "$2, or start the container with --user $run_uid:$run_gid." >&2
}

# A failed switch usually means the container was started with capabilities
# dropped (e.g. --cap-drop ALL), which also rules out changing file owners.
if ! run_as true 2>/dev/null; then
  warn_staying_root "can't switch to uid $run_uid" \
    "Allow the SETUID, SETGID and CHOWN capabilities"
  exec "$@"
fi

while IFS= read -r dir; do
  if [ -d "$dir" ]; then
    # Only touch files the run user doesn't already own, so restarts are cheap.
    # -h changes symlinks themselves, never what they point to outside the data dir.
    find "$dir" \( \! -user "$run_uid" -o \! -group "$run_gid" \) \
      -exec chown -h "$run_uid:$run_gid" {} + 2>/dev/null ||
      echo "Warning: could not change the owner of every file in $dir" >&2
  fi
done <<DIRS
$data_dirs
DIRS

# Same real-file probe as above, run as the target user.
can_write() {
  run_as sh -c 'probe="$1/.actual-write-test" && touch "$probe" && rm -f "$probe"' sh "$1" 2>/dev/null
}

can_read() {
  run_as sh -c 'cat "$1" > /dev/null' sh "$1" 2>/dev/null
}

while IFS= read -r dir; do
  if [ -d "$dir" ] && ! { can_write "$dir" && tree_accessible "$dir" run_as; }; then
    warn_staying_root "uid $run_uid can't write to $dir or something in it" \
      "Give uid $run_uid write access to $dir"
    exec "$@"
  fi
done <<DIRS
$data_dirs
DIRS

# Files the server reads from outside the data dirs, such as mounted TLS
# certificates or secrets, may only be readable by root.
# Checked one path at a time: a joined string would split paths with spaces.
unreadable_file() {
  [ -f "$1" ] && ! can_read "$1"
}

for file in "${ACTUAL_CONFIG_PATH:-}" "${ACTUAL_HTTPS_KEY:-}" "${ACTUAL_HTTPS_CERT:-}"; do
  case "$file" in
    '' | -----BEGIN*) continue ;;
  esac
  if unreadable_file "$file"; then
    warn_staying_root "uid $run_uid can't read $file" \
      "Give uid $run_uid read access to $file"
    exec "$@"
  fi
done

for name in $(env | sed -n 's/^\(ACTUAL_[A-Z0-9_]*_FILE\)=.*/\1/p'); do
  file="$(printenv "$name")"
  if unreadable_file "$file"; then
    warn_staying_root "uid $run_uid can't read $file" \
      "Give uid $run_uid read access to $file"
    exec "$@"
  fi
done

# Ports below 1024 need NET_BIND_SERVICE when the host doesn't let
# unprivileged users bind them (e.g. --network host).
port="${ACTUAL_PORT:-${PORT:-5006}}"
caps=""
if [ "$port" -lt 1024 ] 2>/dev/null; then
  caps="--inh-caps=+net_bind_service --ambient-caps=+net_bind_service"
fi

# root's HOME isn't readable by the run user.
export HOME=/tmp
# shellcheck disable=SC2086 # $caps is intentionally split into flags
exec setpriv --reuid="$run_uid" --regid="$run_gid" --clear-groups $caps "$@"
