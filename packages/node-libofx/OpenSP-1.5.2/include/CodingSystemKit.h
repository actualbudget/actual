// Copyright (c) 1997 James Clark
// See the file COPYING for copying permission.

#ifndef CodingSystemKit_INCLUDED
#define CodingSystemKit_INCLUDED 1

#ifdef __GNUG__
#pragma interface
#endif

#include "Boolean.h"
#include "StringC.h"
#include "CodingSystem.h"
#include "Resource.h"
#include "CharsetInfo.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API InputCodingSystemKit : public Resource {
public:
  virtual ~InputCodingSystemKit();
  // Returned InputCodingSystem lives at least as long as the Kit.
  virtual const InputCodingSystem *
    identityInputCodingSystem() const = 0;
  virtual const InputCodingSystem *
    makeInputCodingSystem(const StringC &,
			  const CharsetInfo &,
			  Boolean isBctf,
			  const char *&staticName) const = 0;
  virtual Char replacementChar() const = 0;
  const CharsetInfo &systemCharset() const;
protected:
  CharsetInfo systemCharset_;
};

class SP_API CodingSystemKit : public InputCodingSystemKit {
public:
  virtual ~CodingSystemKit() = 0;
  virtual CodingSystemKit *copy() const = 0;
  virtual const CodingSystem *
    identityCodingSystem() const = 0;
  virtual const CodingSystem *
    makeCodingSystem(const char *, Boolean isBctf) const = 0;
  static CodingSystemKit *make(const char *);
};

inline
const CharsetInfo &InputCodingSystemKit::systemCharset() const
{
  return systemCharset_;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not CodingSystemKit_INCLUDED */
