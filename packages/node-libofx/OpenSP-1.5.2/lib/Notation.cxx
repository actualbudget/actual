// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "Notation.h"
#include "ParserState.h"
#include "Sd.h"
#include "Syntax.h"
#include "MessageArg.h"
#include "ParserMessages.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

Notation::Notation(const StringC &name,
		   const ConstPtr<StringResource<Char> > &dtdName,
		   Boolean dtdIsBase)
: EntityDecl(name, notation, ndata, Location()), defined_(0)
{
  setDeclIn(dtdName, dtdIsBase);
}

Notation::~Notation() {}

void Notation::setExternalId(const ExternalId &id, const Location &defLocation)
{
  externalId_ = id;
  defined_ = 1;
  setDefLocation(defLocation);
}

void Notation::generateSystemId(ParserState &parser)
{
  StringC str;
  if (parser.entityCatalog().lookup(*this,
				    parser.syntax(),
				    parser.sd().docCharset(),
				    parser.messenger(),
				    str))
    externalId_.setEffectiveSystem(str);
  else if (parser.options().warnNotationSystemId)
    parser.message(ParserMessages::cannotGenerateSystemIdNotation,
		   StringMessageArg(name()));
}

const StringC *Notation::systemIdPointer() const
{
  return externalId_.systemIdString();
}

const StringC *Notation::publicIdPointer() const
{
  return externalId_.publicIdString();
}


#ifdef SP_NAMESPACE
}
#endif
