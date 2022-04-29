/***************************************************************************
 $RCSfile: win32.cpp,v $
 -------------------
 cvs         : $Id: win32.cpp,v 1.3 2007-10-27 12:15:58 aquamaniac Exp $
 begin       : Sat Oct 27 2007
 copyright   : (C) 2007 by Martin Preuss
 email       : martin@libchipcard.de

 ***************************************************************************
 * This file is part of the project "LibOfx".                              *
 * Please see toplevel file COPYING of that project for license details.   *
 ***************************************************************************/


#include "win32.hh"

#include <errno.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <assert.h>



#ifdef __WIN32__

int mkstemp_win32(char *tmpl)
{
  int fd = -1;
  int len;
  char *nf;
  int i;

  len = strlen(tmpl);
  if (len < 6)
  {
    /* bad template */
    errno = EINVAL;
    return -1;
  }
  if (strcasecmp(tmpl + (len - 7), "XXXXXX"))
  {
    /* bad template, last 6 chars must be "X" */
    errno = EINVAL;
    return -1;
  }

  nf = strdup(tmpl);

  for (i = 0; i < 10; i++)
  {
    int rnd;
    char numbuf[16];

    rnd = rand();
    snprintf(numbuf, sizeof(numbuf) - 1, "%06x", rnd);
    memmove(nf + (len - 7), numbuf, 6);
    fd = open(nf, O_RDWR | O_BINARY | O_CREAT, 0444);
    if (fd >= 0)
    {
      memmove(tmpl, nf, len);
      free(nf);
      return fd;
    }
  }
  free(nf);
  errno = EEXIST;
  return -1;
}


#endif


