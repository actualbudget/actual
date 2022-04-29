// Copyright (c) 2001 Epremis Corp.
// See the file COPYING for copying permission.

#ifndef MessageModule_INCLUDED
#define MessageModule_INCLUDED 1

#ifdef SP_NO_MESSAGE_TEXT
// Windows only
#define WIN32_LEAN_AND_MEAN
#define STRICT
#include "windows.h"
#endif /* SP_NO_MESSAGE_TEXT */

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API MessageModule {
public:
#ifdef SP_NO_MESSAGE_TEXT
  MessageModule() : dllInstanceHandle( 0) {}
  HINSTANCE dllInstanceHandle;
#else
  MessageModule() : domain( 0) {}
  const char * domain;
#endif	
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not MessageModule_INCLUDED */
