// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef LinkProcess_INCLUDED
#define LinkProcess_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "Lpd.h"
#include "IList.h"
#include "Link.h"
#include "Vector.h"
#include "Vector.h"
#include "Ptr.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class Messenger;

struct SP_API LinkProcessOpenElement : public Link {
  LinkProcessOpenElement(const LinkSet *current, const SourceLinkRule &);
  LinkProcessOpenElement(const LinkSet *current);
  const LinkSet *current;
  const LinkSet *restore;
  const LinkSet *post;
  Boolean postRestore;
};

class SP_API LinkProcess {
public:
  LinkProcess();
  void init(const ConstPtr<ComplexLpd> &lpd);
  Boolean startElement(const ElementType *,
		       const AttributeList &attributes,
		       const Location &location,
		       Messenger &,
		       const AttributeList *&linkAttributes,
		       const ResultElementSpec *&resultElementSpec);
  void endElement();
  void uselink(const LinkSet *linkSet,
	       Boolean restore,
	       const Lpd *);
  virtual Boolean selectLinkRule(const Vector<const AttributeList *> &,
				 const Location &location,
				 size_t &selected);
  size_t nImpliedLinkRules() const;
  const ResultElementSpec &impliedLinkRule(size_t) const;
  const StringC &name() const;
  Boolean isExplicit() const;
  void clear();
  void swap(LinkProcess &);
private:
  LinkProcess(const LinkProcess &); // undefined
  void operator=(const LinkProcess &); // undefined

  IList<LinkProcessOpenElement> open_;
  ConstPtr<ComplexLpd> lpd_;
  Vector<ConstPtr<Lpd> > activeLpds_;
  Vector<const AttributeList *> linkAttributes_;
};

inline
const StringC &LinkProcess::name() const
{
  return lpd_->name();
}

inline
Boolean LinkProcess::isExplicit() const
{
  return lpd_->type() == Lpd::explicitLink;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not LinkProcess_INCLUDED */
