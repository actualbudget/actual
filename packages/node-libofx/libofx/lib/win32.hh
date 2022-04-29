/***************************************************************************
 $RCSfile: win32.hh,v $
 -------------------
 cvs         : $Id: win32.hh,v 1.3 2007-10-27 12:15:58 aquamaniac Exp $
 begin       : Sat Oct 27 2007
 copyright   : (C) 2007 by Martin Preuss
 email       : martin@libchipcard.de

 ***************************************************************************
 * This file is part of the project "LibOfx".                              *
 * Please see toplevel file COPYING of that project for license details.   *
 ***************************************************************************/

#ifndef LIBOFX_WIN32_HH
#define LIBOFX_WIN32_HH



#ifdef HAVE_CONFIG_H
# include <config.h>
#endif


#ifdef __WIN32__

int mkstemp_win32(char *tmpl);


#endif


#endif

