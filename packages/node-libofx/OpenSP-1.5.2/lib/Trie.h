// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef Trie_INCLUDED
#define Trie_INCLUDED 1

#include <limits.h>
#include "types.h"
#include "Boolean.h"
#include "Vector.h"
#include "CopyOwner.h"
#include "Priority.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class BlankTrie;

class Trie {
public:
  Trie() : next_(0), nCodes_(0) { }
  Trie(const Trie &);
  ~Trie();
  Trie &operator=(const Trie &);
  const Trie *next(int i) const { return &next_[i]; }
  Boolean hasNext() const { return next_ != 0; }
  Token token() const { return token_; }
  int tokenLength() const { return tokenLength_; }
  const BlankTrie *blank() const;
  Boolean includeBlanks() const {
    return Priority::isBlank(priority_);
  }
  friend class TrieBuilder;
private:
  Trie *next_;
  int nCodes_;
  unsigned short token_;
  unsigned char tokenLength_;
  Priority::Type priority_;
  CopyOwner<BlankTrie> blank_;
};

class BlankTrie : public Trie {
public:
  BlankTrie() { }
  Boolean codeIsBlank(EquivCode c) const { return codeIsBlank_[c]; }
  // maximum number of blanks to scan (minimum is 0)
  size_t maxBlanksToScan() const { return maxBlanksToScan_; }
  // length to add to tokenLengths in this trie (for those > 0).
  int additionalLength() const { return additionalLength_; }
  BlankTrie *copy() const { return new BlankTrie(*this); }
private:
  unsigned char additionalLength_;
  size_t maxBlanksToScan_;
  Vector<PackedBoolean> codeIsBlank_;
  friend class TrieBuilder;
};

inline
const BlankTrie *Trie::blank() const
{
  return blank_.pointer();
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not Trie_INCLUDED */
