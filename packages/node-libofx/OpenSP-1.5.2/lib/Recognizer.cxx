// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "Resource.h"
#include "Trie.h"
#include "Owner.h"
#include "XcharMap.h"
#include "Recognizer.h"
#include "InputSource.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

Recognizer::Recognizer(Trie *trie, const XcharMap<EquivCode> &map)
: trie_(trie), map_(map), multicode_(0)
{
}

Recognizer::Recognizer(Trie *trie, const XcharMap<EquivCode> &map,
		       Vector<Token> &suppressTokens)
: trie_(trie), map_(map), multicode_(1)
{
  suppressTokens.swap(suppressTokens_);
}

Recognizer::~Recognizer() {}

Token Recognizer::recognize(InputSource *in, Messenger &mgr) const
{
  if (multicode_) {
    in->startToken();
    if (in->scanSuppress())
      return suppressTokens_[map_[in->tokenChar(mgr)]];
  }
  else
    in->startTokenNoMulticode();
  register const Trie *pos = trie_.pointer();
  do {
    pos = pos->next(map_[in->tokenChar(mgr)]);
  } while (pos->hasNext());
  if (!pos->blank()) {
    in->endToken(pos->tokenLength());
    return pos->token();
  }
  const BlankTrie *b = pos->blank();
  const Trie *newPos = b;
  size_t maxBlanks = b->maxBlanksToScan();
  size_t nBlanks;
  for (nBlanks = 0; nBlanks < maxBlanks; nBlanks++) {
    EquivCode code = map_[in->tokenChar(mgr)];
    if (!b->codeIsBlank(code)) {
      if (newPos->hasNext())
	newPos = newPos->next(code);
      break;
    }
  }
  while (newPos->hasNext())
    newPos = newPos->next(map_[in->tokenChar(mgr)]);
  if (newPos->token() != 0) {
    in->endToken(newPos->tokenLength() + b->additionalLength() + nBlanks);
    return newPos->token();
  }
  else {
    in->endToken(pos->tokenLength() + (pos->includeBlanks() ? nBlanks : 0));
    return pos->token();
  }
}


#ifdef SP_NAMESPACE
}
#endif
