// Copyright (c) 1997 James Clark
// See the file COPYING for copying permission.

#ifndef TranslateCodingSystem_INCLUDED
#define TranslateCodingSystem_INCLUDED 1

#include "CodingSystem.h"
#include "Ptr.h"
#include "CharMap.h"
#include "CharsetRegistry.h"
#include "types.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API TranslateCodingSystem : public CodingSystem {
public:
  struct Desc {
    CharsetRegistry::ISORegistrationNumber number;
    // How much to add to the values in the base set.
    Char add;
  };
  // codingSystem is the underlying BCTF
  // desc describes the meaning of the bit combinations produced by that BCTF
  // charset is the system character set
  // replacementChar is character in systemCharset that should be used to represent
  // characters that do not exist in the systemCharset.
  // illegalChar is a code that can never be produced by the underlying BCTF.
  TranslateCodingSystem(const CodingSystem *codingSystem,
			const Desc *desc,
			const CharsetInfo *charset,
			Char illegalChar,
			Char replacementChar);
  Decoder *makeDecoder() const;
  Encoder *makeEncoder() const;
  unsigned fixedBytesPerChar() const;
private:
  ConstPtr<CharMapResource<Char> > decodeMap_;
  ConstPtr<CharMapResource<Char> > encodeMap_;
  const CodingSystem *sub_;
  const Desc *desc_;
  const CharsetInfo *charset_;
  Char illegalChar_;
  Char replacementChar_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not TranslateCodingSystem_INCLUDED */
