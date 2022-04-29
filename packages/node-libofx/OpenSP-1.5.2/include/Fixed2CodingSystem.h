// Copyright (c) 1994 James Clark, 2000 Matthias Clasen
// See the file COPYING for copying permission.

#ifndef Fixed2CodingSystem_INCLUDED
#define Fixed2CodingSystem_INCLUDED 1

#include "CodingSystem.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API Fixed2CodingSystem : public CodingSystem {
public:
  Decoder *makeDecoder(Boolean lsbFirst) const;
  Encoder *makeEncoder() const;
  unsigned fixedBytesPerChar() const;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not Fixed2CodingSystem_INCLUDED */
