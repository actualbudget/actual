# Copyright (c) 1995 James Clark
# See the file COPYING for copying permission.

# URLStorage message definitions

=2300
E1+emptyHost++empty host in HTTP URL %1
E1+badRelative++uncompletable relative HTTP URL %1
E1+emptyPort++empty port number in HTTP URL %1
E1+invalidPort++invalid port number in HTTP URL %1
E1+hostNotFound++host %1 not found
E1+hostTryAgain++could not resolve host %1 (try again later)
E1+hostNoRecovery++could not resolve host %1 (unrecoverable error)
E1+hostNoData++no address record for host name %1
E2+hostOtherError++could not resolve host %1 (%2)
E1+hostUnknownError++could not resolve host %1 (unknown error)
E1+cannotCreateSocket++cannot create socket (%1)
E2+cannotConnect++error connecting to %1 (%2)
E2+writeError++error sending request to %1 (%2)
E2+readError++error receiving from host %1 (%2)
E2+closeError++error closing connection to host %1 (%2)
E1+invalidHostNumber++invalid host number %1
E3+getFailed++could not get %2 from %1 (reason given was %3)
E0+notSupported++URL not supported by this version
E0+onlyHTTP++only HTTP scheme supported
E1+winsockInitialize++could not initialize Windows Sockets (%1)
E0+winsockVersion++incompatible Windows Sockets version
+winsockErrorNumber++error number 
W1+Redirect++URL Redirected to %1
