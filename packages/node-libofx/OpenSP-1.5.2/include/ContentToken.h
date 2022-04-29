// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef ContentToken_INCLUDED
#define ContentToken_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "Owner.h"
#include "Text.h"
#include "Vector.h"
#include "NCVector.h"
#include "Boolean.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class LeafContentToken;

struct SP_API Transition {
  ~Transition();
  enum { invalidIndex = -1 };
  // When performing this transition, reset all andState with index >= this.
  unsigned clearAndStateStartIndex;
  // This transition is possible only if all AND groups whose AND depth
  // is >= this (and contains the LeafContentToken that this transition is
  // from) have had all their non-nullable members matched.
  unsigned andDepth;
  // If this is 1, then this transition requires that the AND group
  // whose AND depth is andDepth - 1 have a non-nullable member unmatched,
  // and thus this transition is not ambiguous with a transition whose
  // AND depth is < andDepth.
  PackedBoolean isolated;
  // Index in andState that must be clear for this transition to be
  // allowed.
  unsigned requireClear;
  // Index in andState that is to be set after performing this transition.
  unsigned toSet;
};

class SP_API FirstSet {
public:
  FirstSet();
  void init(LeafContentToken *);
  void append(const FirstSet &);
  size_t size() const;
  LeafContentToken *token(size_t i) const;
  size_t requiredIndex() const;
  void setNotRequired();
private:
  Vector<LeafContentToken *> v_;
  // index of contextually required token or -1 if none
  size_t requiredIndex_;
};

class SP_API LastSet : public Vector<LeafContentToken *> {
public:
  LastSet() { }
  LastSet(size_t n) : Vector<LeafContentToken *>(n) { }
  void append(const LastSet &);
};

class ElementType;
class AndModelGroup;
struct GroupInfo;

struct SP_API ContentModelAmbiguity {
  inline ~ContentModelAmbiguity() {}
  const LeafContentToken *from;
  const LeafContentToken *to1;
  const LeafContentToken *to2;
  unsigned andDepth;
};

class ModelGroup;

class SP_API ContentToken {
public:
  enum OccurrenceIndicator { none = 0, opt = 01, plus = 02, rep = 03 };
  ContentToken(OccurrenceIndicator);
  virtual ~ContentToken();
  OccurrenceIndicator occurrenceIndicator() const;
  Boolean inherentlyOptional() const;
  static unsigned andDepth(const AndModelGroup *);
  static unsigned andIndex(const AndModelGroup *);
  void analyze(GroupInfo &, const AndModelGroup *, unsigned,
	       FirstSet &, LastSet &);
  static void addTransitions(const LastSet &from,
			     const FirstSet &to,
			     Boolean maybeRequired,
			     unsigned andClearIndex,
			     unsigned andDepth,
			     Boolean isolated = 0,
			     unsigned requireClear
			       = (unsigned)Transition::invalidIndex,
			     unsigned toSet
			       = (unsigned)Transition::invalidIndex);
  virtual void finish(Vector<unsigned> &minAndDepth,
		      Vector<size_t> &elementTransition,
		      Vector<ContentModelAmbiguity> &,
		      Boolean &pcdataUnreachable) = 0;
  virtual unsigned long grpgtcnt() const;
  virtual void setOrGroupMember();
  unsigned andGroupIndex() const;
  virtual const ModelGroup *asModelGroup() const;
  virtual const LeafContentToken *asLeafContentToken() const;
protected:
  PackedBoolean inherentlyOptional_;
private:
  ContentToken(const ContentToken &); // undefined
  void operator=(const ContentToken &);	// undefined
  virtual void analyze1(GroupInfo &, const AndModelGroup *, unsigned,
			FirstSet &, LastSet &) = 0;
  OccurrenceIndicator occurrenceIndicator_;
};

class SP_API ModelGroup : public ContentToken {
public:
  enum Connector { andConnector, orConnector, seqConnector };
  ModelGroup(NCVector<Owner<ContentToken> > &, OccurrenceIndicator);
  inline virtual ~ModelGroup() {};
  virtual Connector connector() const = 0;
  unsigned nMembers() const;
  void finish(Vector<unsigned> &minAndDepth,
	      Vector<size_t> &elementTransition,
	      Vector<ContentModelAmbiguity> &,
	      Boolean &pcdataUnreachable);
  ContentToken &member(unsigned i);
  const ContentToken &member(unsigned i) const;
  unsigned long grpgtcnt() const;
  const ModelGroup *asModelGroup() const;
protected:
  void setOrGroup();
private:
  ModelGroup(const ModelGroup &); // undefined
  void operator=(const ModelGroup &); // undefined
  NCVector<Owner<ContentToken> > members_;
};

class AndModelGroup : public ModelGroup {
public:
  AndModelGroup(NCVector<Owner<ContentToken> > &, OccurrenceIndicator);
  Connector connector() const;
  unsigned andDepth() const;
  unsigned andIndex() const;
  unsigned andGroupIndex() const;
  const AndModelGroup *andAncestor() const;
private:
  AndModelGroup(const AndModelGroup &);	// undefined
  void operator=(const AndModelGroup &); // undefined
  unsigned andDepth_;		// number of and groups that contain this
  unsigned andIndex_;
  unsigned andGroupIndex_;
  const AndModelGroup *andAncestor_;
  void analyze1(GroupInfo &, const AndModelGroup *, unsigned,
		FirstSet &, LastSet &);
};

class OrModelGroup : public ModelGroup {
public:
  OrModelGroup(NCVector<Owner<ContentToken> > &, OccurrenceIndicator);
  Connector connector() const;
private:
  OrModelGroup(const OrModelGroup &); // undefined
  void operator=(const OrModelGroup &);	// undefined
  void analyze1(GroupInfo &, const AndModelGroup *, unsigned,
		FirstSet &, LastSet &);
};

class SeqModelGroup : public ModelGroup {
public:
  SeqModelGroup(NCVector<Owner<ContentToken> > &, OccurrenceIndicator);
  Connector connector() const;
private:
  SeqModelGroup(const SeqModelGroup &);	// undefined
  void operator=(const SeqModelGroup &); // undefined
  void analyze1(GroupInfo &, const AndModelGroup *, unsigned,
		FirstSet &, LastSet &);
};

class AndState;

class SP_API AndInfo {
public:
  AndInfo() { }
  inline ~AndInfo() { }
  const AndModelGroup *andAncestor;
  unsigned andGroupIndex;
  Vector<Transition> follow;
private:
  AndInfo(const AndInfo &);	// undefined
  void operator=(const AndInfo &); // undefined
};

// A LeafContentToken is not quite the same as a primitive content token.
// A data tag group is a primitive content token but not a LeafContentToken.

class SP_API LeafContentToken : public ContentToken {
public:
  LeafContentToken(const ElementType *, OccurrenceIndicator);
  inline virtual ~LeafContentToken() {};
  unsigned index() const;
  unsigned typeIndex() const;
  const ElementType *elementType() const;
  virtual Boolean isInitial() const;
  void addTransitions(const FirstSet &to,
		      Boolean maybeRequired,
		      unsigned andClearIndex,
		      unsigned andDepth,
		      Boolean isolated,
		      unsigned requireClear,
		      unsigned toSet);
  void setFinal();
  void finish(Vector<unsigned> &minAndDepth,
	      Vector<size_t> &elementTransition,
	      Vector<ContentModelAmbiguity> &,
	      Boolean &pcdataUnreachable);
  Boolean isFinal() const;
  Boolean tryTransition(const ElementType *, AndState &,
			unsigned &minAndDepth,
			const LeafContentToken *&newpos) const;
  Boolean tryTransitionPcdata(AndState &, unsigned &minAndDepth,
			      const LeafContentToken *&newpos) const;
  void possibleTransitions(const AndState &, unsigned minAndDepth, Vector<const ElementType *> &) const;
  const LeafContentToken *impliedStartTag(const AndState &andpos,
					  unsigned minAndDepth) const;
  const LeafContentToken *transitionToken(const ElementType *to,
					  const AndState &andState,
					  unsigned minAndDepth) const;
  void doRequiredTransition(AndState &andState,
			    unsigned &minAndDepth,
			    const LeafContentToken *&newpos) const;
  unsigned computeMinAndDepth(const AndState&) const;
  Boolean orGroupMember() const;
  void setOrGroupMember();
  const AndModelGroup *andAncestor() const;
  unsigned andDepth() const;
  const LeafContentToken *asLeafContentToken() const;
protected:
  void analyze1(GroupInfo &, const AndModelGroup *, unsigned,
		FirstSet &, LastSet &);
  const ElementType *element_;
private:
  LeafContentToken(const LeafContentToken &); // undefined
  void operator=(const LeafContentToken &);   // undefined
  void andFinish(Vector<unsigned> &minAndDepth,
		 Vector<size_t> &elementTransition,
		 Vector<ContentModelAmbiguity> &,
		 Boolean &pcdataUnreachable);
  unsigned computeMinAndDepth1(const AndState&) const;
  unsigned leafIndex_;
  unsigned typeIndex_;
  Vector<LeafContentToken *> follow_;
  PackedBoolean isFinal_;
  PackedBoolean orGroupMember_;
  // 0 none, 1 yes - simple, 2 - compled
  char pcdataTransitionType_;
  const LeafContentToken *simplePcdataTransition_;
  size_t requiredIndex_;
  Owner<AndInfo> andInfo_;
};

class PcdataToken : public LeafContentToken {
public:
  PcdataToken();
  void analyze1(GroupInfo &, const AndModelGroup *, unsigned,
		FirstSet &, LastSet &);
private:
  PcdataToken(const PcdataToken &); // undefined
  void operator=(const PcdataToken &); // undefined
};

class InitialPseudoToken : public LeafContentToken {
public:
  InitialPseudoToken();
  Boolean isInitial() const;
private:
  InitialPseudoToken(const InitialPseudoToken &); // undefined
  void operator=(const InitialPseudoToken &); // undefined
};

class ElementToken : public LeafContentToken {
public:
  ElementToken(const ElementType *, OccurrenceIndicator);
private:
  ElementToken(const ElementToken &); // undefined
  void operator=(const ElementToken &); // undefined
};

class DataTagGroup : public SeqModelGroup {
public:
  // first content token is a DataTagElementToken, second is PcdataToken
  DataTagGroup(NCVector<Owner<ContentToken> > &, OccurrenceIndicator);
private:
  DataTagGroup(const DataTagGroup &); // undefined
  void operator=(const DataTagGroup &); // undefined
};

class DataTagElementToken : public ElementToken {
public:
  DataTagElementToken(const ElementType *, Vector<Text> &templates);
  DataTagElementToken(const ElementType *, Vector<Text> &templates,
		      Text &paddingTemplate);
private:
  DataTagElementToken(const DataTagElementToken &); // undefined
  void operator=(const DataTagElementToken &); // undefined
  Vector<Text> templates_;
  Boolean havePaddingTemplate_;
  Text paddingTemplate_;
};

class SP_API CompiledModelGroup {
public:
  CompiledModelGroup(Owner<ModelGroup> &);
  inline ~CompiledModelGroup() {};
  void compile(size_t nElementTypeIndex,
	       Vector<ContentModelAmbiguity> &,
	       Boolean &pcdataUnreachable);
  CompiledModelGroup *copy() const;
  const LeafContentToken *initial() const;
  unsigned andStateSize() const;
  Boolean containsPcdata() const;
  const ModelGroup *modelGroup() const;
private:
  CompiledModelGroup(const CompiledModelGroup &); // undefined
  void operator=(const CompiledModelGroup &);	  // undefined
  Owner<ModelGroup> modelGroup_;
  Owner<LeafContentToken> initial_;
  unsigned andStateSize_;
  Boolean containsPcdata_;
};

class SP_API AndState {
public:
  AndState(unsigned);
  Boolean isClear(unsigned) const;
  void clearFrom(unsigned);
  void set(unsigned);
  Boolean operator==(const AndState &) const;
  Boolean operator!=(const AndState &) const;
private:
  void clearFrom1(unsigned);
  unsigned clearFrom_;
  Vector<PackedBoolean> v_;
};

class SP_API MatchState {
public:
  MatchState();
  MatchState(const CompiledModelGroup *); // may be 0
  Boolean tryTransition(const ElementType *);
  Boolean tryTransitionPcdata();
  void possibleTransitions(Vector<const ElementType *> &) const;
  Boolean isFinished() const;
  const LeafContentToken *impliedStartTag() const;
  const LeafContentToken *invalidExclusion(const ElementType *) const;
  void doRequiredTransition();
  const LeafContentToken *currentPosition() const;
  Boolean operator==(const MatchState &) const;
  Boolean operator!=(const MatchState &) const;
private:
  const LeafContentToken *pos_;
  AndState andState_;
  unsigned minAndDepth_;
};

inline
ContentToken::OccurrenceIndicator ContentToken::occurrenceIndicator() const
{
  return occurrenceIndicator_;
}

inline
unsigned LeafContentToken::index() const
{
  return leafIndex_;
}

inline
unsigned LeafContentToken::typeIndex() const
{
  return typeIndex_;
}

inline
Boolean ContentToken::inherentlyOptional() const
{
  return inherentlyOptional_;
}

inline
const ElementType *LeafContentToken::elementType() const
{
  return element_;
}

inline
unsigned AndModelGroup::andDepth() const
{
  return andDepth_;
}

inline
unsigned AndModelGroup::andIndex() const
{
  return andIndex_;
}

inline
unsigned ModelGroup::nMembers() const
{
  return members_.size();
}

inline
unsigned ContentToken::andDepth(const AndModelGroup *andAncestor)
{
  return andAncestor ? andAncestor->andDepth() + 1 : 0;
}

inline
unsigned ContentToken::andIndex(const AndModelGroup *andAncestor)
{
  return (andAncestor
	  ? andAncestor->andIndex() + andAncestor->nMembers()
	  : 0);
}

inline
ContentToken &ModelGroup::member(unsigned i)
{
  return *members_[i];
}

inline
const ContentToken &ModelGroup::member(unsigned i) const
{
  return *members_[i];
}

inline
void LeafContentToken::setFinal()
{
  isFinal_ = 1;
}

inline
Boolean LeafContentToken::isFinal() const
{
  return isFinal_;
}

inline
Boolean LeafContentToken::orGroupMember() const
{
  return orGroupMember_;
}

inline
unsigned CompiledModelGroup::andStateSize() const
{
  return andStateSize_;
}

inline
Boolean CompiledModelGroup::containsPcdata() const
{
  return containsPcdata_;
}

inline
const AndModelGroup *AndModelGroup::andAncestor() const
{
  return andAncestor_;
}

inline
unsigned AndModelGroup::andGroupIndex() const
{
  return andGroupIndex_;
}

inline
const LeafContentToken *CompiledModelGroup::initial() const
{
  return initial_.pointer();
}

inline
const ModelGroup *CompiledModelGroup::modelGroup() const
{
  return modelGroup_.pointer();
}

inline
const AndModelGroup *LeafContentToken::andAncestor() const
{
  return andInfo_ ? andInfo_->andAncestor : 0;
}

inline
unsigned LeafContentToken::andDepth() const
{
  return andInfo_ ? ContentToken::andDepth(andInfo_->andAncestor) : 0;
}

inline
unsigned LeafContentToken::computeMinAndDepth(const AndState &andState) const
{
  return andInfo_ ? computeMinAndDepth1(andState) : 0;
}

inline
Boolean LeafContentToken::tryTransitionPcdata(AndState &andState,
					      unsigned &minAndDepth,
					      const LeafContentToken *&newpos)
     const
{
  if (pcdataTransitionType_ == 1) {
    newpos = simplePcdataTransition_;
    return 1;
  }
  else if (pcdataTransitionType_ == 0)
    return 0;
  else
    return tryTransition(0, andState, minAndDepth, newpos);
}

inline
Boolean MatchState::tryTransition(const ElementType *to)
{
  return pos_->tryTransition(to, andState_, minAndDepth_, pos_);
}

inline
Boolean MatchState::tryTransitionPcdata()
{
  return pos_->tryTransitionPcdata(andState_, minAndDepth_, pos_);
}

inline
void MatchState::possibleTransitions(Vector<const ElementType *> &v) const
{
  pos_->possibleTransitions(andState_, minAndDepth_, v);
}

inline
Boolean MatchState::isFinished() const
{
  return pos_->isFinal() && minAndDepth_ == 0;
}

inline
const LeafContentToken *
MatchState::impliedStartTag() const
{
  return pos_->impliedStartTag(andState_, minAndDepth_);
}

inline
void MatchState::doRequiredTransition()
{
  pos_->doRequiredTransition(andState_, minAndDepth_, pos_);
}

inline
const LeafContentToken *MatchState::currentPosition() const
{
  return pos_;
}

inline
Boolean MatchState::operator!=(const MatchState &state) const
{
  return !(*this == state);
}

inline
Boolean AndState::isClear(unsigned i) const
{
  return v_[i] == 0;
}

inline
void AndState::set(unsigned i)
{
  v_[i] = 1;
  if (i >= clearFrom_)
    clearFrom_ = i + 1;
}

inline
void AndState::clearFrom(unsigned i)
{
  if (i < clearFrom_)
    clearFrom1(i);
}

inline
Boolean AndState::operator!=(const AndState &state) const
{
  return !(*this == state);
}


inline
size_t FirstSet::size() const
{
  return v_.size();
}

inline
LeafContentToken *FirstSet::token(size_t i) const
{
  return v_[i];
}

inline
size_t FirstSet::requiredIndex() const
{
  return requiredIndex_;
}

inline
void FirstSet::setNotRequired()
{
  requiredIndex_ = size_t(-1);
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not ContentToken_INCLUDED */
