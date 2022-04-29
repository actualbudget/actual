// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef UTF8CodingSystem_INCLUDED
#define UTF8CodingSystem_INCLUDED 1

#include "CodingSystem.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API UTF8CodingSystem : public CodingSystem {
public:
  Decoder *makeDecoder() const;
  Encoder *makeEncoder() const;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not UTF8CodingSystem_INCLUDED */
