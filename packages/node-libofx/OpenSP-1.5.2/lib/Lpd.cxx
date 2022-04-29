// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "Lpd.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

Lpd::Lpd(const StringC &name, Type type, const Location &location,
	 const Ptr<Dtd> &sourceDtd)
: name_(new StringResource<Char>(name)), type_(type), location_(location),
  active_(0), sourceDtd_(sourceDtd)
{
}

Lpd::~Lpd()
{
}

SimpleLpd::SimpleLpd(const StringC &name, const Location &location,
		     const Ptr<Dtd> &sourceDtd)
: Lpd(name, simpleLink, location, sourceDtd)
{
}

ResultElementSpec::ResultElementSpec()
: elementType(0)
{
}

void ResultElementSpec::swap(ResultElementSpec &to)
{
  attributeList.swap(to.attributeList);
  {
    const ElementType *tem = to.elementType;
    to.elementType = elementType;
    elementType = tem;
  }
}

SourceLinkRule::SourceLinkRule()
: uselink_(0), postlink_(0), postlinkRestore_(0)
{
}

void SourceLinkRule::swap(SourceLinkRule &to)
{
  linkAttributes_.swap(to.linkAttributes_);
  resultElementSpec_.swap(to.resultElementSpec_);
  {
    const LinkSet *tem = to.uselink_;
    to.uselink_ = uselink_;
    uselink_ = tem;
  }
  {
    const LinkSet *tem = to.postlink_;
    to.postlink_ = postlink_;
    postlink_ = tem;
  }
  {
    Boolean tem = to.postlinkRestore_;
    to.postlinkRestore_ = postlinkRestore_;
    postlinkRestore_ = tem;
  }
}

SourceLinkRuleResource::SourceLinkRuleResource()
{
}

LinkSet::LinkSet(const StringC &name, const Dtd *dtd)
: Named(name), defined_(0), linkRules_(dtd ? dtd->nElementTypeIndex() : 0)
{
}

LinkSet::~LinkSet() {}

void LinkSet::addLinkRule(const ElementType *element,
			  const ConstPtr<SourceLinkRuleResource> &rule)
{
  linkRules_[element->index()].push_back(rule);
}

void LinkSet::addImplied(const ElementType *element, AttributeList &attributes)
{
  impliedSourceLinkRules_.resize(impliedSourceLinkRules_.size() + 1);
  ResultElementSpec &result = impliedSourceLinkRules_.back();
  result.elementType = element;
  result.attributeList = attributes;
}

Boolean LinkSet::impliedResultAttributes(const ElementType *resultType,
					 const AttributeList *&attributes)
{
  for (size_t i = 0; i < impliedSourceLinkRules_.size(); i++)
    if (impliedSourceLinkRules_[i].elementType == resultType) {
      attributes = &impliedSourceLinkRules_[i].attributeList;
      return 1;
    }
  return 0;
}

size_t LinkSet::nLinkRules(const ElementType *e) const
{
  if (e->index() >= linkRules_.size())
    return 0;
  return linkRules_[e->index()].size();
}

IdLinkRule::IdLinkRule()
{
}

Boolean IdLinkRule::isAssociatedWith(const ElementType *e) const
{
  for (size_t i = 0; i < assocElementTypes_.size(); i++)
    if (assocElementTypes_[i] == e)
      return 1;
  return 0;
}

void IdLinkRule::setAssocElementTypes(Vector<const ElementType *> &v)
{
  v.swap(assocElementTypes_);
}

void IdLinkRule::swap(IdLinkRule &to)
{
  SourceLinkRule::swap(to);
  assocElementTypes_.swap(to.assocElementTypes_);
}

IdLinkRuleGroup::IdLinkRuleGroup(const StringC &name)
: Named(name)
{
}

void IdLinkRuleGroup::addLinkRule(IdLinkRule &rule)
{
  linkRules_.resize(linkRules_.size() + 1);
  rule.swap(linkRules_.back());
}

ComplexLpd::ComplexLpd(const StringC &name, Type type,
		       const Location &location,
		       const Syntax &syntax,
		       const Ptr<Dtd> &sourceDtd,
		       const Ptr<Dtd> &resultDtd)
: Lpd(name, type, location, sourceDtd), resultDtd_(resultDtd),
  hadIdLinkSet_(0), nAttributeDefinitionList_(0),
  initialLinkSet_(syntax.rniReservedName(Syntax::rINITIAL),
		  sourceDtd.pointer()),
  emptyLinkSet_(syntax.rniReservedName(Syntax::rEMPTY),
		sourceDtd.pointer()),
  linkAttributeDefs_(sourceDtd.isNull() ? 0 : sourceDtd->nElementTypeIndex())
{
}

ComplexLpd::~ComplexLpd() {}

IdLinkRuleGroup *ComplexLpd::lookupCreateIdLink(const StringC &id)
{
  IdLinkRuleGroup *group = idLinkTable_.lookup(id);
  if (!group) {
    group = new IdLinkRuleGroup(id);
    idLinkTable_.insert(group);
  }
  return group;
}



#ifdef SP_NAMESPACE
}
#endif
