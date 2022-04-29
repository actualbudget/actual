// Copyright (c) 1995 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "EntityCatalog.h"
#include "EntityDecl.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

EntityCatalog::~EntityCatalog()
{
}


Boolean EntityCatalog::sgmlDecl(const CharsetInfo &,
				Messenger &,
				const StringC &,
				StringC &) const
{
  return 0;
}

Boolean EntityCatalog::lookup(const EntityDecl &decl,
			      const Syntax &,
			      const CharsetInfo &,
			      Messenger &,
			      StringC &str) const
{
  const StringC *p = decl.systemIdPointer();
  if (!p)
    return 0;
  str = *p;
  return 1;
}

Boolean EntityCatalog::lookupPublic(const StringC &,
				    const CharsetInfo &,
				    Messenger &,
				    StringC &) const
{
  return 0;
}

Boolean EntityCatalog::lookupChar(const StringC &,
				  const CharsetInfo &,
			    	  Messenger &,
				  UnivChar &) const
{
  return 0;
}

EntityCatalog::Syntax::~Syntax() {}

#ifdef SP_NAMESPACE
}
#endif
