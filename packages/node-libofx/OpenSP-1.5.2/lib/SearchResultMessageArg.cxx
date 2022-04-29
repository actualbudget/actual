// Copyright (c) 1995 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"
#include "SearchResultMessageArg.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

RTTI_DEF1(SearchResultMessageArg, OtherMessageArg);

SearchResultMessageArg::SearchResultMessageArg()
{
}

MessageArg *SearchResultMessageArg::copy() const
{
  return new SearchResultMessageArg(*this);
}

void SearchResultMessageArg::add(StringC &str, int n)
{
  filename_.resize(filename_.size() + 1);
  str.swap(filename_.back());
  errno_.push_back(n);
}

#ifdef SP_NAMESPACE
}
#endif
