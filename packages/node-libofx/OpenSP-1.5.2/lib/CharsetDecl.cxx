// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "CharsetDecl.h"
#include "macros.h"
#include "ISet.h"
#include "constant.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

CharsetDeclRange::CharsetDeclRange()
{
}

CharsetDeclRange::~CharsetDeclRange()
{
}

CharsetDeclRange::CharsetDeclRange(WideChar descMin, Number count,
				   WideChar baseMin)
: descMin_(descMin),
  count_(count),
  type_(number),
  baseMin_(baseMin)
{
}

CharsetDeclRange::CharsetDeclRange(WideChar descMin, Number count)
: descMin_(descMin),
  count_(count),
  type_(unused)
     
{
}

CharsetDeclRange::CharsetDeclRange(WideChar descMin, Number count,
				   const StringC &str)
: descMin_(descMin),
  count_(count),
  type_(string),
  str_(str)
{
}

void CharsetDeclRange::rangeDeclared(WideChar min, Number count,
				     ISet<WideChar> &declared) const
{
  if (count > 0 && min + count > descMin_ && min < descMin_ + count_) {
    WideChar commMin = (descMin_ > min) ? descMin_ : min;
    WideChar commMax = min + ((min + count < descMin_ + count_
			       ? count
			       : descMin_ + count_ - min) - 1);
    ASSERT(commMin <= commMax);
    declared.addRange(commMin, commMax);
  }
}

void CharsetDeclRange::usedSet(ISet<Char> &set) const
{
  if (type_ != unused && count_ > 0 && descMin_ <= charMax) {
    Char max;
    if (charMax - descMin_ < count_ - 1)
      max = charMax;
    else
      max = Char(descMin_ + (count_ - 1));
    set.addRange(Char(descMin_), max);
  }
}

void CharsetDeclRange::stringToChar(const StringC &str, ISet<WideChar> &to)
     const
{
  if (type_ == string && str_ == str && count_ > 0)
    to.addRange(descMin_, descMin_ + (count_ - 1));
}

void CharsetDeclRange::numberToChar(Number n, ISet<WideChar> &to,
				    Number &count)
     const
{
  if (type_ == number && n >= baseMin_ && n - baseMin_ < count_) {
    Number thisCount = count_ - (n - baseMin_);
    if (to.isEmpty() || thisCount < count)
      count = thisCount;
    to.add(descMin_ + (n - baseMin_));
  }
}

Boolean CharsetDeclRange::getCharInfo(WideChar fromChar,
				      CharsetDeclRange::Type &type,
				      Number &n,
				      StringC &str,
				      Number &count) const
{
  if (fromChar >= descMin_ && fromChar - descMin_ < count_) {
    type = type_;
    if (type == number)
      n = baseMin_ + (fromChar - descMin_);
    else if (type == string)
      str = str_;
    count = count_ - (fromChar - descMin_);
    return 1;
  }
  else
    return 0;
}

CharsetDeclSection::CharsetDeclSection()
{
}

void CharsetDeclSection::setPublicId(const PublicId &id)
{
  baseset_ = id;
}

void CharsetDeclSection::addRange(const CharsetDeclRange &range)
{
  ranges_.push_back(range);
}

void CharsetDeclSection::rangeDeclared(WideChar min, Number count,
				       ISet<WideChar> &declared) const
{
  for (size_t i = 0; i < ranges_.size(); i++)
    ranges_[i].rangeDeclared(min, count, declared);
}

void CharsetDeclSection::usedSet(ISet<Char> &set) const
{
  for (size_t i = 0; i < ranges_.size(); i++)
    ranges_[i].usedSet(set);
}

void CharsetDeclSection::stringToChar(const StringC &str, ISet<WideChar> &to)
     const
{
  for (size_t i = 0; i < ranges_.size(); i++)
    ranges_[i].stringToChar(str, to);
}

void CharsetDeclSection::numberToChar(const PublicId *id, Number n,
				      ISet<WideChar> &to, Number &count) const
{
  PublicId::OwnerType ownerType;
  StringC seq1, seq2;
  if (id->string() == baseset_.string()
      // Assume that 2 ISO character sets are the same if
      // their designating sequences are the same.
      || (id->getOwnerType(ownerType)
	  && ownerType == PublicId::ISO
	  && baseset_.getOwnerType(ownerType)
	  && ownerType == PublicId::ISO
	  && id->getDesignatingSequence(seq1)
	  && baseset_.getDesignatingSequence(seq2)
	  && seq1 == seq2)) {
    for (size_t i = 0; i < ranges_.size(); i++)
      ranges_[i].numberToChar(n, to, count);
  }
}

Boolean CharsetDeclSection::getCharInfo(WideChar fromChar,
					const PublicId *&id,
					CharsetDeclRange::Type &type,
					Number &n,
					StringC &str,
					Number &count) const
{
  for (size_t i = 0; i < ranges_.size(); i++)
    if (ranges_[i].getCharInfo(fromChar, type, n, str, count)) {
      id = &baseset_;
      return 1;
    }
  return 0;
}

CharsetDecl::CharsetDecl()
{
}

void CharsetDecl::addSection(const PublicId &id)
{
  sections_.resize(sections_.size() + 1);
  sections_.back().setPublicId(id);
}

void CharsetDecl::swap(CharsetDecl &to)
{
  sections_.swap(to.sections_);
  declaredSet_.swap(to.declaredSet_);
}

void CharsetDecl::clear()
{
  sections_.clear();
}

void CharsetDecl::addRange(WideChar min, Number count, WideChar baseMin)
{
  if (count > 0)
    declaredSet_.addRange(min, min + (count - 1));
  CharsetDeclRange range(min, count, baseMin);
  sections_.back().addRange(range);
}

void CharsetDecl::addRange(WideChar min, Number count)
{
  if (count > 0)
    declaredSet_.addRange(min, min + (count - 1));
  CharsetDeclRange range(min, count);
  sections_.back().addRange(range);
}

void CharsetDecl::addRange(WideChar min, Number count, const StringC &str)
{
  if (count > 0)
    declaredSet_.addRange(min, min + (count - 1));
  CharsetDeclRange range(min, count, str);
  sections_.back().addRange(range);
}

void CharsetDecl::rangeDeclared(WideChar min, Number count,
				ISet<WideChar> &declared) const
{
  for (size_t i = 0; i < sections_.size(); i++)
    sections_[i].rangeDeclared(min, count, declared);
}

void CharsetDecl::usedSet(ISet<Char> &set) const
{
  for (size_t i = 0; i < sections_.size(); i++)
    sections_[i].usedSet(set);
}

Boolean CharsetDecl::getCharInfo(WideChar fromChar,
				 const PublicId *&id,
				 CharsetDeclRange::Type &type,
				 Number &n,
				 StringC &str,
				 Number &count) const
{
  for (size_t i = 0; i < sections_.size(); i++)
    if (sections_[i].getCharInfo(fromChar, id, type, n, str, count))
      return 1;
  return 0;
}

void CharsetDecl::stringToChar(const StringC &str, ISet<WideChar> &to) const
{
  for (size_t i = 0; i < sections_.size(); i++)
    sections_[i].stringToChar(str, to);
}

void CharsetDecl::numberToChar(const PublicId *id, Number n,
			       ISet<WideChar> &to, Number &count) const
{
  for (size_t i = 0; i < sections_.size(); i++)
    sections_[i].numberToChar(id, n, to, count);
}

#ifdef SP_NAMESPACE
}
#endif
