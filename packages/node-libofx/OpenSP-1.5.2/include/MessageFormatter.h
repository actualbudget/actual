// Copyright (c) 1994, 1997 James Clark
// See the file COPYING for copying permission.

#ifndef MessageFormatter_INCLUDED
#define MessageFormatter_INCLUDED 1

#ifdef __GNUG__
#pragma interface
#endif

#include "types.h"
#include "MessageBuilder.h"
#include "Boolean.h"
#include "Message.h"
#include "Location.h"
#include "StringC.h"
#include "OutputCharStream.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API MessageFormatter {
public:
  MessageFormatter();
  virtual ~MessageFormatter();
  virtual void formatMessage(const MessageFragment &,
		     const Vector<CopyOwner<MessageArg> > &args,
		     OutputCharStream &, bool noquote = 0);
  virtual void formatOpenElements(const Vector<OpenElementInfo> &openElementInfo,
			  OutputCharStream &os);
  virtual Boolean getMessageText(const MessageFragment &, StringC &) = 0;
  virtual Boolean formatFragment(const MessageFragment &, OutputCharStream &);
private:
  MessageFormatter(const MessageFormatter &); // undefined
  void operator=(const MessageFormatter &);  // undefined
protected:
  class Builder : public MessageBuilder {
  public:
    Builder(MessageFormatter *formatter, OutputCharStream &os, bool b)
      : os_(&os), formatter_(formatter), argIsCompleteMessage_(b) { }
    virtual ~Builder();
    void appendNumber(unsigned long);
    void appendOrdinal(unsigned long);
    void appendChars(const Char *, size_t);
    void appendOther(const OtherMessageArg *);
    void appendFragment(const MessageFragment &);
  private:
    OutputCharStream &os() { return *os_; }
    OutputCharStream *os_;
    MessageFormatter *formatter_;
    bool argIsCompleteMessage_;
  };
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not MessageFormatter_INCLUDED */
