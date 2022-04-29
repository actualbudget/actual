# Copyright (c) 1994, 1995 James Clark
# See the file COPYING for copying permission.

# nsgmls message definitions

E1+unknownOutputOption++unknown output option %1
I1+BHelp++Enable batch mode.
I1+oHelp++Produce output according to %1.
I1+pHelp++Stop after the document prolog.
I1+sHelp++Suppress output.
I1+tHelp++Send RAST output to file %1.
I1+dHelp++Same as -wduplicate.
I1+lHelp++Same as -oline.
I1+mHelp++Same as -c.
I1+rHelp++Same as -wdefault.
I1+uHelp++Same as -wundef.
I1+info1++%1 parses and validates the SGML document whose document entity is
I1+info2++specified by the system identifiers SYSID... and prints on the standard
I1+info3++output a simple text representation of its Element Structure Information Set.
I1+info4++If more than one system identifier is specified, then the corresponding
I1+info5++entities will be concatenated to form the document entity. If no system
I1+info6++identifiers are specified, then %1 will read the document entity from
I1+info7++the standard input. A command line system identifier of - can be used
I1+info8++to refer to the standard input.
+file++FILE
+option++OPTION
+sysid++SYSID
