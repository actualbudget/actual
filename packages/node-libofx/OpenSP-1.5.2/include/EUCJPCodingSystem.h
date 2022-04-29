// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef EUCJPCodingSystem_INCLUDED
#define EUCJPCodingSystem_INCLUDED 1

#include "CodingSystem.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API EUCJPCodingSystem : public CodingSystem {
public:
  Decoder *makeDecoder() const;
  Encoder *makeEncoder() const;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not EUCJPCodingSystem_INCLUDED */
