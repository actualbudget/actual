// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef Priority_INCLUDED
#define Priority_INCLUDED 1

#include <limits.h>
#include "Boolean.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class Priority {
public:
  typedef unsigned char Type;
  enum {
    data = 0,
    dataDelim = 1,
    function = 2,
    delim = UCHAR_MAX
    };
  static inline Type blank(int n) {
    // `Priority::' works round gcc 2.5.5 bug
    return Priority::Type(n + function);
  }
  static inline Boolean isBlank(Type t) {
    return function < t && t < delim;
  }
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not Priority_INCLUDED */
