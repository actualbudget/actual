#!/bin/sh
#
# $Id: autoinit.sh,v 1.1.2.2 2005/12/09 04:00:57 neilroeth Exp $
#
# autoinit.sh - part of build system for C/C++ Unix/X11 programs
# Copyright (C) 1999 Hans Ulrich Niedermann
#
# This program is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation; either version 2 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA

basename="$(basename "$0" || echo "$0")"

for command in aclocal autoheader libtoolize "automake --add-missing" autoconf; do
    echo "$basename: Executing \"${command}\""
    ${command}
    status=$?
    if test $status -ne 0; then
	echo "$basename: Execution of \"${command}\" failed (exit status ${status})"
	echo "$basename: aborted (exit status ${status})"
	exit ${status}
    fi
done

configure="$(dirname "$0" || echo "<source-dir>")/configure"
echo "$basename: You probably want to run \"$configure\" now."
echo "$basename: See \"$configure --help\" for help \"$configure\" options"
