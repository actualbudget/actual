#!/bin/sh
# Run this to generate all the initial makefiles, etc.
set -e
echo "Running mkdir -p config"
mkdir -p config
if command -v glibtoolize
then
	LIBTOOLIZE=glibtoolize
else
	LIBTOOLIZE=libtoolize
fi
echo "Running ${LIBTOOLIZE} --force"
${LIBTOOLIZE} --force
echo "Running aclocal"
aclocal -I ./m4
echo "Running autoheader"
autoheader
echo "Running automake -a"
automake -a
echo "Running autoconf"
autoconf
echo "You can now run ./configure  $conf_flags $@ (potentially in a separate build directory)"
#./configure $conf_flags "$@"
