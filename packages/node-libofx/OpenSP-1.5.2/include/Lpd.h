// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef Lpd_INCLUDED
#define Lpd_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "Attribute.h"
#include "StringC.h"
#include "Ptr.h"
#include "Resource.h"
#include "Boolean.h"
#include "Named.h"
#include "NamedTable.h"
#include "Syntax.h"
#include "Location.h"
#include "Dtd.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class ElementType;

struct SP_API ResultElementSpec {
  ResultElementSpec();
  const ElementType *elementType;
  AttributeList attributeList;
  void swap(ResultElementSpec &);
};

class SP_API Lpd : public Resource {
public:
  enum Type { simpleLink, implicitLink, explicitLink };
  Lpd(const StringC &, Type, const Location &,
      const Ptr<Dtd> &sourceDtd);
  virtual ~Lpd();
  Type type() const;
  const Location &location() const;
  const Ptr<Dtd> &sourceDtd();
  ConstPtr<Dtd> sourceDtd() const;
  Boolean active() const;
  void activate();
  const ConstPtr<StringResource<Char> > &namePointer() const;
  const StringC &name() const;
private:
  Lpd(const Lpd &);		// undefined
  void operator=(const Lpd &);	// undefined
  Type type_;
  Location location_;
  Boolean active_;
  Ptr<Dtd> sourceDtd_;
  ConstPtr<StringResource<Char> > name_;
};

class SP_API SimpleLpd : public Lpd, public Attributed {
public:
  SimpleLpd(const StringC &, const Location &,
	    const Ptr<Dtd> &sourceDtd);
private:
  SimpleLpd(const SimpleLpd &);	// undefined
  void operator=(const SimpleLpd &); // undefined
};

class LinkSet;

// A link rule whose source element specification is not implied.

class SP_API SourceLinkRule {
public:
  SourceLinkRule();
  void setLinkAttributes(AttributeList &);
  void setResult(const ElementType *, AttributeList &);
  void setUselink(const LinkSet *);
  void setPostlink(const LinkSet *);
  void setPostlinkRestore();
  void swap(SourceLinkRule &);
  const AttributeList &attributes() const;
  const ResultElementSpec &resultElementSpec() const;
  const LinkSet *uselink() const;
  const LinkSet *postlink() const;
  Boolean postlinkRestore() const;
private:
  const LinkSet *uselink_;
  const LinkSet *postlink_;
  Boolean postlinkRestore_;
  AttributeList linkAttributes_;
  ResultElementSpec resultElementSpec_;
};

class SP_API SourceLinkRuleResource : public Resource, public SourceLinkRule {
public:
  SourceLinkRuleResource();
  inline ~SourceLinkRuleResource() {}
};

class SP_API LinkSet : public Named {
public:
  LinkSet(const StringC &, const Dtd *);
  virtual ~LinkSet();
  void setDefined();
  Boolean defined() const;
  void addImplied(const ElementType *, AttributeList &);
  size_t nLinkRules(const ElementType *) const;
  const SourceLinkRule &linkRule(const ElementType *, size_t) const;
  void addLinkRule(const ElementType *,
		   const ConstPtr<SourceLinkRuleResource> &);
  size_t nImpliedLinkRules() const;
  const ResultElementSpec &impliedLinkRule(size_t) const;
  Boolean impliedResultAttributes(const ElementType *,
				  const AttributeList *&);
private:
  LinkSet(const LinkSet &);	// undefined
  void operator=(const LinkSet &); // undefined
  Boolean defined_;
  // indexed by typeIndex of source elements
  Vector<Vector<ConstPtr<SourceLinkRuleResource> > > 
    linkRules_;
  Vector<ResultElementSpec> impliedSourceLinkRules_;
};

class SP_API IdLinkRule : public SourceLinkRule {
public:
  IdLinkRule();
  Boolean isAssociatedWith(const ElementType *) const;
  void setAssocElementTypes(Vector<const ElementType *> &);
  void swap(IdLinkRule &);
private:
  Vector<const ElementType *> assocElementTypes_;
};

// A collection of link rules in a ID link set that are
// assocated with the same name (unique identifier).

class SP_API IdLinkRuleGroup : public Named {
public:
  IdLinkRuleGroup(const StringC &);
  size_t nLinkRules() const;
  const IdLinkRule &linkRule(size_t) const;
  void addLinkRule(IdLinkRule &);
private:
  IdLinkRuleGroup(const IdLinkRuleGroup &); // undefined
  void operator=(const IdLinkRuleGroup &);  // undefined
  Vector<IdLinkRule> linkRules_;
};

// An implicit or explicit LPD.

class SP_API ComplexLpd : public Lpd {
public:
  typedef ConstNamedTableIter<LinkSet> ConstLinkSetIter;
  ComplexLpd(const StringC &, Type,
	     const Location &,
	     const Syntax &syntax,
	     const Ptr<Dtd> &sourceDtd,
	     const Ptr<Dtd> &resultDtd);
  virtual ~ComplexLpd();
  size_t allocAttributeDefinitionListIndex();
  size_t nAttributeDefinitionList() const;
  LinkSet *initialLinkSet();
  const LinkSet *initialLinkSet() const;
  const LinkSet *emptyLinkSet() const;
  const LinkSet *lookupLinkSet(const StringC &) const;
  const IdLinkRuleGroup *lookupIdLink(const StringC &) const;
  IdLinkRuleGroup *lookupCreateIdLink(const StringC &);
  void insertIdLink(IdLinkRuleGroup *);
  ConstLinkSetIter linkSetIter() const;
  Boolean hadIdLinkSet() const;
  void setHadIdLinkSet();

  LinkSet *lookupLinkSet(const StringC &);
  LinkSet *insertLinkSet(LinkSet *);
  const Ptr<Dtd> &resultDtd();
  ConstPtr<Dtd> resultDtd() const;
  const ConstPtr<AttributeDefinitionList> &
    attributeDef(const ElementType *) const;
  void setAttributeDef(const ElementType *,
		       const ConstPtr<AttributeDefinitionList> &);
private:
  ComplexLpd(const ComplexLpd &); // undefined
  void operator=(const ComplexLpd &); // undefined
  Ptr<Dtd> resultDtd_;
  Vector<ConstPtr<AttributeDefinitionList> > linkAttributeDefs_;
  NamedTable<LinkSet> linkSetTable_;
  LinkSet initialLinkSet_;
  LinkSet emptyLinkSet_;
  Boolean hadIdLinkSet_;
  NamedTable<IdLinkRuleGroup> idLinkTable_;
  size_t nAttributeDefinitionList_;
};

inline
Lpd::Type Lpd::type() const
{
  return type_;
}

inline
const Location &Lpd::location() const
{
  return location_;
}

inline
Boolean Lpd::active() const
{
  return active_;
}

inline
void Lpd::activate()
{
  active_ = 1;
}

inline
ConstPtr<Dtd> Lpd::sourceDtd() const
{
  return sourceDtd_;
}

inline
const Ptr<Dtd> &Lpd::sourceDtd()
{
  return sourceDtd_;
}

inline
const ConstPtr<StringResource<Char> > &Lpd::namePointer() const
{
  return name_;
}

inline
const StringC &Lpd::name() const
{
  return *name_;
}

inline
void SourceLinkRule::setLinkAttributes(AttributeList &attributes)
{
  attributes.swap(linkAttributes_);
}

inline
const AttributeList &SourceLinkRule::attributes() const
{
  return linkAttributes_;
}

inline
void SourceLinkRule::setResult(const ElementType *element,
			       AttributeList &attributes)
{
  resultElementSpec_.elementType = element;
  attributes.swap(resultElementSpec_.attributeList);
}

inline
const ResultElementSpec &SourceLinkRule::resultElementSpec() const
{
  return resultElementSpec_;
}

inline
void SourceLinkRule::setUselink(const LinkSet *linkSet)
{
  uselink_ = linkSet;
}

inline
void SourceLinkRule::setPostlink(const LinkSet *linkSet)
{
  postlink_ = linkSet;
}

inline
void SourceLinkRule::setPostlinkRestore()
{
  postlinkRestore_ = 1;
}

inline
const LinkSet *SourceLinkRule::uselink() const
{
  return uselink_;
}

inline
const LinkSet *SourceLinkRule::postlink() const
{
  return postlink_;
}

inline
Boolean SourceLinkRule::postlinkRestore() const
{
  return postlinkRestore_;
}

inline
Boolean LinkSet::defined() const
{
  return defined_;
}

inline
void LinkSet::setDefined()
{
  defined_ = 1;
}

inline
const SourceLinkRule &LinkSet::linkRule(const ElementType *e, size_t i) const
{
  return *linkRules_[e->index()][i];
}

inline
size_t LinkSet::nImpliedLinkRules() const
{
  return impliedSourceLinkRules_.size();
}

inline
const ResultElementSpec &LinkSet::impliedLinkRule(size_t i) const
{
  return impliedSourceLinkRules_[i];
}

inline
const Ptr<Dtd> &ComplexLpd::resultDtd()
{
  return resultDtd_;
}

inline
ConstPtr<Dtd> ComplexLpd::resultDtd() const
{
  return resultDtd_;
}

inline
LinkSet *ComplexLpd::initialLinkSet()
{
  return &initialLinkSet_;
}

inline
const LinkSet *ComplexLpd::initialLinkSet() const
{
  return &initialLinkSet_;
}

inline
const LinkSet *ComplexLpd::emptyLinkSet() const
{
  return &emptyLinkSet_;
}

inline
const LinkSet *ComplexLpd::lookupLinkSet(const StringC &name) const
{
  return linkSetTable_.lookup(name);
}

inline
LinkSet *ComplexLpd::lookupLinkSet(const StringC &name)
{
  return linkSetTable_.lookup(name);
}

inline
LinkSet *ComplexLpd::insertLinkSet(LinkSet *e)
{
  return linkSetTable_.insert(e);
}

inline
size_t ComplexLpd::nAttributeDefinitionList() const
{
  return nAttributeDefinitionList_;
}

inline
size_t ComplexLpd::allocAttributeDefinitionListIndex()
{
  return nAttributeDefinitionList_++;
}

inline
ComplexLpd::ConstLinkSetIter ComplexLpd::linkSetIter() const
{
  // Avoid use of typedef to work around MSVC 2.0 bug.
  return ConstNamedTableIter<LinkSet>(linkSetTable_);
}

inline
const ConstPtr<AttributeDefinitionList> &
ComplexLpd::attributeDef(const ElementType *e) const
{
  return linkAttributeDefs_[e->index()];
}

inline
void ComplexLpd::setAttributeDef(const ElementType *e,
				 const ConstPtr<AttributeDefinitionList> &attdef)
{
  linkAttributeDefs_[e->index()] = attdef;
}

inline
Boolean ComplexLpd::hadIdLinkSet() const
{
  return hadIdLinkSet_;
}

inline
void ComplexLpd::setHadIdLinkSet()
{
  hadIdLinkSet_ = 1;
}

inline
const IdLinkRuleGroup *ComplexLpd::lookupIdLink(const StringC &id) const
{
  return idLinkTable_.lookup(id);
}

inline
size_t IdLinkRuleGroup::nLinkRules() const
{
  return linkRules_.size();
}

inline
const IdLinkRule &IdLinkRuleGroup::linkRule(size_t i) const
{
  return linkRules_[i];
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not Lpd_INCLUDED */
