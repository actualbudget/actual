// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include <stdlib.h>
#include "ContentToken.h"
#include "macros.h"
#include "ElementType.h"
#include "Vector.h"
#include "Dtd.h"
#include "MessageArg.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

Transition::~Transition() {}

AndModelGroup::AndModelGroup(NCVector<Owner<ContentToken> > &v,
			     ContentToken::OccurrenceIndicator oi)
: ModelGroup(v, oi)
{
}

ModelGroup::Connector AndModelGroup::connector() const
{
  return andConnector;
}

OrModelGroup::OrModelGroup(NCVector<Owner<ContentToken> > &v,
			   ContentToken::OccurrenceIndicator oi)
: ModelGroup(v, oi)
{
  setOrGroup();
}

ModelGroup::Connector OrModelGroup::connector() const
{
  return orConnector;
}


SeqModelGroup::SeqModelGroup(NCVector<Owner<ContentToken> > &v,
			     ContentToken::OccurrenceIndicator oi)
: ModelGroup(v, oi)
{
}

ModelGroup::Connector SeqModelGroup::connector() const
{
  return seqConnector;
}


ModelGroup::ModelGroup(NCVector<Owner<ContentToken> > &v,
		       OccurrenceIndicator oi)
: ContentToken(oi)
{
  members_.swap(v);
}

unsigned long ModelGroup::grpgtcnt() const
{
  unsigned long cnt = 1;
  for (size_t i = 0; i < members_.size(); i++)
    cnt += members_[i]->grpgtcnt();
  return cnt;
}

void ModelGroup::setOrGroup()
{
  for (size_t i = 0; i < members_.size(); i++)
    members_[i]->setOrGroupMember();
}

const ModelGroup *ModelGroup::asModelGroup() const
{
  return this;
}

ElementToken::ElementToken(const ElementType *element, OccurrenceIndicator oi)
: LeafContentToken(element, oi)
{
}

ContentToken::ContentToken(OccurrenceIndicator oi)
: occurrenceIndicator_(oi)
{
}

unsigned long ContentToken::grpgtcnt() const
{
  return 1;
}

void ContentToken::setOrGroupMember()
{
}

const ModelGroup *ContentToken::asModelGroup() const
{
  return 0;
}

const LeafContentToken *ContentToken::asLeafContentToken() const
{
  return 0;
}

LeafContentToken::LeafContentToken(const ElementType *element,
				   OccurrenceIndicator oi)
: element_(element), ContentToken(oi), isFinal_(0), orGroupMember_(0),
  requiredIndex_(size_t(-1))
{
}

Boolean LeafContentToken::isInitial() const
{
  return 0;
}

void LeafContentToken::setOrGroupMember()
{
  orGroupMember_ = 1;
}

const LeafContentToken *LeafContentToken::asLeafContentToken() const
{
  return this;
}

PcdataToken::PcdataToken()
: LeafContentToken(0, rep)
{
}

InitialPseudoToken::InitialPseudoToken()
: LeafContentToken(0, none)
{
}

Boolean InitialPseudoToken::isInitial() const
{
  return 1;
}

DataTagGroup::DataTagGroup(NCVector<Owner<ContentToken> > &vec,
			   OccurrenceIndicator oi)
: SeqModelGroup(vec, oi)
{
}

DataTagElementToken::DataTagElementToken(const ElementType *element,
					 Vector<Text> &templates,
					 Text &paddingTemplate)
: ElementToken(element, ContentToken::none),
  havePaddingTemplate_(1)
{
  templates.swap(templates_);
  paddingTemplate.swap(paddingTemplate_);
}

DataTagElementToken::DataTagElementToken(const ElementType *element,
					 Vector<Text> &templates)
: ElementToken(element, ContentToken::none),
  havePaddingTemplate_(0)
{
  templates.swap(templates_);
}

ContentToken::~ContentToken()
{
}

struct GroupInfo {
  unsigned nextLeafIndex;
  PackedBoolean containsPcdata;
  unsigned andStateSize;
  Vector<unsigned> nextTypeIndex;
  GroupInfo(size_t);
};


GroupInfo::GroupInfo(size_t nType)
: nextTypeIndex(nType, 0), nextLeafIndex(0), containsPcdata(0), andStateSize(0)
{
}

CompiledModelGroup::CompiledModelGroup(Owner<ModelGroup> &modelGroup)
: modelGroup_(modelGroup.extract())
{
}

void CompiledModelGroup::compile(size_t nElementTypeIndex,
				 Vector<ContentModelAmbiguity> &ambiguities,
				 Boolean &pcdataUnreachable)
{
  FirstSet first;
  LastSet last;
  GroupInfo info(nElementTypeIndex);
  modelGroup_->analyze(info, 0, 0, first, last);
  for (unsigned i = 0; i < last.size(); i++)
    last[i]->setFinal();
  andStateSize_ = info.andStateSize;
  containsPcdata_ = info.containsPcdata;
  initial_ = new InitialPseudoToken;
  LastSet initialSet(1);
  initialSet[0] = initial_.pointer();
  ContentToken::addTransitions(initialSet, first, 1, 0, 0);
  if (modelGroup_->inherentlyOptional())
    initial_->setFinal();
  pcdataUnreachable = 0;
  Vector<unsigned> minAndDepth(info.nextLeafIndex);
  Vector<size_t> elementTransition(nElementTypeIndex);
  initial_->finish(minAndDepth, elementTransition, ambiguities,
		   pcdataUnreachable);
  modelGroup_->finish(minAndDepth, elementTransition, ambiguities,
		      pcdataUnreachable);
  if (!containsPcdata_)
    pcdataUnreachable = 0;
}

void ModelGroup::finish(Vector<unsigned> &minAndDepth,
			Vector<size_t> &elementTransition,
			Vector<ContentModelAmbiguity> &ambiguities,
			Boolean &pcdataUnreachable)
{
  for (unsigned i = 0; i < nMembers(); i++)
    member(i).finish(minAndDepth, elementTransition, ambiguities,
		     pcdataUnreachable);
}

void LeafContentToken::finish(Vector<unsigned> &minAndDepthVec,
			      Vector<size_t> &elementTransitionVec,
			      Vector<ContentModelAmbiguity> &ambiguities,
			      Boolean &pcdataUnreachable)
{
  if (andInfo_) {
    andFinish(minAndDepthVec, elementTransitionVec, ambiguities,
	      pcdataUnreachable);
    return;
  }
  Vector<size_t>::iterator elementTransition = elementTransitionVec.begin();
  Vector<unsigned>::iterator minAndDepth = minAndDepthVec.begin();
  minAndDepthVec.assign(minAndDepthVec.size(), unsigned(-1));
  elementTransitionVec.assign(elementTransitionVec.size(), size_t(-1));
  pcdataTransitionType_ = 0;
  simplePcdataTransition_ = 0;
  // follow_ is in decreasing order of andDepth because of how it's
  // constructed.
  size_t n = follow_.size();
  Vector<LeafContentToken *>::iterator follow = follow_.begin();
  size_t j = 0;
  for (size_t i = 0; i < n; i++) {
    unsigned &minDepth = minAndDepth[follow[i]->index()];
    if (minDepth) {
      minDepth = 0;
      if (j != i)
	follow[j] = follow[i];
      if (i == requiredIndex_)
	requiredIndex_ = j;
      const ElementType *e = follow[i]->elementType();
      unsigned ei;
      if (e == 0) {
	if (follow[i]->andInfo_ == 0) {
	  simplePcdataTransition_ = follow[i];
	  pcdataTransitionType_ = 1;
	}
	else
	  pcdataTransitionType_ = 2;
	ei = 0;
      }
      else
	ei = e->index();
      if (elementTransition[ei] != size_t(-1)) {
	const LeafContentToken *prev = follow[elementTransition[ei]];
	// This might not be true: consider (a & b?)*; after the
	// a there are two different ways to get to the same b,
	// with the same and depth.
	if (follow[i] != prev) {
	  ambiguities.resize(ambiguities.size() + 1);
	  ContentModelAmbiguity &a = ambiguities.back();
	  a.from = this;
	  a.to1 = prev;
	  a.to2 = follow[i];
	  a.andDepth = 0;
	}
      }
      elementTransition[ei] = j;
      j++;
    }
  }
  if (pcdataTransitionType_ == 0)
    pcdataUnreachable = 1;
  follow_.resize(j);
}

void LeafContentToken::andFinish(Vector<unsigned> &minAndDepthVec,
				 Vector<size_t> &elementTransitionVec,
				 Vector<ContentModelAmbiguity> &ambiguities,
				 Boolean &pcdataUnreachable)
{
  // Vector mapping element type index to index of leaf content token
  // of that type to which there is a transition, which is the "worst"
  // from the point of view of ambiguity.
  Vector<size_t>::iterator elementTransition = elementTransitionVec.begin();
  // Vector mapping index of leaf content token
  // to minimum AND depth of transition to that token.
  Vector<unsigned>::iterator minAndDepth = minAndDepthVec.begin();
  minAndDepthVec.assign(minAndDepthVec.size(), unsigned(-1));
  elementTransitionVec.assign(elementTransitionVec.size(), size_t(-1));
  pcdataTransitionType_ = 0;
  simplePcdataTransition_ = 0;
  unsigned pcdataMinCovered = 0;
  
  // follow_ is in decreasing order of andDepth because of how it's
  // constructed.
  size_t n = follow_.size();
  size_t j = 0;
  Vector<Transition>::iterator andFollow = andInfo_->follow.begin();
  for (size_t i = 0; i < n; i++) {
    unsigned &minDepth = minAndDepth[follow_[i]->index()];
    // ignore transitions to the same token with the same and depth.
    if (andFollow[i].andDepth < minDepth) {
      minDepth = andFollow[i].andDepth;
      if (j != i) {
	follow_[j] = follow_[i];
	andFollow[j] = andFollow[i];
      }
      if (i == requiredIndex_)
	requiredIndex_ = j;
      const ElementType *e = follow_[i]->elementType();
      unsigned ei;
      if (e == 0) {
	if (pcdataTransitionType_ == 0) {
	  const AndModelGroup *andAncestor = andInfo_->andAncestor;
	  unsigned groupIndex = andInfo_->andGroupIndex;
	  do {
	    Boolean hasNonNull = 0;
	    for (unsigned k = 0; k < andAncestor->nMembers(); k++)
	      if (k != groupIndex
		  && !andAncestor->member(k).inherentlyOptional()) {
		hasNonNull = 1;
		break;
	      }
	    if (hasNonNull) {
	      if (minDepth <= andAncestor->andDepth())
		pcdataUnreachable = 1;
	      break;
	    }
	    groupIndex = andAncestor->andGroupIndex();
	    andAncestor = andAncestor->andAncestor();
	  } while (andAncestor);
	  if (andFollow[i].isolated)
	    pcdataMinCovered = minDepth;
	  pcdataTransitionType_ = 2;
	}
	else {
	  if (pcdataMinCovered > minDepth + 1)
	    pcdataUnreachable = 1;
	  pcdataMinCovered = andFollow[i].isolated ? minDepth : 0;
	}
	ei = 0;
      }
      else
	ei = e->index();
      // If we have transitions t1, t2, ... tN to tokens having
      // the same element type, with
      // and-depths d1, d2, ... dN, where d1 >= d2 >= ... >= dN,
      // then there is an ambiguity unless
      // d1 > d2 > ... > dN and t1, t2, ... , tN-1 are all isolated.
      size_t previ = elementTransition[ei];
      if (previ != size_t(-1)) {
	const LeafContentToken *prev = follow_[previ];
	// This might not be true: consider (a & b?)*; after the
	// a there are two different ways to get to the same b,
	// with the same and depth.
	if (follow_[i] != prev
	    && (andFollow[previ].andDepth == andFollow[i].andDepth
		|| !andFollow[previ].isolated)) {
	  ambiguities.resize(ambiguities.size() + 1);
	  ContentModelAmbiguity &a = ambiguities.back();
	  a.from = this;
	  a.to1 = prev;
	  a.to2 = follow_[i];
	  a.andDepth = andFollow[i].andDepth;
	}
	if (andFollow[previ].isolated)
	  elementTransition[ei] = j;
      }
      else
	elementTransition[ei] = j;
      j++;
    }
  }
  if (pcdataMinCovered > 0 || pcdataTransitionType_ == 0)
    pcdataUnreachable = 1;
  follow_.resize(j);
  andInfo_->follow.resize(j);
}

void ContentToken::analyze(GroupInfo &info,
			   const AndModelGroup *andAncestor,
			   unsigned andGroupIndex,
			   FirstSet &first,
			   LastSet &last)
{
  analyze1(info, andAncestor, andGroupIndex, first, last);
  if (occurrenceIndicator_ & opt)
    inherentlyOptional_ = 1;
  if (inherentlyOptional_)
    first.setNotRequired();
  if (occurrenceIndicator_ & plus)
    addTransitions(last, first, 0,
		   andIndex(andAncestor), andDepth(andAncestor));
}

void LeafContentToken::analyze1(GroupInfo &info,
				const AndModelGroup *andAncestor,
				unsigned andGroupIndex,
				FirstSet &first,
				LastSet &last)
{
  leafIndex_ = info.nextLeafIndex++;
  typeIndex_ = info.nextTypeIndex[element_ ? element_->index() : 0]++;
  if (andAncestor) {
    andInfo_ = new AndInfo;
    andInfo_->andAncestor = andAncestor;
    andInfo_->andGroupIndex = andGroupIndex;
  }
  first.init(this);
  last.assign(1, this);
  inherentlyOptional_ = 0;
}

void PcdataToken::analyze1(GroupInfo &info,
			   const AndModelGroup *andAncestor,
			   unsigned andGroupIndex,
			   FirstSet &first,
			   LastSet &last)
{
  info.containsPcdata = 1;
  LeafContentToken::analyze1(info, andAncestor, andGroupIndex, first, last);
}

void OrModelGroup::analyze1(GroupInfo &info,
			    const AndModelGroup *andAncestor,
			    unsigned andGroupIndex,
			    FirstSet &first,
			    LastSet &last)
{
  member(0).analyze(info, andAncestor, andGroupIndex, first, last);
  first.setNotRequired();
  inherentlyOptional_ = member(0).inherentlyOptional();
  for (unsigned i = 1; i < nMembers(); i++) {
    FirstSet tempFirst;
    LastSet tempLast;
    member(i).analyze(info, andAncestor, andGroupIndex, tempFirst, tempLast);
    first.append(tempFirst);
    first.setNotRequired();
    last.append(tempLast);
    inherentlyOptional_ |= member(i).inherentlyOptional();
  }
}

void SeqModelGroup::analyze1(GroupInfo &info,
			     const AndModelGroup *andAncestor,
			     unsigned andGroupIndex,
			     FirstSet &first,
			     LastSet &last)
{
  member(0).analyze(info, andAncestor, andGroupIndex, first, last);
  inherentlyOptional_ = member(0).inherentlyOptional();
  for (unsigned i = 1; i < nMembers(); i++) {
    FirstSet tempFirst;
    LastSet tempLast;
    member(i).analyze(info, andAncestor, andGroupIndex, tempFirst, tempLast);
    addTransitions(last, tempFirst, 1,
		   andIndex(andAncestor), andDepth(andAncestor));
    if (inherentlyOptional_)
      first.append(tempFirst);
    if (member(i).inherentlyOptional())
      last.append(tempLast);
    else
      tempLast.swap(last);
    inherentlyOptional_ &= member(i).inherentlyOptional();
  }
}

void AndModelGroup::analyze1(GroupInfo &info,
			     const AndModelGroup *andAncestor,
			     unsigned andGroupIndex,
			     FirstSet &first,
			     LastSet &last)
{
  andDepth_ = ContentToken::andDepth(andAncestor);
  andIndex_ = ContentToken::andIndex(andAncestor);
  andAncestor_ = andAncestor;
  andGroupIndex_ = andGroupIndex;
  if (andIndex_ + nMembers() > info.andStateSize)
    info.andStateSize = andIndex_ + nMembers();
  Vector<FirstSet> firstVec(nMembers());
  Vector<LastSet> lastVec(nMembers());
  member(0).analyze(info, this, 0, firstVec[0], lastVec[0]);
  first = firstVec[0];
  first.setNotRequired();
  last = lastVec[0];
  inherentlyOptional_ = member(0).inherentlyOptional();
  unsigned i;
  for (i = 1; i < nMembers(); i++) {
    member(i).analyze(info, this, i, firstVec[i], lastVec[i]);
    first.append(firstVec[i]);
    first.setNotRequired();
    last.append(lastVec[i]);
    inherentlyOptional_ &= member(i).inherentlyOptional();
  }
  for (i = 0; i < nMembers(); i++) {
    for (unsigned j = 0; j < nMembers(); j++)
      if (j != i)
	addTransitions(lastVec[i], firstVec[j], 0,
		       andIndex() + nMembers(),
		       andDepth() + 1,
		       !member(j).inherentlyOptional(),
		       andIndex() + j, andIndex() + i);
  }
}

void ContentToken::addTransitions(const LastSet &from,
				  const FirstSet &to,
				  Boolean maybeRequired,
				  unsigned andClearIndex,
				  unsigned andDepth,
				  Boolean isolated,
				  unsigned requireClear,
				  unsigned toSet)
{
  size_t length = from.size();
  for (unsigned i = 0; i < length; i++)
    from[i]->addTransitions(to,
			    maybeRequired,
			    andClearIndex,
			    andDepth,
			    isolated,
			    requireClear,
			    toSet);
}

void LeafContentToken::addTransitions(const FirstSet &to,
				      Boolean maybeRequired,
				      unsigned andClearIndex,
				      unsigned andDepth,
				      Boolean isolated,
				      unsigned requireClear,
				      unsigned toSet)
{
  if (maybeRequired && to.requiredIndex() != size_t(-1)) {
    ASSERT(requiredIndex_ == size_t(-1));
    requiredIndex_ = to.requiredIndex() + follow_.size();
  }
  size_t length = follow_.size();
  size_t n = to.size();
  follow_.resize(length + n);
  for (size_t i = 0; i < n; i++)
    follow_[length + i] = to.token(i);
  if (andInfo_) {
    andInfo_->follow.resize(length + n);
    for (size_t i = 0; i < n; i++) {
      Transition &t = andInfo_->follow[length + i];
      t.clearAndStateStartIndex = andClearIndex;
      t.andDepth = andDepth;
      t.isolated = isolated;
      t.requireClear = requireClear;
      t.toSet = toSet;
    }
  }
}

AndState::AndState(unsigned n)
: v_(n, PackedBoolean(0)), clearFrom_(0)
{
}

void AndState::clearFrom1(unsigned i)
{
  while (clearFrom_ > i)
    v_[--clearFrom_] = 0;
}

MatchState::MatchState()
: andState_(0)
{
}

MatchState::MatchState(const CompiledModelGroup *model)
: pos_(model ? model->initial() : 0),
  andState_(model ? model->andStateSize() : 0),
  minAndDepth_(0)
{
}

const LeafContentToken *MatchState::invalidExclusion(const ElementType *e)
     const
{
  const LeafContentToken *token = pos_->transitionToken(e, andState_,
							minAndDepth_);
  if (token && !token->inherentlyOptional() && !token->orGroupMember())
    return token;
  else
    return 0;
}

Boolean MatchState::operator==(const MatchState &state) const
{
  return (pos_ == state.pos_ && andState_ == state.andState_
	  && minAndDepth_ == state.minAndDepth_);
}

Boolean AndState::operator==(const AndState &state) const
{
  ASSERT(v_.size() == state.v_.size());
  for (size_t i = 0; i < v_.size(); i++) {
    if (i >= clearFrom_ && i >= state.clearFrom_)
      break;
    if (v_[i] != state.v_[i])
      return 0;
  }
  return 1;
}

const LeafContentToken *
LeafContentToken::transitionToken(const ElementType *to,
				  const AndState &andState,
				  unsigned minAndDepth) const
{
  Vector<LeafContentToken *>::const_iterator p = follow_.begin();
  if (!andInfo_) {
    for (size_t n = follow_.size(); n > 0; n--, p++)
      if ((*p)->elementType() == to)
	return *p;
  }
  else {
    Vector<Transition>::const_iterator q = andInfo_->follow.begin();
    for (size_t n = follow_.size(); n > 0; n--, p++, q++)
      if ((*p)->elementType() == to
	  && ((q->requireClear == unsigned(Transition::invalidIndex)
	       || andState.isClear(q->requireClear))
	      && q->andDepth >= minAndDepth))
	return (*p);
  }
  return 0;
}

Boolean
LeafContentToken::tryTransition(const ElementType *to,
				AndState &andState,
				unsigned &minAndDepth,
				const LeafContentToken *&newpos) const
{
  Vector<LeafContentToken *>::const_iterator p = follow_.begin();
  if (!andInfo_) {
    for (size_t n = follow_.size(); n > 0; n--, p++) {
      if ((*p)->elementType() == to) {
	newpos = *p;
	minAndDepth = newpos->computeMinAndDepth(andState);
	return 1;
      }
    }
  }
  else {
    Vector<Transition>::const_iterator q = andInfo_->follow.begin();
    for (size_t n = follow_.size(); n > 0; n--, p++, q++) {
    if ((*p)->elementType() == to
	&& ((q->requireClear == unsigned(Transition::invalidIndex)
	     || andState.isClear(q->requireClear))
	    && q->andDepth >= minAndDepth)) {
	if (q->toSet != unsigned(Transition::invalidIndex))
	  andState.set(q->toSet);
	andState.clearFrom(q->clearAndStateStartIndex);
	newpos = *p;
	minAndDepth = newpos->computeMinAndDepth(andState);
	return 1;
      }
    }
  }
  return 0;
}

void
LeafContentToken::possibleTransitions(const AndState &andState,
				      unsigned minAndDepth,
				      Vector<const ElementType *> &v) const
{
  Vector<LeafContentToken *>::const_iterator p = follow_.begin();
  if (!andInfo_) {
    for (size_t n = follow_.size(); n > 0; n--, p++) 
      v.push_back((*p)->elementType());
  }
  else {
    Vector<Transition>::const_iterator q = andInfo_->follow.begin();
    for (size_t n = follow_.size(); n > 0; n--, p++, q++)
      if ((q->requireClear == unsigned(Transition::invalidIndex)
	   || andState.isClear(q->requireClear))
	&& q->andDepth >= minAndDepth)
	v.push_back((*p)->elementType());
  }
}

unsigned LeafContentToken::computeMinAndDepth1(const AndState &andState) const
{
  ASSERT(andInfo_ != 0);
  unsigned groupIndex = andInfo_->andGroupIndex;
  for (const AndModelGroup *group = andInfo_->andAncestor;
       group;
       groupIndex = group->andGroupIndex(), group = group->andAncestor())
    for (unsigned i = 0; i < group->nMembers(); i++)
      if (i != groupIndex && !group->member(i).inherentlyOptional()
	  && andState.isClear(group->andIndex() + i))
	return group->andDepth() + 1;
  return 0;
}

const LeafContentToken *
LeafContentToken::impliedStartTag(const AndState &andState,
				  unsigned minAndDepth) const
{
  if (requiredIndex_ != size_t(-1)) {
    if (!andInfo_)
      return follow_[requiredIndex_];
    const Transition &t = andInfo_->follow[requiredIndex_];
    if ((t.requireClear == unsigned(Transition::invalidIndex)
	 || andState.isClear(t.requireClear))
	&& t.andDepth >= minAndDepth)
      return follow_[requiredIndex_];
  }
  return 0;
}

void LeafContentToken::doRequiredTransition(AndState &andState,
					    unsigned &minAndDepth,
					    const LeafContentToken *&newpos)
     const
{
  ASSERT(requiredIndex_ != size_t(-1));
  if (andInfo_) {
    const Transition &t = andInfo_->follow[requiredIndex_];
    if (t.toSet != unsigned(Transition::invalidIndex))
      andState.set(t.toSet);
    andState.clearFrom(t.clearAndStateStartIndex);
  }
  newpos = follow_[requiredIndex_];
  minAndDepth = newpos->computeMinAndDepth(andState);
}

FirstSet::FirstSet()
: requiredIndex_(size_t(-1))
{
}

void FirstSet::init(LeafContentToken *p)
{
  v_.assign(1, p);
  v_.reserve(256);
  requiredIndex_ = 0;
}

void FirstSet::append(const FirstSet &set)
{
  if (set.requiredIndex_ != size_t(-1)) {
    ASSERT(requiredIndex_ == size_t(-1));
    requiredIndex_ = set.requiredIndex_ + v_.size();
  }
  size_t oldSize = v_.size();
  v_.resize(v_.size() + set.v_.size());
  for (size_t i = 0; i < set.v_.size(); i++)
    v_[oldSize + i] = set.v_[i];
}

void LastSet::append(const LastSet &set)
{
  size_t oldSize = size();
  resize(size() + set.size());
  for (size_t i = 0; i < set.size(); i++)
    (*this)[oldSize + i] = set[i];
}

#ifdef SP_NAMESPACE
}
#endif
