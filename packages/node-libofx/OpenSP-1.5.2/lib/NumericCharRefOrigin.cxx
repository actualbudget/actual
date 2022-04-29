// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "NumericCharRefOrigin.h"
#include "Markup.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

NumericCharRefOrigin::NumericCharRefOrigin(const Location &start,
					   Index refLength,
					   Owner<Markup> &markup)
: start_(start), refLength_(refLength)
{
  markup.swap(markup_);
}

const Location &NumericCharRefOrigin::parent() const
{
  return start_;
}

Index NumericCharRefOrigin::refLength() const
{
  return refLength_;
}

Boolean NumericCharRefOrigin::isNumericCharRef(const Markup *&markup) const
{
  markup = markup_.pointer();
  return 1;
}


#ifdef SP_NAMESPACE
}
#endif
