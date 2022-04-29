// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef Dtd_INCLUDED
#define Dtd_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "NamedTable.h"
#include "NamedResourceTable.h"
#include "ElementType.h"
#include "Notation.h"
#include "Entity.h"
#include "ShortReferenceMap.h"
#include "Resource.h"
#include "StringC.h"
#include "StringResource.h"
#include "Boolean.h"
#include "Vector.h"
#include "HashTable.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class Syntax;
class ParserState;

class SP_API Dtd : public Resource {
public:
  typedef NamedTableIter<ElementType> ElementTypeIter;
  typedef ConstNamedTableIter<ElementType> ConstElementTypeIter;
  typedef NamedTableIter<RankStem> RankStemIter;
  typedef ConstNamedTableIter<RankStem> ConstRankStemIter;
  typedef NamedTableIter<ShortReferenceMap> ShortReferenceMapIter;
  typedef ConstNamedResourceTableIter<Notation> ConstNotationIter;
  typedef NamedResourceTableIter<Notation> NotationIter;
  typedef ConstNamedResourceTableIter<Entity> ConstEntityIter;
  typedef NamedResourceTableIter<Entity> EntityIter;
  Dtd(const StringC &name, Boolean isBase);
  ~Dtd();
  ConstPtr<Entity> lookupEntity(Boolean isParameter, const StringC &) const;
  const Entity *lookupEntityTemp(Boolean isParameter, const StringC &) const;
  Ptr<Entity> lookupEntity(Boolean isParameter, const StringC &);
  Ptr<Entity> insertEntity(const Ptr<Entity> &, Boolean replace = 0);
  Ptr<Entity> removeEntity(Boolean isParameter, const StringC &);
  ConstEntityIter generalEntityIter() const;
  EntityIter generalEntityIter();
  ConstEntityIter parameterEntityIter() const;
  EntityIter parameterEntityIter();

  ConstPtr<Entity> defaultEntity() const;
  const Entity *defaultEntityTemp() const;
  void setDefaultEntity(const Ptr<Entity> &, ParserState &);
  const ConstPtr<StringResource<Char> > &namePointer() const;
  const StringC &name() const;

  const ElementType *lookupElementType(const StringC &) const;
  ElementType *lookupElementType(const StringC &);
  ElementType *removeElementType(const StringC &);
  ElementType *insertElementType(ElementType *);
  size_t nElementTypeIndex() const;
  size_t allocElementTypeIndex();
  ConstElementTypeIter elementTypeIter() const;
  ElementTypeIter elementTypeIter();

  const RankStem *lookupRankStem(const StringC &) const;
  RankStem *lookupRankStem(const StringC &);
  RankStem *insertRankStem(RankStem *);
  size_t nRankStem() const;
  ConstRankStemIter rankStemIter() const;
  RankStemIter rankStemIter();

  const ShortReferenceMap *lookupShortReferenceMap(const StringC &) const;
  ShortReferenceMap *lookupShortReferenceMap(const StringC &);
  ShortReferenceMap *insertShortReferenceMap(ShortReferenceMap *);
  ShortReferenceMapIter shortReferenceMapIter();

  Boolean shortrefIndex(const StringC &, const Syntax &, size_t &index);
  size_t nShortref() const;
  const StringC &shortref(size_t i) const;
  void addNeededShortref(const StringC &);

  ConstPtr<Notation> lookupNotation(const StringC &) const;
  const Notation *lookupNotationTemp(const StringC &) const;
  Ptr<Notation> lookupNotation(const StringC &);
  Ptr<Notation> insertNotation(const Ptr<Notation> &);
  Ptr<Notation> removeNotation(const StringC &);
  ConstNotationIter notationIter() const;
  NotationIter notationIter();

  size_t allocCurrentAttributeIndex();
  size_t nCurrentAttribute() const;
  size_t allocElementDefinitionIndex();
  size_t nElementDefinition() const;
  size_t allocAttributeDefinitionListIndex();
  size_t nAttributeDefinitionList() const;
  const ElementType *documentElementType() const;
  Boolean isBase() const;
  Boolean isInstantiated() const;
  void instantiate();

  Ptr<AttributeDefinitionList> &implicitElementAttributeDef();
  void setImplicitElementAttributeDef(const Ptr<AttributeDefinitionList> &);
  Ptr<AttributeDefinitionList> &implicitNotationAttributeDef();
  void setImplicitNotationAttributeDef(const Ptr<AttributeDefinitionList> &);
private:
  Dtd(const Dtd &);		// undefined
  void operator=(const Dtd &);	// undefined
  NamedResourceTable<Entity> generalEntityTable_;
  NamedResourceTable<Entity> parameterEntityTable_;
  ConstPtr<Entity> defaultEntity_;
  ConstPtr<StringResource<Char> > name_;
  NamedTable<ElementType> elementTypeTable_;
  NamedTable<RankStem> rankStemTable_;
  NamedTable<ShortReferenceMap> shortReferenceMapTable_;
  NamedResourceTable<Notation> notationTable_;
  size_t nCurrentAttribute_;
  size_t nElementDefinition_;
  size_t nAttributeDefinitionList_;
  size_t nElementType_;
  ElementType *documentElementType_;
  Vector<StringC> shortrefs_;
  HashTable<StringC,int> shortrefTable_;
  Boolean isBase_;
  Boolean isInstantitated_;
  Ptr<AttributeDefinitionList> implicitElementAttributeDef_;
  Ptr<AttributeDefinitionList> implicitNotationAttributeDef_;
};

inline
ConstPtr<Entity> Dtd::lookupEntity(Boolean isParameter, const StringC &name)
  const
{
  return (isParameter
	  ? &parameterEntityTable_
	  : &generalEntityTable_)->lookupConst(name);
}

inline
const Entity *Dtd::lookupEntityTemp(Boolean isParameter, const StringC &name)
  const
{
  return (isParameter
	  ? &parameterEntityTable_
	  : &generalEntityTable_)->lookupTemp(name);
}

inline
Ptr<Entity> Dtd::lookupEntity(Boolean isParameter, const StringC &name)
{
  return (isParameter
	  ? &parameterEntityTable_
	  : &generalEntityTable_)->lookup(name);
}

inline
Ptr<Entity>
Dtd::insertEntity(const Ptr<Entity> &entity, Boolean replace)
{
  return ((entity->declType() == Entity::parameterEntity 
	   || entity->declType() == Entity::doctype)
	  ? &parameterEntityTable_
	  : &generalEntityTable_)->insert(entity, replace);
}

inline
Ptr<Entity> Dtd::removeEntity(Boolean isParameter, const StringC &name)
{
  return (isParameter
	  ? &parameterEntityTable_
	  : &generalEntityTable_)->remove(name);
}

inline
Dtd::ConstEntityIter Dtd::generalEntityIter() const
{
  // Avoid use of typedef to work around MSVC 2.0 bug.
  return ConstNamedResourceTableIter<Entity>(generalEntityTable_);
}

inline
Dtd::EntityIter Dtd::generalEntityIter()
{
  // Avoid use of typedef to work around MSVC 2.0 bug.
  return NamedResourceTableIter<Entity>(generalEntityTable_);
}

inline
Dtd::ConstEntityIter Dtd::parameterEntityIter() const
{
  // Avoid use of typedef to work around MSVC 2.0 bug.
  return ConstNamedResourceTableIter<Entity>(parameterEntityTable_);
}

inline
Dtd::EntityIter Dtd::parameterEntityIter()
{
  // Avoid use of typedef to work around MSVC 2.0 bug.
  return NamedResourceTableIter<Entity>(parameterEntityTable_);
}

inline
ConstPtr<Entity> Dtd::defaultEntity() const
{
  return defaultEntity_;
}

inline
const Entity *Dtd::defaultEntityTemp() const
{
  return defaultEntity_.pointer();
}

inline
const ConstPtr<StringResource<Char> > &Dtd::namePointer() const
{
  return name_;
}

inline
const StringC &Dtd::name() const
{
  return *name_;
}

inline
size_t Dtd::allocCurrentAttributeIndex()
{
  return nCurrentAttribute_++;
}

inline
size_t Dtd::nCurrentAttribute() const
{
  return nCurrentAttribute_;
}

inline
size_t Dtd::allocElementDefinitionIndex()
{
  return nElementDefinition_++;
}

inline
size_t Dtd::nElementDefinition() const
{
  return nElementDefinition_;
}

inline
size_t Dtd::allocAttributeDefinitionListIndex()
{
  return nAttributeDefinitionList_++;
}

inline
size_t Dtd::nAttributeDefinitionList() const
{
  return nAttributeDefinitionList_;
}

inline
const ElementType *Dtd::lookupElementType(const StringC &name) const
{
  return elementTypeTable_.lookup(name);
}

inline
ElementType *Dtd::lookupElementType(const StringC &name)
{
  return elementTypeTable_.lookup(name);
}

inline
ElementType *Dtd::insertElementType(ElementType *e)
{
  return elementTypeTable_.insert(e);
}

inline
Dtd::ElementTypeIter Dtd::elementTypeIter()
{
  // Avoid use of typedef to work around MSVC 2.0 bug.
  return NamedTableIter<ElementType>(elementTypeTable_);
}

inline
Dtd::ConstElementTypeIter Dtd::elementTypeIter() const
{
  // Avoid use of typedef to work around MSVC 2.0 bug.
  return ConstNamedTableIter<ElementType>(elementTypeTable_);
}

inline
Dtd::RankStemIter Dtd::rankStemIter()
{
  // Avoid use of typedef to work around MSVC 2.0 bug.
  return NamedTableIter<RankStem>(rankStemTable_);
}

inline
Dtd::ConstRankStemIter Dtd::rankStemIter() const
{
  // Avoid use of typedef to work around MSVC 2.0 bug.
  return ConstNamedTableIter<RankStem>(rankStemTable_);
}

inline
ElementType *Dtd::removeElementType(const StringC &name)
{
  return elementTypeTable_.remove(name);
}

inline
size_t Dtd::nElementTypeIndex() const
{
  // index 0 is reserved for #pcdata
  return 1 + nElementType_;
}

inline
size_t Dtd::allocElementTypeIndex()
{
  return 1 + nElementType_++;
}

inline
const RankStem *Dtd::lookupRankStem(const StringC &name) const
{
  return rankStemTable_.lookup(name);
}

inline
RankStem *Dtd::lookupRankStem(const StringC &name)
{
  return rankStemTable_.lookup(name);
}

inline
RankStem *Dtd::insertRankStem(RankStem *e)
{
  return rankStemTable_.insert(e);
}

inline
size_t Dtd::nRankStem() const
{
  return rankStemTable_.count();
}

inline
ConstPtr<Notation> Dtd::lookupNotation(const StringC &name) const
{
  return notationTable_.lookupConst(name);
}

inline
const Notation *Dtd::lookupNotationTemp(const StringC &name) const
{
  return notationTable_.lookupTemp(name);
}

inline
Ptr<Notation> Dtd::lookupNotation(const StringC &name)
{
  return notationTable_.lookup(name);
}

inline
Ptr<Notation> Dtd::insertNotation(const Ptr<Notation> &nt)
{
  return notationTable_.insert(nt);
}

inline
Dtd::ConstNotationIter Dtd::notationIter() const
{
  // Avoid use of typedef to work around MSVC 2.0 bug.
  return ConstNamedResourceTableIter<Notation>(notationTable_);
}

inline
Dtd::NotationIter Dtd::notationIter()
{
  // Avoid use of typedef to work around MSVC 2.0 bug.
  return NamedResourceTableIter<Notation>(notationTable_);
}

inline
Ptr<Notation> Dtd::removeNotation(const StringC &name)
{
  return notationTable_.remove(name);
}

inline
const ElementType *Dtd::documentElementType() const
{
  return documentElementType_;
}

inline
const ShortReferenceMap *Dtd::lookupShortReferenceMap(const StringC &name) const
{
  return shortReferenceMapTable_.lookup(name);
}

inline
ShortReferenceMap *Dtd::lookupShortReferenceMap(const StringC &name)
{
  return shortReferenceMapTable_.lookup(name);
}

inline
ShortReferenceMap *Dtd::insertShortReferenceMap(ShortReferenceMap *map)
{
  return shortReferenceMapTable_.insert(map);
}

inline
Dtd::ShortReferenceMapIter Dtd::shortReferenceMapIter()
{
  // Avoid use of typedef to work around MSVC 2.0 bug.
  return NamedTableIter<ShortReferenceMap>(shortReferenceMapTable_);
}

inline
Boolean Dtd::isBase() const
{
  return isBase_;
}

inline
size_t Dtd::nShortref() const
{
  return shortrefs_.size();
}

inline
const StringC &Dtd::shortref(size_t i) const
{
  return shortrefs_[i];
}

inline
Ptr<AttributeDefinitionList> &Dtd::implicitElementAttributeDef()
{
  return implicitElementAttributeDef_;
}

inline
void Dtd::setImplicitElementAttributeDef(const Ptr<AttributeDefinitionList> &def)
{
  implicitElementAttributeDef_ = def;
}

inline
Ptr<AttributeDefinitionList> &Dtd::implicitNotationAttributeDef()
{
  return implicitNotationAttributeDef_;
}

inline
void Dtd::setImplicitNotationAttributeDef(const Ptr<AttributeDefinitionList> &def)
{
  implicitNotationAttributeDef_ = def;
}

inline 
Boolean Dtd::isInstantiated() const
{
  return isInstantitated_;
}

inline 
void Dtd::instantiate() 
{
  isInstantitated_ = 1;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not Dtd_INCLUDED */
