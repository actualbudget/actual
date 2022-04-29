// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef ErrnoMessageArg_INCLUDED
#define ErrnoMessageArg_INCLUDED 1

#include "MessageArg.h"
#include "rtti.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API ErrnoMessageArg : public OtherMessageArg {
  RTTI_CLASS
public:
  ErrnoMessageArg(int errnum) : errno_(errnum) { }
  MessageArg *copy() const;
  // errno might be a macro so we must use a different name
  int errnum() const;
private:
  int errno_;
};

inline
int ErrnoMessageArg::errnum() const
{
  return errno_;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not ErrnoMessageArg_INCLUDED */
