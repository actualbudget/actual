// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "Dtd.h"
#include "Syntax.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

Dtd::Dtd(const StringC &name, Boolean isBase)
: name_(new StringResource<Char>(name)),
  nCurrentAttribute_(0),
  nElementDefinition_(0),
  nAttributeDefinitionList_(0),
  nElementType_(0),
  isBase_(isBase),
  isInstantitated_(0)
{
  documentElementType_ = new ElementType(name, allocElementTypeIndex());
  insertElementType(documentElementType_);
}

Dtd::~Dtd() {}

Boolean Dtd::shortrefIndex(const StringC &str, const Syntax &syntax,
			   size_t &index)
{
  const int *indexP = shortrefTable_.lookup(str);
  if (indexP) {
    index = *indexP;
    return 1;
  }
  if (!syntax.isValidShortref(str))
    return 0;
  shortrefTable_.insert(str, int(shortrefs_.size()));
  index = shortrefs_.size();
  shortrefs_.push_back(str);
  return 1;
}

void Dtd::addNeededShortref(const StringC &str)
{
  if (!shortrefTable_.lookup(str)) {
    shortrefTable_.insert(str, shortrefs_.size());
    shortrefs_.push_back(str);
  }
}

void Dtd::setDefaultEntity(const Ptr<Entity> &entity,
			   ParserState &parser)
{
  defaultEntity_ = entity;
  
  // If the new default entity was defined in a DTD, then
  // any defaulted entities must have come from an LPD
  // on the first pass, in which case we shouldn't replace them.
  // Otherwise we need to replace all the defaulted entities.
  if (entity->declInActiveLpd()) {
    NamedResourceTable<Entity> tem;
    {
      EntityIter iter(generalEntityTable_);
      for (;;) {
	Ptr<Entity> old(iter.next());
	if (old.isNull())
	  break;
	if (old->defaulted()) {
	  Ptr<Entity> e(defaultEntity_->copy());
	  e->setDefaulted();
	  e->setName(old->name());
	  e->generateSystemId(parser);
	  tem.insert(e);
	}
      }
    }
    {
      EntityIter iter(tem);
      for (;;) {
	Ptr<Entity> e(iter.next());
	if (e.isNull())
	  break;
	generalEntityTable_.insert(e, 1);
      }
    }
  }
}

#ifdef SP_NAMESPACE
}
#endif
