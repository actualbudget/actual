// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "types.h"
#include "macros.h"
#include "StringOf.h"
#include "Trie.h"
#include "TrieBuilder.h"
#include "Priority.h"
#include <stdlib.h>

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

Trie::~Trie()
{
  if (next_)
    delete [] next_;
}

Trie::Trie(const Trie &t)
: nCodes_(t.nCodes_),
  token_(t.token_),
  tokenLength_(t.tokenLength_),
  priority_(t.priority_),
  blank_(t.blank_)
{
  if (t.next_) {
    next_ = new Trie[nCodes_];
    for (int i = 0; i < nCodes_; i++)
      next_[i] = t.next_[i];
  }
  else
    next_ = 0;
}

Trie &Trie::operator=(const Trie &t)
{
  if (next_)
    delete [] next_;
  nCodes_ = t.nCodes_;
  token_ = t.token_;
  tokenLength_ = t.tokenLength_;
  priority_ = t.priority_;
  blank_ = t.blank_;
  if (t.next_) {
    next_ = new Trie[nCodes_];
    for (int i = 0; i < nCodes_; i++)
      next_[i] = t.next_[i];
  }
  else
    next_ = 0;
  return *this;
}

TrieBuilder::TrieBuilder(int nCodes)
: nCodes_(nCodes), root_(new Trie)
{
  root_->token_ = 0;
  root_->tokenLength_ = 0;
  root_->priority_ = Priority::data;
  root_->nCodes_ = nCodes;
}

void TrieBuilder::recognize(const String<EquivCode> &chars,
			    Token t,
			    Priority::Type priority,
			    TokenVector &ambiguities)
{
  setToken(extendTrie(root_.pointer(), chars), chars.size(), t, priority,
	   ambiguities);
}

void TrieBuilder::recognize(const String<EquivCode> &chars,
			    const String<EquivCode> &set,
			    Token t,
			    Priority::Type priority,
			    TokenVector &ambiguities)
{
  Trie *trie = extendTrie(root_.pointer(), chars);

  for (size_t i = 0; i < set.size(); i++)
    setToken(forceNext(trie, set[i]), chars.size() + 1, t, priority,
	     ambiguities);
}

void TrieBuilder::recognizeB(const String<EquivCode> &chars,
			     int bSequenceLength,
			     size_t maxBlankSequence,
			     const String<EquivCode> &blankCodes,
			     const String<EquivCode> &chars2,
			     Token token,
			     TokenVector &ambiguities)
{
  doB(extendTrie(root_.pointer(), chars),
      chars.size(),
      bSequenceLength,
      maxBlankSequence,
      blankCodes,
      chars2,
      token,
      Priority::blank(bSequenceLength),
      ambiguities);
}

void TrieBuilder::recognizeEE(EquivCode code, Token t)
{
  Trie *trie = forceNext(root_.pointer(), code);
  trie->tokenLength_ = 0;	// it has length 0 in the buffer
  trie->token_ = t;
  trie->priority_ = Priority::data;
}

void TrieBuilder::doB(Trie *trie,
		      int tokenLength,
		      int minBLength,
		      size_t maxLength,
		      const String<EquivCode> &blankCodes,
		      const String<EquivCode> &chars2,
		      Token token,
		      Priority::Type pri,
		      TokenVector &ambiguities)
{
  if (minBLength == 0 && trie->next_ == 0) {
    if (!trie->blank_) {
      BlankTrie *b = new BlankTrie;
      trie->blank_ = b;
      b->maxBlanksToScan_ = maxLength;
      b->additionalLength_ = tokenLength;
      b->codeIsBlank_.assign(nCodes_, 0);
      for (size_t i = 0; i < blankCodes.size(); i++)
	b->codeIsBlank_[blankCodes[i]] = 1;
      b->tokenLength_ = 0;
      b->token_ = 0;
      b->priority_ = Priority::data;
      b->nCodes_ = nCodes_;
    }
    else {
      // A B sequence is not allowed to be adjacent to a character
      // that can occur in a blank sequence, so maxLength will be
      // the same at a node, no matter how we got there.
      ASSERT(trie->blank_->maxBlanksToScan_ == maxLength);
      ASSERT(trie->blank_->additionalLength_ == tokenLength);
    }
    if (chars2.size() == 0)
      setToken(trie, tokenLength, token, pri, ambiguities);
    else
      setToken(extendTrie(trie->blank_.pointer(), chars2),
	       chars2.size(),
	       token,
	       pri,
	       ambiguities);
  }
  else {
    if (minBLength == 0)
      setToken(extendTrie(trie, chars2), tokenLength + chars2.size(),
	       token, pri, ambiguities);
    for (size_t i = 0; i < blankCodes.size(); i++)
      doB(forceNext(trie, blankCodes[i]),
	  tokenLength + 1,
	  minBLength == 0 ? 0 : minBLength - 1,
	  maxLength - 1,
	  blankCodes,
	  chars2,
	  token,
	  pri,
	  ambiguities);
  }
}

Trie *TrieBuilder::extendTrie(Trie *trie, const String<EquivCode> &s)
{
  for (size_t i = 0; i < s.size(); i++)
    trie = forceNext(trie, s[i]);
  return trie;
}

void TrieBuilder::setToken(Trie *trie,
			   int tokenLength,
			   Token token,
			   Priority::Type pri,
			   TokenVector &ambiguities)
{
  if (tokenLength > trie->tokenLength_
      || (tokenLength == trie->tokenLength_
	  && pri > trie->priority_)) {
    trie->tokenLength_ = tokenLength;
    trie->token_ = token;
    trie->priority_ = pri;
  }
  else if (trie->tokenLength_ == tokenLength
	   && trie->priority_ == pri
	   && trie->token_ != token
	   && trie->token_ != 0) {
    ambiguities.push_back(Token(trie->token_));
    ambiguities.push_back(token);
  }
  if (trie->hasNext()) {
    for (int i = 0; i < nCodes_; i++)
      setToken(&trie->next_[i], tokenLength, token, pri, ambiguities);
  }
}

void TrieBuilder::copyInto(Trie *into, const Trie *from, int additionalLength)
{
  if (from->token_ != 0) {
    TokenVector ambiguities;
    setToken(into, from->tokenLength_ + additionalLength, from->token_,
	     from->priority_, ambiguities);
    ASSERT(ambiguities.size() == 0);
  }
  if (from->hasNext())
    for (int i = 0; i < nCodes_; i++)
      copyInto(forceNext(into, i), &from->next_[i], additionalLength);
}

Trie *TrieBuilder::forceNext(Trie *trie, EquivCode c)
{
  if (!trie->hasNext()) {
    trie->next_ = new Trie[nCodes_];
    if (trie->blank_) {
      trie->blank_->additionalLength_ += 1;
      trie->blank_->maxBlanksToScan_ -= 1;
    }
    Owner<BlankTrie> blankOwner(trie->blank_.extract());
    const BlankTrie *b = blankOwner.pointer();
    for (int i = 0; i < nCodes_; i++) {
      Trie *p = &trie->next_[i];
      if (b && b->codeIsBlank(i))
	trie->next_[i].blank_ = (blankOwner
				 ? blankOwner.extract()
				 : new BlankTrie(*b));
      p->token_ = trie->token_;
      p->tokenLength_ = trie->tokenLength_;
      p->priority_ = trie->priority_;
      p->nCodes_ = nCodes_;
    }
    if (b)
      // -1 because 1 was added above
      copyInto(trie, b, b->additionalLength_ - 1);
  }
  return &trie->next_[c];
}

#ifdef SP_NAMESPACE
}
#endif
