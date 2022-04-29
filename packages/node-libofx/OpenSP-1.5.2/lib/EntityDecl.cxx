// Copyright (c) 1995 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "EntityDecl.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

EntityDecl::EntityDecl(const StringC &str, DeclType declType, DataType dataType,
		       const Location &defLocation)
: NamedResource(str), declType_(declType), dataType_(dataType),
  defLocation_(defLocation), dtdIsBase_(0), lpdIsActive_(0)
{
}

void EntityDecl::setDeclIn(const ConstPtr<StringResource<Char> > &dtdName,
			   Boolean dtdIsBase,
			   const ConstPtr<StringResource<Char> > &lpdName,
			   Boolean lpdIsActive)
{
  dtdName_ = dtdName;
  lpdName_ = lpdName;
  dtdIsBase_ = dtdIsBase;
  lpdIsActive_ = lpdIsActive;
}

void EntityDecl::setDeclIn(const ConstPtr<StringResource<Char> > &dtdName,
			   Boolean dtdIsBase)
{
  dtdName_ = dtdName;
  lpdName_.clear();
  dtdIsBase_ = dtdIsBase;
}

const StringC *EntityDecl::systemIdPointer() const
{
  return 0;
}

const StringC *EntityDecl::publicIdPointer() const
{
  return 0;
}

const StringC *EntityDecl::effectiveSystemIdPointer() const
{
  return 0;
}


#ifdef SP_NAMESPACE
}
#endif
