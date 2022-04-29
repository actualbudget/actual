// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#include "splib.h"
// config.h included by splib.h
#ifdef SP_USE_OWN_ASSERT

#include <stdlib.h>
#include "macros.h"

#ifdef __GNUG__
void exit(int) __attribute__((noreturn));
#endif

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

void assertionFailed(const char *, const char *, int)
{
  abort();
  exit(1);
}

#ifdef SP_NAMESPACE
}
#endif
#endif /* SP_USE_OWN_ASSERT */
