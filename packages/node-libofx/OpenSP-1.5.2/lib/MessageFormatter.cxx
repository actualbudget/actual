// Copyright (c) 1994, 1995, 1997 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"
#include "MessageFormatter.h"
#include "OutputCharStream.h"
#include "rtti.h"
#include "MessageArg.h"
#include "ErrnoMessageArg.h"
#include "SearchResultMessageArg.h"
#include "MessageFormatterMessages.h"

#include <string.h>
#include <errno.h>

#ifdef DECLARE_STRERROR
extern "C" {
  char *strerror(int);
}
#endif

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

MessageFormatter::MessageFormatter()
{
}

MessageFormatter::~MessageFormatter()
{
}

void MessageFormatter::formatOpenElements(const Vector<OpenElementInfo> &openElementInfo,
					  OutputCharStream &os)
{
  unsigned nOpenElements = openElementInfo.size();
  for (unsigned i = 0;; i++) {
    if (i > 0
      && (i == nOpenElements || openElementInfo[i].included)) {
      // describe last match in previous open element
      const OpenElementInfo &prevInfo = openElementInfo[i - 1];
      if (prevInfo.matchType.size() != 0) {
	os << " (" << prevInfo.matchType;
	if (prevInfo.matchIndex != 0)
	  os << '[' << (unsigned long)prevInfo.matchIndex << ']';
	os << ')';
      }
    }
    if (i == nOpenElements)
      break;
    const OpenElementInfo &e = openElementInfo[i];
    os << ' ' << e.gi;
    if (i > 0 && !e.included) {
      unsigned long n = openElementInfo[i - 1].matchIndex;
      if (n != 0)
	os << '[' << n << ']';
    }
  }
}

void MessageFormatter::formatMessage(const MessageFragment &frag,
				     const Vector<CopyOwner<MessageArg> > &args,
				     OutputCharStream &os, bool noquote)
{
  StringC text;
  if (!getMessageText(frag, text)) {
    formatFragment(MessageFormatterMessages::invalidMessage, os);
    return;
  }
  Builder builder(this, os, noquote || (text.size() == 2));
  size_t i = 0;
  while (i < text.size()) {
    if (text[i] == '%') {
      i++;
      if (i >= text.size())
	break;
      if (text[i] >= '1' && text[i] <= '9') {
	if (unsigned(text[i] - '1') < args.size())
	  args[text[i] - '1']->append(builder);
      }
      else
	os.put(text[i]);
      i++;
    }
    else {
      os.put(text[i]);
      i++;
    }
  }
}

Boolean MessageFormatter::formatFragment(const MessageFragment &frag,
					 OutputCharStream &os)
{
  StringC text;
  if (!getMessageText(frag, text))
    return 0;
  os << text;
  return 1;
}

MessageFormatter::Builder::~Builder()
{
}

void MessageFormatter::Builder::appendNumber(unsigned long n)
{
  os() << n;
}

void MessageFormatter::Builder::appendOrdinal(unsigned long n)
{
  os() << n;
  switch (n % 10) {
  case 1:
    appendFragment(MessageFormatterMessages::ordinal1);
    break;
  case 2:
    appendFragment(MessageFormatterMessages::ordinal2);
    break;
  case 3:
    appendFragment(MessageFormatterMessages::ordinal3);
    break;
  default:
    appendFragment(MessageFormatterMessages::ordinaln);
    break;
  }
}

void MessageFormatter::Builder::appendChars(const Char *p, size_t n)
{
  if (argIsCompleteMessage_)
    os().write(p, n);
  else
    os().put('"').write(p, n).put('"');
}

void MessageFormatter::Builder::appendOther(const OtherMessageArg *p)
{
  const ErrnoMessageArg *ea = DYNAMIC_CAST_CONST_PTR(ErrnoMessageArg, p);
  
  if (ea) {
    os() << strerror(ea->errnum());
    return;
  }

  const SearchResultMessageArg *sr
    = DYNAMIC_CAST_CONST_PTR(SearchResultMessageArg, p);
  if (sr) {
    for (size_t i = 0; i < sr->nTried(); i++) {
      if (i > 0)
	os() << ", ";
      const StringC &f = sr->filename(i);
      appendChars(f.data(), f.size());
      switch (sr->errnum(i)) {
      default:
	os() << " (";
	os() << strerror(sr->errnum(i));
	os() << ")";
#ifdef ENOENT
      case ENOENT:
#endif
	break;
      }
    }
    return;
  }
  appendFragment(MessageFormatterMessages::invalidArgumentType);
}

void MessageFormatter::Builder::appendFragment(const MessageFragment &frag)
{
  formatter_->formatFragment(frag, os());
}

#ifdef SP_NAMESPACE
}
#endif
