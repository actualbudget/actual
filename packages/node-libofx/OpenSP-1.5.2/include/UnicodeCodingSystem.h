// Copyright (c) 1994 James Clark, 2000 Matthias Clasen
// See the file COPYING for copying permission.

#ifndef UnicodeCodingSystem_INCLUDED
#define UnicodeCodingSystem_INCLUDED 1

#include "CodingSystem.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API UnicodeCodingSystem : public CodingSystem {
public:
  UnicodeCodingSystem(const InputCodingSystem *sub = 0);
  Decoder *makeDecoder() const;
  Encoder *makeEncoder() const;
private:
  const InputCodingSystem *sub_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not UnicodeCodingSystem_INCLUDED */
