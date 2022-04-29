// Copyright (c) 1996 James Clark
// See the file COPYING for copying permission.

#ifndef Win32CodingSystem_INCLUDED
#define Win32CodingSystem_INCLUDED 1

#ifdef __GNUG__
#pragma interface
#endif

#include "CodingSystem.h"
#include "Boolean.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API Win32CodingSystem : public CodingSystem {
public:
  enum SpecialCodePage {
    codePageOEM,
    codePageAnsi
    };
  Win32CodingSystem(unsigned int codePage, Char defaultChar = 0xfffd);
  Win32CodingSystem(SpecialCodePage, Char defaultChar = 0xfffd);
  Boolean isValid() const;
  Decoder *makeDecoder() const;
  Encoder *makeEncoder() const;
private:
  unsigned int codePage_;
  Char defaultChar_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not Win32CodingSystem_INCLUDED */
