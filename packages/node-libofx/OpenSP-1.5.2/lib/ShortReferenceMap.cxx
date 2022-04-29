// Copyright (c) 1995 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"
#include "ShortReferenceMap.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

ShortReferenceMap::ShortReferenceMap()
: Named(StringC()), used_(0)
{
}

ShortReferenceMap::ShortReferenceMap(const StringC &name)
: Named(name)
{
}

void ShortReferenceMap::setNameMap(Vector<StringC> &map)
{
  map.swap(nameMap_);
  // Make sure we know it's defined.
  if (nameMap_.size() == 0)
    nameMap_.resize(1);
}

#ifdef SP_NAMESPACE
}
#endif
