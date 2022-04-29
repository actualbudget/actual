#include "config.h"
#include <stdio.h>

#ifndef HAVE_STRERROR

#define INT_DIGITS 19		/* enough for 64 bit integer */

extern int sys_nerr;
extern char *sys_errlist[];

char *strerror(n)
     int n;
{
  static char buf[sizeof("Error ") + 1 + INT_DIGITS];
  if (n >= 0 && n < sys_nerr && sys_errlist[n] != 0)
    return sys_errlist[n];
  else {
    sprintf(buf, "Error %d", n);
    return buf;
  }
}

#endif
