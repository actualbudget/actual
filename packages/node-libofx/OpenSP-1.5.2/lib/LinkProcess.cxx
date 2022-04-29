// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "LinkProcess.h"
// ParserState is used for access to parser messages
#include "ParserState.h"
#include "MessageArg.h"
#include "ParserMessages.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

LinkProcess::LinkProcess()
{
}

void LinkProcess::init(const ConstPtr<ComplexLpd> &lpd)
{
  lpd_ = lpd;
  open_.clear();
  open_.insert(new LinkProcessOpenElement(lpd_->initialLinkSet()));
}

Boolean LinkProcess::startElement(const ElementType *element,
				  const AttributeList &attributes,
				  const Location &location,
				  Messenger &mgr,
				  const AttributeList *&linkAttributes,
				  const ResultElementSpec *&resultElementSpec)
{
  if (lpd_.isNull()) {
    linkAttributes = 0;
    resultElementSpec = 0;
    return 1;
  }
  const StringC *id = attributes.getId();
  if (id) {
    const IdLinkRuleGroup *p = lpd_->lookupIdLink(*id);
    if (p) {
      size_t selected;
      if (p->nLinkRules() > 1) {
	linkAttributes_.resize(p->nLinkRules());
	for (size_t i = 0; i < linkAttributes_.size(); i++)
	  linkAttributes_[i] = &p->linkRule(i).attributes();
	if (!selectLinkRule(linkAttributes_,
			    location,
			    selected))
	  return 0;
      }
      else
	selected = 0;
      const IdLinkRule &rule = p->linkRule(selected);
      open_.insert(new LinkProcessOpenElement(open_.head()->current,
					      rule));
      linkAttributes = &rule.attributes();
      resultElementSpec = &rule.resultElementSpec();
      if (!rule.isAssociatedWith(element)) {
	mgr.setNextLocation(location);
	mgr.message(ParserMessages::idlinkElementType,
		    StringMessageArg(element->name()),
		    StringMessageArg(*id));
      }
      return 1;
    }
  }
  const LinkSet *currentLinkSet = open_.head()->current;
  size_t nRules = currentLinkSet->nLinkRules(element);
  if (nRules > 0) {
    size_t selected;
    if (nRules > 1) {
      linkAttributes_.resize(nRules);
      for (size_t i = 0; i < nRules; i++)
	linkAttributes_[i]
	  = &currentLinkSet->linkRule(element, i).attributes();
      if (!selectLinkRule(linkAttributes_,
			  location,
			  selected))
	return 0;
    }
    else
      selected = 0;
    const SourceLinkRule &rule = currentLinkSet->linkRule(element, selected);
    open_.insert(new LinkProcessOpenElement(open_.head()->current,
					    rule));
    linkAttributes = &rule.attributes();
    resultElementSpec = &rule.resultElementSpec();
    return 1;
  }
  // FIXME construct attributes from attribute definition list
  linkAttributes = 0;
  resultElementSpec = 0;
  open_.insert(new LinkProcessOpenElement(open_.head()->current));
  return 1;
}


void LinkProcess::endElement()
{
  if (lpd_.isNull())
    return;
  LinkProcessOpenElement *top = open_.get();
  if (top->post)
    open_.head()->current = top->post;
  else if (top->postRestore)
    open_.head()->current = open_.head()->restore;
  delete top;
}

void LinkProcess::uselink(const LinkSet *linkSet,
			  Boolean restore,
			  const Lpd *lpd)
{
  if (lpd_.isNull())
    return;
  if (lpd != lpd_.pointer())
    return;
  if (restore)
    open_.head()->current = open_.head()->restore;
  else if (linkSet)
    open_.head()->current = linkSet;
}

size_t LinkProcess::nImpliedLinkRules() const
{
  if (!open_.head())
    return 0;
  return open_.head()->current->nImpliedLinkRules();
}

const ResultElementSpec &LinkProcess::impliedLinkRule(size_t i) const
{
  return open_.head()->current->impliedLinkRule(i);
}

// Usually redefined by application.

Boolean LinkProcess::selectLinkRule(const Vector<const AttributeList *> &,
				    const Location &,
				    size_t &selected)
{
  selected = 0;
  return 1;
}

void LinkProcess::clear()
{
  open_.clear();
  lpd_.clear();
  linkAttributes_.clear();
}

void LinkProcess::swap(LinkProcess &to)
{
  open_.swap(to.open_);
  lpd_.swap(to.lpd_);
  linkAttributes_.swap(to.linkAttributes_);
}

LinkProcessOpenElement::LinkProcessOpenElement(const LinkSet *cur,
					       const SourceLinkRule &rule)
{
  current = rule.uselink();
  if (!current)
    current = cur;
  restore = cur;
  post = rule.postlink();
  postRestore = rule.postlinkRestore();
}

LinkProcessOpenElement::LinkProcessOpenElement(const LinkSet *cur)
{
  restore = current = cur;
  post = 0;
  postRestore = 0;
}


#ifdef SP_NAMESPACE
}
#endif
