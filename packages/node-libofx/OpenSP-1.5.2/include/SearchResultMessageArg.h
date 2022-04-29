// Copyright (c) 1995 James Clark
// See the file COPYING for copying permission.

#ifndef SearchResultMessageArg_INCLUDED
#define SearchResultMessageArg_INCLUDED 1

#ifdef __GNUG__
#pragma interface
#endif

#include "MessageArg.h"
#include "StringC.h"
#include "Vector.h"
#include "Vector.h"
#include "rtti.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API SearchResultMessageArg : public OtherMessageArg {
  RTTI_CLASS
public:
  SearchResultMessageArg();
  void add(StringC &, int);
  MessageArg *copy() const;
  size_t nTried() const;
  const StringC &filename(size_t) const;
  int errnum(size_t) const;
private:
  Vector<StringC> filename_;
  Vector<unsigned int> errno_;
};

inline
size_t SearchResultMessageArg::nTried() const
{
  return filename_.size();
}

inline
const StringC &SearchResultMessageArg::filename(size_t i) const
{
  return filename_[i];
}

inline
int SearchResultMessageArg::errnum(size_t i) const
{
  return errno_[i];
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not SearchResultMessageArg_INCLUDED */
