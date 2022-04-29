// Copyright (c) 1997 James Clark
// See the file COPYING for copying permission.

#ifndef XMLCodingSystem_INCLUDED
#define XMLCodingSystem_INCLUDED 1

#include "CodingSystem.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class InputCodingSystemKit;

class SP_API XMLCodingSystem : public CodingSystem {
public:
  XMLCodingSystem(const InputCodingSystemKit *);
  Decoder *makeDecoder() const;
  Encoder *makeEncoder() const;
private:
  const InputCodingSystemKit *kit_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not XMLCodingSystem_INCLUDED */
