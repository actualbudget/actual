// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef TrieBuilder_INCLUDED
#define TrieBuilder_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "types.h"
#include "StringOf.h"
#include "Owner.h"
#include "Trie.h"
#include "Vector.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class TrieBuilder {
public:
  typedef Vector<Token> TokenVector;
  TrieBuilder(int nCodes);
  void recognize(const String<EquivCode> &chars,
		 Token t,
		 Priority::Type pri,
		 TokenVector &ambiguities);
  void recognize(const String<EquivCode> &chars,
		 const String<EquivCode> &set,
		 Token t,
		 Priority::Type pri,
		 TokenVector &ambiguities);
  // recognize a delimiter with a blank sequence
  void recognizeB(const String<EquivCode> &chars,
		  int bSequenceLength, // >= 1
		  size_t maxBlankSequenceLength,
		  const String<EquivCode> &blankCodes,
		  const String<EquivCode> &chars2,
		  Token t,
		  TokenVector &ambiguities);
  void recognizeEE(EquivCode code, Token t);
  Trie *extractTrie() { return root_.extract(); }
private:
  TrieBuilder(const TrieBuilder &); // undefined
  void operator=(const TrieBuilder &); // undefined
  void doB(Trie *trie,
	   int tokenLength,
	   int minBLength,
	   size_t maxLength,
	   const String<EquivCode> &blankCodes,
	   const String<EquivCode> &chars2,
	   Token token,
	   Priority::Type pri,
	   TokenVector &ambiguities);
  Trie *extendTrie(Trie *, const String<EquivCode> &);
  void setToken(Trie *trie, int tokenLength, Token token, Priority::Type pri,
		TokenVector &ambiguities);

  Trie *forceNext(Trie *trie, EquivCode);
  void copyInto(Trie *, const Trie *, int);

  int nCodes_;
  Owner<Trie> root_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not TrieBuilder_INCLUDED */
