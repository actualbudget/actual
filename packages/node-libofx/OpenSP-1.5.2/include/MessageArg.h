// Copyright (c) 1994 James Clark, 1999 Matthias Clasen
// See the file COPYING for copying permission.

#ifndef MessageArg_INCLUDED
#define MessageArg_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "StringC.h"
#include "Vector.h"
#include "rtti.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class MessageBuilder;

class SP_API MessageArg {
public:
  MessageArg();
  virtual ~MessageArg();
  virtual MessageArg *copy() const = 0;
  virtual void append(MessageBuilder &) const = 0;
};

class SP_API StringMessageArg : public MessageArg {
public:
  StringMessageArg(const StringC &);
  MessageArg *copy() const;
  void append(MessageBuilder &) const;
private:
  StringC s_;
};

class SP_API NumberMessageArg : public MessageArg {
public:
  NumberMessageArg(unsigned long);
  MessageArg *copy() const;
  void append(MessageBuilder &) const;
private:
  unsigned long n_;
};

class SP_API OrdinalMessageArg : public MessageArg {
public:
  OrdinalMessageArg(unsigned long);
  MessageArg *copy() const;
  void append(MessageBuilder &) const;
private:
  unsigned long n_;
};

class SP_API OtherMessageArg : public MessageArg {
  RTTI_CLASS
public:
  OtherMessageArg();
  void append(MessageBuilder &) const;
};

class SP_API StringVectorMessageArg : public MessageArg {
public:
  StringVectorMessageArg(const Vector<StringC> &);
  MessageArg *copy() const;
  void append(MessageBuilder &) const;
private:
  Vector<StringC> v_;
};


#ifdef SP_NAMESPACE
}
#endif

#endif /* not MessageArg_INCLUDED */
