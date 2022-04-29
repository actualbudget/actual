// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef Notation_INCLUDED
#define Notation_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "Owner.h"
#include "StringC.h"
#include "NamedResource.h"
#include "types.h"
#include "Ptr.h"
#include "ExternalId.h"
#include "Boolean.h"
#include "Attributed.h"
#include "StringResource.h"
#include "EntityDecl.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class ParserState;

class SP_API Notation : public EntityDecl, public Attributed {
public:
  Notation(const StringC &,
	   const ConstPtr<StringResource<Char> > &dtdName,
	   Boolean dtdIsBase);
  virtual ~Notation();
  void setExternalId(const ExternalId &, const Location &);
  const ExternalId &externalId() const;
  Boolean defined() const;
  void generateSystemId(ParserState &);
  const StringC *systemIdPointer() const;
  const StringC *publicIdPointer() const;
private:
  Notation(const Notation &);	// undefined
  void operator=(const Notation &); // undefined
  PackedBoolean defined_;
  ExternalId externalId_;
};

inline
const ExternalId &Notation::externalId() const
{
  return externalId_;
}

inline
Boolean Notation::defined() const
{
  return defined_;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not Notation_INCLUDED */
