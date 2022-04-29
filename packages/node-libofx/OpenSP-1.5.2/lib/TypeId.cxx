// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#include "splib.h"
#include "TypeId.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

int TypeId::isA(TypeId ti) const
{
  if (*this == ti)
    return 1;
  for (const void *const *p = bases_; *p; p++)
    if (TypeId((const void *const *)*p).isA(ti))
      return 1;
  return 0;
}

int TypeId::canCast(TypeId to, TypeId from) const
{
  return isA(to) && to.isA(from);
}

#ifdef SP_NAMESPACE
}
#endif
