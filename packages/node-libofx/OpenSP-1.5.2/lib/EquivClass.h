// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef EquivClass_INCLUDED
#define EquivClass_INCLUDED 1

#include "Link.h"
#include "types.h"
#include "ISet.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

struct EquivClass : public Link {
  EquivClass(unsigned in = 0) : inSets(in) { }
  ISet<Char> set;
  unsigned inSets;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not EquivClass_INCLUDED */
