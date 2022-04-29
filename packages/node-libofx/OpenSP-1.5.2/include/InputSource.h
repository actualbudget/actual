// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef InputSource_INCLUDED
#define InputSource_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "types.h"
#include "Link.h"
#include "Ptr.h"
#include "Location.h"
#include "XcharMap.h"
#include <stddef.h>

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class Messenger;
class NamedCharRef;
class CharsetInfo;
class InternalInputSource;

class SP_API InputSource : public Link {
public:
  enum { eE = -1 };		// end of entity signal

  virtual ~InputSource();
  Xchar get(Messenger &);
  virtual void pushCharRef(Char ch, const NamedCharRef &) = 0;
  const Location &currentLocation() const;
  const Char *currentTokenStart() const;
  size_t currentTokenLength() const;
  const Char *currentTokenEnd() const;
  Index nextIndex() const;
  // Discard all but the last character of the current token.
  void discardInitial();
  void startToken();
  void startTokenNoMulticode();
  void endToken(size_t length);
  Xchar tokenChar(Messenger &);
  Xchar tokenCharInBuffer(Messenger &);
  void ungetToken();
  void setMarkupScanTable(const XcharMap<unsigned char> &);
  Boolean scanSuppress() const;
  void extendToBufferEnd();
  virtual void willNotRewind();
  virtual Boolean rewind(Messenger &) = 0;
  Boolean accessError() const;
  virtual void setDocCharset(const CharsetInfo &docCharset,
			     const CharsetInfo &emCharset);
  virtual void willNotSetDocCharset();
  virtual InternalInputSource *asInternalInputSource();
protected:
  InputSource(InputSourceOrigin *origin, const Char *start, const Char *end);
  void reset(const Char *start, const Char *end);
  InputSourceOrigin *inputSourceOrigin();
  void noteCharRef(Index replacementIndex, const NamedCharRef &);
  const Char *cur();
  const Char *start();
  const Char *end();
  Index startIndex();
  void changeBuffer(const Char *newBase, const Char *oldBase);
  void advanceEnd(const Char *newEnd);
  void moveLeft();
  void moveStart(const Char *newStart);
  Char nextChar();
  void setAccessError();
private:
  InputSource(const InputSource &); // undefined
  void operator=(const InputSource &); // undefined
  virtual Xchar fill(Messenger &) = 0;
  void advanceStart(const Char *to);
  void advanceStartMulticode(const Char *to);
  
  const Char *cur_;
  const Char *start_;
  const Char *end_;
  Location startLocation_;
  Ptr<InputSourceOrigin> origin_;
  Boolean accessError_;
  Boolean scanSuppress_;
  Boolean scanSuppressSingle_;
  Index scanSuppressIndex_;
  Boolean multicode_;
  XcharMap<unsigned char> markupScanTable_;
};

inline
void InputSource::advanceStart(const Char *to)
{
  if (multicode_)
    advanceStartMulticode(to);
  else {
    startLocation_ += to - start_;
    start_ = to;
  }
}

inline
Xchar InputSource::get(Messenger &mgr)
{
  advanceStart(cur_);
  return cur_ < end_ ? *cur_++ : fill(mgr);
}

inline
void InputSource::startTokenNoMulticode()
{
  startLocation_ += cur_ - start_;
  start_ = cur_;
}

inline
void InputSource::startToken()
{
  advanceStart(cur_);
}

inline
void InputSource::endToken(size_t length)
{
  cur_ = start_ + length;
}

inline
Xchar InputSource::tokenChar(Messenger &mgr)
{
  return cur_ < end_ ? *cur_++ : fill(mgr);
}

inline
Xchar InputSource::tokenCharInBuffer(Messenger &mgr)
{
  return cur_ < end_ ? (Xchar)*cur_++ : eE;
}

inline
void InputSource::extendToBufferEnd()
{
  cur_ = end_;
}

inline
const Char *InputSource::cur()
{
  return cur_;
}

inline
const Char *InputSource::start()
{
  return start_;
}

inline
const Char *InputSource::end()
{
  return end_;
}

inline
void InputSource::changeBuffer(const Char *newBase, const Char *oldBase)
{
  cur_ = newBase + (cur_ - oldBase);
  start_ = newBase + (start_ - oldBase);
  end_ = newBase + (end_ - oldBase);
}

inline
void InputSource::moveStart(const Char *newStart)
{
  cur_ = newStart + (cur_ - start_);
  end_ = newStart + (end_ - start_);
  start_ = newStart;
}

inline
void InputSource::advanceEnd(const Char *newEnd)
{
  end_ = newEnd;
}

inline
Char InputSource::nextChar()
{
  return *cur_++;
}

inline
Index InputSource::startIndex()
{
  return startLocation_.index();
}

inline
void InputSource::moveLeft()
{
  start_--;
  cur_--;
}

inline
void InputSource::noteCharRef(Index replacementIndex, const NamedCharRef &ref)
{
  origin_->noteCharRef(replacementIndex, ref);
}

inline
const Location &InputSource::currentLocation() const
{
  return startLocation_;
}

inline
const Char *InputSource::currentTokenStart() const
{
  return start_;
}

inline
size_t InputSource::currentTokenLength() const
{
  return cur_ - start_;
}

inline
Index InputSource::nextIndex() const
{
  return startLocation_.index() + (cur_ - start_);
}

inline
const Char *InputSource::currentTokenEnd() const
{
  return cur_;
}

inline
void InputSource::discardInitial()
{
  advanceStart(cur_ - 1);
}

inline
void InputSource::ungetToken()
{
  cur_ = start_;
}

inline
void InputSource::setMarkupScanTable(const XcharMap<unsigned char> &table)
{
  markupScanTable_ = table;
  multicode_ = 1;
}

inline
Boolean InputSource::scanSuppress() const
{
  return scanSuppress_ && (!scanSuppressSingle_
			   || startLocation_.index() == scanSuppressIndex_);
}

inline
InputSourceOrigin *InputSource::inputSourceOrigin()
{
  return origin_.pointer();
}

inline
void InputSource::setAccessError()
{
  accessError_ = 1;
}

inline
Boolean InputSource::accessError() const
{
  return accessError_;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not InputSource_INCLUDED */
