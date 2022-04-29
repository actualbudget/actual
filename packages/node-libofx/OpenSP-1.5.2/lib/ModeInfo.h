// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef ModeInfo_INCLUDED
#define ModeInfo_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include <stdlib.h>
#include "Boolean.h"
#include "Syntax.h"
#include "Mode.h"
#include "Priority.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

struct TokenInfo {
  enum Type {
    delimType,
    setType,
    functionType,
    delimDelimType,
    delimSetType
    };
  Type type;
  Priority::Type priority;
  Token token;
  Syntax::DelimGeneral delim1;
  union {
    Syntax::DelimGeneral delim2;
    Syntax::Set set;
    Syntax::StandardFunction function;
  };
};

class Sd;
struct PackedTokenInfo;

class ModeInfo {
public:
  ModeInfo(Mode mode, const Sd &sd);
  Boolean nextToken(TokenInfo *);
  Boolean includesShortref() const;
private:
  Mode mode_;
  const PackedTokenInfo *p_;		// points to next
  size_t count_;
  unsigned missingRequirements_;
};

inline Boolean ModeInfo::includesShortref() const
{
  return mode_ >= minShortrefMode;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not ModeInfo_INCLUDED */
