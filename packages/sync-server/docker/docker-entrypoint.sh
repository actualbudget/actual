#!/bin/sh
set -e

#####################################################
# Starts the sync server as an unprivileged user:
# `actual` (uid/gid 1001), or PUID/PGID if they're set.
# Older images ran as root, so data directories from
# those images are handed over to that user first.
#####################################################

# Already running as a non-root user (e.g. `docker run --user`), nothing to do.
if [ "$(id -u)" != "0" ]; then
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

data_dirs="${ACTUAL_DATA_DIR:-/data} ${ACTUAL_SERVER_FILES:-} ${ACTUAL_USER_FILES:-}"

for dir in $data_dirs; do
  if [ -d "$dir" ]; then
    # Only touch files the run user doesn't already own, so restarts are cheap.
    # -h changes symlinks themselves, never what they point to outside the data dir.
    find "$dir" \( \! -user "$run_uid" -o \! -group "$run_gid" \) \
      -exec chown -h "$run_uid:$run_gid" {} + 2>/dev/null ||
      echo "Warning: could not change the owner of every file in $dir" >&2
  fi
done

# Write a real file rather than using `test -w`: busybox's `test -w` only checks
# permission bits, so it misses read-only and root-squashed network mounts.
can_write() {
  run_as sh -c 'probe="$1/.actual-write-test" && touch "$probe" && rm -f "$probe"' sh "$1" 2>/dev/null
}

can_read() {
  run_as sh -c 'cat "$1" > /dev/null' sh "$1" 2>/dev/null
}

for dir in $data_dirs; do
  if [ -d "$dir" ] && ! can_write "$dir"; then
    warn_staying_root "uid $run_uid can't write to $dir" \
      "Give uid $run_uid write access to $dir"
    exec "$@"
  fi
done

# Files the server reads from outside the data dirs, such as mounted TLS
# certificates or secrets, may only be readable by root.
read_files="${ACTUAL_CONFIG_PATH:-}"
for value in "${ACTUAL_HTTPS_KEY:-}" "${ACTUAL_HTTPS_CERT:-}"; do
  case "$value" in
    '' | -----BEGIN*) ;;
    *) read_files="$read_files $value" ;;
  esac
done
for name in $(env | sed -n 's/^\(ACTUAL_[A-Z0-9_]*_FILE\)=.*/\1/p'); do
  read_files="$read_files $(printenv "$name")"
done

for file in $read_files; do
  if [ -f "$file" ] && ! can_read "$file"; then
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
