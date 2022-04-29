// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#include "config.h"
#include "StringSet.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

StringSet::StringSet()
{
}

Boolean StringSet::add(const StringC &str)
{
  StringC *p = table_.lookup(str);
  if (p)
    return 1;
  p = new StringC(str);
  table_.insert(p);
  return 0;
}

void StringSet::swap(StringSet &to)
{
  table_.swap(to.table_);
}


#ifdef SP_NAMESPACE
}
#endif
