// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef IdentityCodingSystem_INCLUDED
#define IdentityCodingSystem_INCLUDED 1

#include "CodingSystem.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API IdentityCodingSystem : public CodingSystem {
public:
  IdentityCodingSystem();			       
  Decoder *makeDecoder() const;
  Encoder *makeEncoder() const;
  Boolean isIdentity() const;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not IdentityCodingSystem_INCLUDED */
