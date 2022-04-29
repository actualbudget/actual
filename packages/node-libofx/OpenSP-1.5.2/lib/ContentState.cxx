// Copyright (c) 1994, 1996 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"
#include "ContentState.h"
#include "IListIter.h"
#include "NCVector.h"
#include "macros.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

const ShortReferenceMap ContentState::theEmptyMap;

#ifdef __GNUG__
typedef IListIter<OpenElement> Dummy_IListIter_OpenElement;
#endif

ContentState::ContentState()
: documentElementContainer_(StringC(), size_t(-1))
{
}

void ContentState::startContent(const Dtd &dtd)
{
  NCVector<Owner<ContentToken> > tokens(1);
  tokens[0] = new ElementToken(dtd.documentElementType(),
			       ContentToken::none);
  Owner<ModelGroup> model(new SeqModelGroup(tokens, ContentToken::none));
  Owner<CompiledModelGroup> compiledModel(new CompiledModelGroup(model));
  Vector<ContentModelAmbiguity> ambiguities;
  Boolean pcdataUnreachable;
  compiledModel->compile(dtd.nElementTypeIndex(), ambiguities,
			 pcdataUnreachable);
  ASSERT(ambiguities.size() == 0);
  ConstPtr<ElementDefinition> def
    = new ElementDefinition(Location(),
			    0,
			    0,
			    ElementDefinition::modelGroup,
			    compiledModel);
  documentElementContainer_.setElementDefinition(def, 0);
  tagLevel_ = 0;
  while (!openElements_.empty())
    delete openElements_.get();
  openElements_.insert(new OpenElement(&documentElementContainer_,
				       0,
				       0,
				       &theEmptyMap,
				       Location()));
  includeCount_.assign(dtd.nElementTypeIndex(), 0);
  excludeCount_.assign(dtd.nElementTypeIndex(), 0);
  openElementCount_.assign(dtd.nElementTypeIndex(), 0);
  netEnablingCount_ = 0;
  totalExcludeCount_ = 0;
  lastEndedElementType_ = 0;
  nextIndex_ = 0;
}

void ContentState::pushElement(OpenElement *e)
{
  tagLevel_++;
  openElementCount_[e->type()->index()]++;
  const ElementDefinition *def = e->type()->definition();
  if (def) {
    size_t i;
    for (i = 0; i < def->nInclusions(); i++)
      includeCount_[def->inclusion(i)->index()]++;
    for (i = 0; i < def->nExclusions(); i++) {
      excludeCount_[def->exclusion(i)->index()]++;
      totalExcludeCount_++;
    }
  }
  if (e->netEnabling())
    netEnablingCount_++;
  e->setIndex(nextIndex_++);
  openElements_.insert(e);
}

OpenElement *ContentState::popSaveElement()
{
  ASSERT(tagLevel_ > 0);
  OpenElement *e = openElements_.get();
  tagLevel_--;
  openElementCount_[e->type()->index()]--;
  const ElementDefinition *def = e->type()->definition();
  if (def) {
    size_t i;
    for (i = 0; i < def->nInclusions(); i++)
      includeCount_[def->inclusion(i)->index()]--;
    for (i = 0; i < def->nExclusions(); i++) {
      excludeCount_[def->exclusion(i)->index()]--;
      totalExcludeCount_--;
    }
  }
  if (e->netEnabling())
    netEnablingCount_--;
  lastEndedElementType_ = e->type();
  return e;
}

void ContentState::popElement()
{
  delete popSaveElement();
}
			      
Boolean ContentState::checkImplyLoop(unsigned count)
{
  for (IListIter<OpenElement> iter(openElements_);
       count > 0;
       iter.next(), count--)
    if (iter.cur()->type() == openElements_.head()->type()
	// I'm not sure whether this is necessary.
	&& iter.cur()->matchState() == openElements_.head()->matchState())
      return 0;
  return 1;
}

void ContentState::getOpenElementInfo(Vector<OpenElementInfo> &v,
				      const StringC &rniPcdata) const
{
  v.clear();
  v.resize(tagLevel_);
  unsigned i = tagLevel_;
  for (IListIter<OpenElement> iter(openElements_);
       !iter.done() && i > 0;
       iter.next()) {
    OpenElementInfo &e = v[--i];
    e.gi = iter.cur()->type()->name();
    const LeafContentToken *token = iter.cur()->currentPosition();
    if (token && !token->isInitial()) {
      e.matchIndex = token->typeIndex() + 1;
      const ElementType *type = token->elementType();
      e.matchType = type ? type->name() : rniPcdata;
    }
    e.included = iter.cur()->included();
  }
}

ElementType *
ContentState::lookupCreateUndefinedElement(const StringC &name,
					   const Location &loc,
					   Dtd &dtd,
					   Boolean allowImmediateRecursion)
{
  ElementType *p = new ElementType(name,
				   dtd.allocElementTypeIndex());
  dtd.insertElementType(p);
  p->setElementDefinition(new ElementDefinition(loc,
						size_t(ElementDefinition::undefinedIndex),
						ElementDefinition::omitEnd,
						ElementDefinition::any,
						allowImmediateRecursion
						),
			  0);
  p->setAttributeDef(dtd.implicitElementAttributeDef());

  includeCount_.push_back(0);
  excludeCount_.push_back(0);
  openElementCount_.push_back(0);
  return p;
}


#ifdef SP_NAMESPACE
}
#endif
