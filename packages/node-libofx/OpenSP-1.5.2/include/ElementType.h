// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef ElementType_INCLUDED
#define ElementType_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include <stddef.h>
#include "Boolean.h"
#include "Vector.h"
#include "Owner.h"
#include "Location.h"
#include "Ptr.h"
#include "Named.h"
#include "Vector.h"
#include "Attributed.h"
#include "Mode.h"
#include "ContentToken.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class ElementType;
class ShortReferenceMap;
class RankStem;

class SP_API ElementDefinition : public Resource {
public:
  enum DeclaredContent { modelGroup, any, cdata, rcdata, empty };
  enum OmitFlags { omitStart = 01, omitEnd = 02, omitSpec = 04 };
  enum { undefinedIndex = -1 };
  ElementDefinition(const Location &location,
		    size_t index,
		    unsigned char omitFlags,
		    DeclaredContent declaredContent,
		    Boolean allowImmediateRecursion = 1);
  ElementDefinition(const Location &location,
		    size_t index,
		    unsigned char omitFlags,
		    DeclaredContent declaredContent,
		    Owner<CompiledModelGroup> &modelGroup);
  ~ElementDefinition();
  const CompiledModelGroup *compiledModelGroup() const;
  DeclaredContent declaredContent() const;
  // Was the omitted tag minimization specified?
  Boolean omittedTagSpec() const;
  Boolean canOmitStartTag() const;
  Boolean canOmitEndTag() const;
  size_t nRankStems() const;
  const RankStem *rankStem(size_t i) const;
  const StringC &rankSuffix() const;
  size_t nInclusions() const;
  const ElementType *inclusion(size_t) const;
  size_t nExclusions() const;
  const ElementType *exclusion(size_t) const;
  Boolean undefined() const;
  Boolean allowImmediateRecursion() const;
  void setInclusions(Vector<const ElementType *> &inclusions);
  void setExclusions(Vector<const ElementType *> &exclusions);
  void setRank(StringC &suffix, Vector<const RankStem *> &rankStems);
  Mode mode(Boolean netEnabled) const;
  const Location &location() const;
private:
  ElementDefinition(const ElementDefinition &);	// undefined
  void operator=(const ElementDefinition &);	// undefined
  void computeMode();

  Location location_;
  size_t index_;
  unsigned char omitFlags_;
  DeclaredContent declaredContent_;
  Boolean allowImmediateRecursion_;
  Owner<CompiledModelGroup> modelGroup_;
  Vector<const ElementType *> inclusions_;
  Vector<const ElementType *> exclusions_;
  // rankStems_ contains all the rank stems in the ranked group in this
  // definition.
  Vector<const RankStem *> rankStems_;
  StringC rankSuffix_;
  Mode mode_;
  Mode netMode_;
};

class SP_API RankStem : public Named {
public:
  RankStem(const StringC &, size_t);
  size_t index() const;
  void addDefinition(const ConstPtr<ElementDefinition> &);
  size_t nDefinitions() const;
  const ElementDefinition *definition(size_t) const;
private:
  RankStem(const RankStem &);	// undefined
  void operator=(const RankStem &); // undefined
  size_t index_;
  Vector<ConstPtr<ElementDefinition> > def_;
};

class SP_API ElementType : public Named, public Attributed {
public:
  ElementType(const StringC &, size_t);
  void setElementDefinition(const ConstPtr<ElementDefinition> &,
			    size_t defIndex);
  void setMap(const ShortReferenceMap *);
  void setRankStem(RankStem *);
  Boolean undefined() const;
  void setOrigName(StringC &origName);
  const ElementDefinition *definition() const;
  Boolean isRankedElement() const;
  const RankStem *rankedElementRankStem() const;
  size_t index() const;
  const ShortReferenceMap *map() const;
  void swap(ElementType &);
  const StringC &origName() const;
private:
  StringC origName_;
  ElementType(const ElementType &); // undefined
  void operator=(const ElementType &); // undefined
  size_t index_;
  size_t defIndex_;		// index in the group having same definition
  ConstPtr<ElementDefinition> def_;
  const ShortReferenceMap *map_;
};

inline
const CompiledModelGroup *ElementDefinition::compiledModelGroup() const
{
  return modelGroup_.pointer();
}

inline
ElementDefinition::DeclaredContent ElementDefinition::declaredContent() const
{
  return declaredContent_;
}

inline
Boolean ElementDefinition::canOmitStartTag() const
{
  return (omitFlags_ & omitStart) != 0;
}

inline
Boolean ElementDefinition::canOmitEndTag() const
{
  return (omitFlags_ & omitEnd) != 0;
}

inline
Boolean ElementDefinition::omittedTagSpec() const
{
  return (omitFlags_ & omitSpec) != 0;
}

inline
size_t ElementDefinition::nRankStems() const
{
  return rankStems_.size();
}

inline
const StringC &ElementDefinition::rankSuffix() const
{
  return rankSuffix_;
}

inline
const RankStem *ElementDefinition::rankStem(size_t i) const
{
  return rankStems_[i];
}

inline
const ElementType *ElementDefinition::inclusion(size_t i) const
{
  return inclusions_[i];
}

inline
size_t ElementDefinition::nInclusions() const
{
  return inclusions_.size();
}

inline
const ElementType *ElementDefinition::exclusion(size_t i) const
{
  return exclusions_[i];
}

inline
size_t ElementDefinition::nExclusions() const
{
  return exclusions_.size();
}

inline
Boolean ElementDefinition::undefined() const
{
  return index_ == size_t(undefinedIndex);
}

inline
Boolean ElementDefinition::allowImmediateRecursion() const
{
  return allowImmediateRecursion_;
}

inline
const Location &ElementDefinition::location() const
{
  return location_;
}

inline
void ElementDefinition::setInclusions(Vector<const ElementType *> &inclusions)
{
  inclusions.swap(inclusions_);
}

inline
void ElementDefinition::setExclusions(Vector<const ElementType *> &exclusions)
{
  exclusions.swap(exclusions_);
}

inline
void ElementDefinition::setRank(StringC &rankSuffix,
				Vector<const RankStem *> &rankStems)
{
  rankStems.swap(rankStems_);
  rankSuffix.swap(rankSuffix_);
}

inline
void ElementType::setOrigName(StringC &origName)
{
  origName.swap(origName_);
}

inline
Boolean ElementType::undefined() const
{
  return def_->undefined();
}

inline
Boolean ElementType::isRankedElement() const
{
  return def_->nRankStems() > 0;
}

inline
const ElementDefinition *ElementType::definition() const
{
  return def_.pointer();
}

inline
void ElementType::setElementDefinition(const ConstPtr<ElementDefinition> &def,
				       size_t defIndex)
{
  def_ = def;
  defIndex_ = defIndex;
}

inline
size_t ElementType::index() const
{
  return index_;
}

inline
const RankStem *ElementType::rankedElementRankStem() const
{
  return def_->rankStem(defIndex_);
}

inline
void ElementType::setMap(const ShortReferenceMap *map)
{
  map_ = map;
}

inline
const StringC &ElementType::origName() const
{
  return origName_;
}

inline
const ShortReferenceMap *ElementType::map() const
{
  return map_;
}

inline 
size_t RankStem::index() const
{
  return index_;
}

inline
size_t RankStem::nDefinitions() const
{
  return def_.size();
}

inline
const ElementDefinition *RankStem::definition(size_t i) const
{
  return def_[i].pointer();
}

inline
Mode ElementDefinition::mode(Boolean netEnabled) const
{
  return netEnabled ? netMode_ : mode_;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not ElementType_INCLUDED */
