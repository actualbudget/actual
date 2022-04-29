// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "Location.h"
#include "Entity.h"
#include "Mutex.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class InputSourceOriginImpl : public EntityOrigin {
public:
  InputSourceOriginImpl();
  InputSourceOriginImpl(const Location &refLocation);
  const Location &parent() const;
  const ExternalInfo *externalInfo() const;
  Offset startOffset(Index ind) const;
  void noteCharRef(Index replacementIndex, const NamedCharRef &);
  Boolean isNamedCharRef(Index ind, NamedCharRef &ref) const;
  void setExternalInfo(ExternalInfo *);
  virtual InputSourceOrigin *copy() const;
  const InputSourceOrigin *asInputSourceOrigin() const;
private:
  InputSourceOriginImpl(const InputSourceOriginImpl &); // undefined
  void operator=(const InputSourceOriginImpl &);	// undefined
  size_t nPrecedingCharRefs(Index ind) const;
  Vector<InputSourceOriginNamedCharRef> charRefs_;
  StringC charRefOrigNames_;
  Owner<ExternalInfo> externalInfo_; // 0 for internal entities
  Location refLocation_;	// where referenced from
  Mutex mutex_;
};

InputSourceOrigin::~InputSourceOrigin() {}

class EntityOriginImpl : public InputSourceOriginImpl {
public:
  void *operator new(size_t sz, Allocator &alloc) {
    return alloc.alloc(sz);
  }
  void *operator new(size_t sz) {
    return Allocator::allocSimple(sz);
  }
  void operator delete(void *p) {
    Allocator::free(p);
  }
#ifdef SP_HAVE_PLACEMENT_OPERATOR_DELETE
  void operator delete(void *p, Allocator &) { Allocator::free(p); }
#endif
  EntityOriginImpl(const ConstPtr<Entity> &);
  EntityOriginImpl(const ConstPtr<Entity> &,
		   const Location &refLocation);
  EntityOriginImpl(const ConstPtr<Entity> &,
		   const Location &refLocation, Index refLength,
		   Owner<Markup> &markup);
  ~EntityOriginImpl();
  InputSourceOrigin *copy() const;
  const Entity *entity() const { return entity_.pointer(); }
  const EntityDecl *entityDecl() const;
  const EntityOrigin *asEntityOrigin() const;
  Boolean defLocation(Offset off, const Origin *&, Index &) const;
  Index refLength() const;
  const Markup *markup() const;
private:
  EntityOriginImpl(const EntityOriginImpl &); // undefined
  void operator=(const EntityOriginImpl &);	// undefined
  ConstPtr<Entity> entity_;	// 0 for document entity
  // total length of reference
  // (characters that were replaced by the entity)
  Index refLength_;
  Owner<Markup> markup_;
};

const size_t EntityOrigin::allocSize = sizeof(EntityOriginImpl);

Location::Location()
{
}

Location::Location(const Location& x)
: origin_(x.origin_), index_(x.index_)
{
}

Location::Location(Origin *origin, Index i)
: origin_(origin), index_(i)
{
}

Location::Location(ConstPtr<Origin> origin, Index i)
: origin_(origin), index_(i)
{
}

Origin::~Origin()
{
}

const EntityOrigin *Origin::asEntityOrigin() const
{
  return 0;
}

const InputSourceOrigin *Origin::asInputSourceOrigin() const
{
  return 0;
}

Index Origin::refLength() const
{
  return 0;
}

Boolean Origin::origChars(const Char *&) const
{
  return 0;
}

Boolean Origin::inBracketedTextOpenDelim() const
{
  return 0;
}

Boolean Origin::inBracketedTextCloseDelim() const
{
  return 0;
}

Boolean Origin::isNumericCharRef(const Markup *&) const
{
  return 0;
}

Boolean Origin::isNamedCharRef(Index, NamedCharRef &) const
{
  return 0;
}

const EntityDecl *Origin::entityDecl() const
{
  return 0;
}

const Markup *Origin::markup() const
{
  return 0;
}
  
const Entity *Origin::entity() const
{
  return 0;
}

Boolean Origin::defLocation(Offset, const Origin *&, Index &) const
{
  return 0;
}

const ExternalInfo *Origin::externalInfo() const
{
  return 0;
}

Offset Origin::startOffset(Index ind) const
{
  return ind;
}

const StringC *Origin::entityName() const
{
  const EntityDecl *ent = entityDecl();
  if (ent)
    return &ent->name();
  else
    return 0;
}

BracketOrigin::BracketOrigin(const Location &loc, Position pos)
: loc_(loc), pos_(pos)
{
}

const Location &BracketOrigin::parent() const
{
  return loc_;
}

Boolean BracketOrigin::inBracketedTextOpenDelim() const
{
  return pos_ == open;
}

Boolean BracketOrigin::inBracketedTextCloseDelim() const
{
  return pos_ == close;
}

InputSourceOrigin *InputSourceOrigin::make()
{
  return new InputSourceOriginImpl;
}

InputSourceOrigin *InputSourceOrigin::make(const Location &refLocation)
{
  return new InputSourceOriginImpl(refLocation);
}

InputSourceOriginImpl::InputSourceOriginImpl()
{
}

InputSourceOriginImpl::InputSourceOriginImpl(const Location &refLocation)
: refLocation_(refLocation)
{
}

const InputSourceOrigin *InputSourceOriginImpl::asInputSourceOrigin() const
{
  return this;
}

const ExternalInfo *InputSourceOriginImpl::externalInfo() const
{
  return externalInfo_.pointer();
}

InputSourceOrigin *InputSourceOriginImpl::copy() const
{
  return new InputSourceOriginImpl(refLocation_);
}

const Location &InputSourceOriginImpl::parent() const
{
  return refLocation_;
}

void InputSourceOriginImpl::setExternalInfo(ExternalInfo *info)
{
  externalInfo_ = info;
}

void InputSourceOriginImpl::noteCharRef(Index replacementIndex,
					const NamedCharRef &ref)
{
  Mutex::Lock lock(&mutex_);
  charRefs_.resize(charRefs_.size() + 1);
  charRefs_.back().replacementIndex = replacementIndex;
  charRefs_.back().refStartIndex = ref.refStartIndex();
  charRefs_.back().refEndType = ref.refEndType();
  charRefs_.back().origNameOffset = charRefOrigNames_.size();
  charRefOrigNames_ += ref.origName();
}

// Number of character references whose replacement index < ind.

size_t InputSourceOriginImpl::nPrecedingCharRefs(Index ind) const
{
  size_t i;
  // Find i such that
  // charRefs_[I].replacementIndex >= ind
  // charRefs_[i - 1].replacementIndex < ind
  if (charRefs_.size() == 0
      || ind > charRefs_.back().replacementIndex)
    // This will be a common case, so optimize it.
    i = charRefs_.size();
  else {
    // Binary search
    // Invariant:
    // charRefs_ < i have replacementIndex < ind
    // charRefs_ >= lim have replacementIndex >= ind
    i = 0;
    size_t lim = charRefs_.size();
    while (i < lim) {
      size_t mid = i + (lim - i)/2;
      if (charRefs_[mid].replacementIndex >= ind)
	lim = mid;
      else
	i = mid + 1;
    }
  }
  return i;
}

Offset InputSourceOriginImpl::startOffset(Index ind) const
{
  Mutex::Lock lock(&((InputSourceOriginImpl *)this)->mutex_);
  size_t n = nPrecedingCharRefs(ind);
  if (n < charRefs_.size()
      && ind == charRefs_[n].replacementIndex) {
    for (;;) {
      ind = charRefs_[n].refStartIndex;
      if (n == 0 || charRefs_[n - 1].replacementIndex != ind)
	break;
      --n;
    }
  }
  // charRefs[n - 1].replacementIndex < ind
  return Offset(ind - n);
}

Boolean InputSourceOriginImpl::isNamedCharRef(Index ind, NamedCharRef &ref) const
{
  Mutex::Lock lock(&((InputSourceOriginImpl *)this)->mutex_);
  size_t n = nPrecedingCharRefs(ind);
  if (n < charRefs_.size() && ind == charRefs_[n].replacementIndex) {
    ref.set(charRefs_[n].refStartIndex,
	    charRefs_[n].refEndType,
	    charRefOrigNames_.data() + charRefs_[n].origNameOffset,
	    (n + 1 < charRefs_.size()
	     ? charRefs_[n + 1].origNameOffset
	     : charRefOrigNames_.size())
	    - charRefs_[n].origNameOffset);
    return 1;
  }
  return 0;
}

EntityOrigin::~EntityOrigin() {}

EntityOrigin *EntityOrigin::make(Allocator &alloc,
				 const ConstPtr<Entity> &entity)
{
  return new (alloc) EntityOriginImpl(entity);
}

EntityOrigin *EntityOrigin::make(Allocator &alloc,
				 const ConstPtr<Entity> &entity,
				 const Location &refLocation)
{
  return new (alloc) EntityOriginImpl(entity, refLocation);
}

EntityOrigin *EntityOrigin::make(Allocator &alloc,
				 const ConstPtr<Entity> &entity,
				 const Location &refLocation,
				 Index refLength,
				 Owner<Markup> &markup)
{
  return new (alloc) EntityOriginImpl(entity, refLocation, refLength, markup);
}

EntityOrigin *EntityOrigin::make(const ConstPtr<Entity> &entity,
				 const Location &refLocation,
				 Index refLength,
				 Owner<Markup> &markup)
{
  return new EntityOriginImpl(entity, refLocation, refLength, markup);
}

EntityOrigin *EntityOrigin::make(const ConstPtr<Entity> &entity,
				 const Location &refLocation)
{
  return new EntityOriginImpl(entity, refLocation);
}

EntityOriginImpl::EntityOriginImpl(const ConstPtr<Entity> &entity)
: refLength_(0), entity_(entity)
{
}

EntityOriginImpl::EntityOriginImpl(const ConstPtr<Entity> &entity,
				   const Location &refLocation)
: InputSourceOriginImpl(refLocation), refLength_(0), entity_(entity)
{
}

EntityOriginImpl::EntityOriginImpl(const ConstPtr<Entity> &entity,
				   const Location &refLocation,
				   Index refLength,
				   Owner<Markup> &markup)
: InputSourceOriginImpl(refLocation), refLength_(refLength), entity_(entity)
{
  markup.swap(markup_);
}

EntityOriginImpl::~EntityOriginImpl()
{
}

InputSourceOrigin *EntityOriginImpl::copy() const
{
  Owner<Markup> m;
  if (markup_)
    m = new Markup(*markup_);
  return new EntityOriginImpl(entity_, parent(), refLength_, m);
}

Index EntityOriginImpl::refLength() const
{
  return refLength_;
}

const EntityOrigin *EntityOriginImpl::asEntityOrigin() const
{
  return this;
}

Boolean EntityOriginImpl::defLocation(Offset off, const Origin *&origin, Index &index) const
{
  if (entity_.isNull())
    return 0;
  const InternalEntity *internal = entity_->asInternalEntity();
  if (!internal)
    return 0;
  return internal->text().charLocation(off, origin, index);
}

const EntityDecl *EntityOriginImpl::entityDecl() const
{
  return entity_.pointer();
}

const Markup *EntityOriginImpl::markup() const
{
  return markup_.pointer();
}


ReplacementOrigin::ReplacementOrigin(const Location &loc, Char origChar)
: loc_(loc), origChar_(origChar)
{
}

const Location &ReplacementOrigin::parent() const
{
  return loc_;
}

Boolean ReplacementOrigin::origChars(const Char *&s) const
{
  if (loc_.origin().isNull() || !loc_.origin()->origChars(s))
    s = &origChar_;
  return 1;
}

MultiReplacementOrigin::MultiReplacementOrigin(const Location &loc,
					       StringC &origChars)
: loc_(loc)
{
  origChars.swap(origChars_);
}

const Location &MultiReplacementOrigin::parent() const
{
  return loc_;
}

Boolean MultiReplacementOrigin::origChars(const Char *&s) const
{
  if (loc_.origin().isNull() || !loc_.origin()->origChars(s))
    s = origChars_.data();
  return 1;
}

ProxyOrigin::ProxyOrigin(const Origin *origin)
: origin_(origin)
{
}
 
const EntityOrigin *ProxyOrigin::asEntityOrigin() const
{
  return origin_->asEntityOrigin();
}

const InputSourceOrigin *ProxyOrigin::asInputSourceOrigin() const
{
  return origin_->asInputSourceOrigin();
}

const Location &ProxyOrigin::parent() const
{
  return origin_->parent();
}

Index ProxyOrigin::refLength() const
{
  return origin_->refLength();
}

Boolean ProxyOrigin::origChars(const Char *&p) const
{
  return origin_->origChars(p);
}

Boolean ProxyOrigin::inBracketedTextOpenDelim() const
{
  return origin_->inBracketedTextOpenDelim();
}

Boolean ProxyOrigin::inBracketedTextCloseDelim() const
{
  return origin_->inBracketedTextCloseDelim();
}

Boolean ProxyOrigin::isNumericCharRef(const Markup *&markup) const
{
  return origin_->isNumericCharRef(markup);
}

Boolean ProxyOrigin::isNamedCharRef(Index ind, NamedCharRef &ref) const
{
  return origin_->isNamedCharRef(ind, ref);
}

const EntityDecl *ProxyOrigin::entityDecl() const
{
  return origin_->entityDecl();
}

Boolean ProxyOrigin::defLocation(Offset off, const Origin *&origin, Index &index) const
{
  return origin_->defLocation(off, origin, index);
}

const Markup *ProxyOrigin::markup() const
{
  return origin_->markup();
}

const Entity *ProxyOrigin::entity() const
{
  return origin_->entity();
}

const ExternalInfo *ProxyOrigin::externalInfo() const
{
  return origin_->externalInfo();
}

Offset ProxyOrigin::startOffset(Index ind) const
{
  return origin_->startOffset(ind);
}

ExternalInfo::~ExternalInfo()
{
}

RTTI_DEF0(ExternalInfo)

NamedCharRef::NamedCharRef()
{
}

NamedCharRef::NamedCharRef(Index refStartIndex, RefEndType refEndType,
			   const StringC &origName)
: refStartIndex_(refStartIndex),
  refEndType_(refEndType),
  origName_(origName)
{
}

void NamedCharRef::set(Index refStartIndex, RefEndType refEndType,
		       const Char *s, size_t n)
{
  refStartIndex_ = refStartIndex;
  refEndType_ = refEndType;
  origName_.assign(s, n);
}

#ifdef SP_NAMESPACE
}
#endif
