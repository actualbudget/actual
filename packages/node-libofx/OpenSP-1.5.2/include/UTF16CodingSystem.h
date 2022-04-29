// Copyright (c) 2000 Matthias Clasen
// See the file COPYING for copying permission.

#ifndef UTF16CodingSystem_INCLUDED
#define UTF16CodingSystem_INCLUDED 1

#include "CodingSystem.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API UTF16CodingSystem : public CodingSystem {
public:
  Decoder *makeDecoder(Boolean) const;
  Encoder *makeEncoder() const;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not UTF16CodingSystem_INCLUDED */
