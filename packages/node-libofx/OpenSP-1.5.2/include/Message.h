// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef Message_INCLUDED
#define Message_INCLUDED 1

#ifdef __GNUG__
#pragma interface
#endif

#include <stddef.h>
#include "Location.h"
#include "Vector.h"
#include "CopyOwner.h"
#include "Boolean.h"
#include "StringC.h"
#include "MessageArg.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class MessageModule;

#ifdef _MSC_VER
extern SP_API MessageModule libModule;
extern SP_API MessageModule appModule;
#else
extern MessageModule libModule;
extern MessageModule appModule;
#endif

class SP_API MessageFragment {
public:

#ifdef _MSC_VER
  MessageFragment() {};
#endif
  ~MessageFragment();

  MessageFragment(const MessageModule *module, unsigned number, const char *text = 0);
  const MessageModule *module() const;
  unsigned number() const;
  const char *text() const;
private:
  unsigned short number_;
  const MessageModule * module_;
protected:
  unsigned char spare_;
private:
#ifndef SP_NO_MESSAGE_TEXT
  const char *text_;
#endif
};

class SP_API MessageType : public MessageFragment {
public:
  enum Severity {
    info,
    warning,
    quantityError,
    idrefError,
    error
    };
  MessageType(Severity = info, const MessageModule *module = &libModule,
	      unsigned number = unsigned(-1),
	      const char *text = 0, const char *clauses = 0, 
              const char *auxText = 0);
  ~MessageType();
  Severity severity() const;
  MessageFragment auxFragment() const;
  Boolean isError() const;
  const char *clauses() const;
private:
#ifndef SP_NO_MESSAGE_TEXT
  const char *clauses_;
  const char *auxText_;
#endif
};


class SP_API MessageType0 : public MessageType {
public:
  MessageType0(Severity = info, const MessageModule *module = &libModule,
	       unsigned number = unsigned(-1), const char *text = 0,
               const char *clauses = 0);
  ~MessageType0();
};

class SP_API MessageType1 : public MessageType {
public:
  MessageType1(Severity = info, const MessageModule *module = &libModule,
	       unsigned number = unsigned(-1), const char *text = 0,
               const char *clauses = 0);
  ~MessageType1();
};

class SP_API MessageType2 : public MessageType {
public:
  MessageType2(Severity = info, const MessageModule *module = &libModule,
	       unsigned number = unsigned(-1), const char *text = 0,
               const char *clauses = 0);
  ~MessageType2();
};

class SP_API MessageType3 : public MessageType {
public:
  MessageType3(Severity = info, const MessageModule *module = &libModule,
	       unsigned number = unsigned(-1), const char *text = 0,
               const char *clauses = 0);
  ~MessageType3();
};

class SP_API MessageType4 : public MessageType {
public:
  MessageType4(Severity = info, const MessageModule *module = &libModule,
	       unsigned number = unsigned(-1), const char *text = 0,
               const char *clauses = 0);
  ~MessageType4();
};

class SP_API MessageType5 : public MessageType {
public:
  MessageType5(Severity = info, const MessageModule *module = &libModule,
	       unsigned number = unsigned(-1), const char *text = 0,
               const char *clauses = 0);
  ~MessageType5();
};

class SP_API MessageType6 : public MessageType {
public:
  MessageType6(Severity = info, const MessageModule *module = &libModule,
	       unsigned number = unsigned(-1), const char *text = 0,
               const char *clauses = 0);
  ~MessageType6();
};

class SP_API MessageType0L : public MessageType {
public:
  MessageType0L(Severity = info, const MessageModule *module = &libModule,
		unsigned number = unsigned(-1), const char *text = 0,
		const char *clauses = 0, const char *auxText = 0);
  ~MessageType0L();
};

class SP_API MessageType1L : public MessageType {
public:
  MessageType1L(Severity = info, const MessageModule *module = &libModule,
		unsigned number = unsigned(-1), const char *text = 0,
		const char *clauses = 0, const char *auxText = 0);
  ~MessageType1L();
};

class SP_API OpenElementInfo {
public:
  OpenElementInfo();
  OpenElementInfo(OpenElementInfo const&);
  inline ~OpenElementInfo() {};
  PackedBoolean included;
  StringC gi;
  StringC matchType;
  unsigned matchIndex;
};

class SP_API Message {
public:
  Message();
  Message(int nArgs);
  const MessageType *type;
  Location loc;
  Location auxLoc;
  Vector<CopyOwner<MessageArg> > args;
  Vector<OpenElementInfo> openElementInfo;
  void swap(Message &);
  Boolean isError() const;
};

class SP_API Messenger {
public:
  Messenger();
  virtual ~Messenger();
  void message(const MessageType0 &);
  void message(const MessageType1 &, const MessageArg &);
  void message(const MessageType2 &,
	       const MessageArg &,
	       const MessageArg &);
  void message(const MessageType3 &,
	       const MessageArg &,
	       const MessageArg &,
	       const MessageArg &);
  void message(const MessageType4 &,
	       const MessageArg &,
	       const MessageArg &,
	       const MessageArg &,
	       const MessageArg &);
  void message(const MessageType5 &,
	       const MessageArg &,
	       const MessageArg &,
	       const MessageArg &,
	       const MessageArg &,
	       const MessageArg &);
  void message(const MessageType6 &,
	       const MessageArg &,
	       const MessageArg &,
	       const MessageArg &,
	       const MessageArg &,
	       const MessageArg &,
	       const MessageArg &);
  void message(const MessageType0L &, const Location &);
  void message(const MessageType1L &, const MessageArg &, const Location &);
  void setNextLocation(const Location &);
  virtual void initMessage(Message &);
  virtual void dispatchMessage(const Message &) = 0;
  virtual void dispatchMessage(Message &);
private:
  void doInitMessage(Message &);
  Boolean haveNextLocation_;
  Location nextLocation_;
};

class SP_API ForwardingMessenger : public Messenger {
public:
  ForwardingMessenger(Messenger &);
  void dispatchMessage(const Message &);
  void dispatchMessage(Message &);
  void initMessage(Message &);
private:
  Messenger *to_;
};

class SP_API ParentLocationMessenger : public ForwardingMessenger {
public:
  ParentLocationMessenger(Messenger &);
  void initMessage(Message &);
};

class SP_API NullMessenger : public Messenger {
public:
  NullMessenger();
  void dispatchMessage(const Message &);
};

inline
const MessageModule *MessageFragment::module() const
{
  return module_;
}

inline
unsigned MessageFragment::number() const
{
  return number_;
}

inline
const char *MessageFragment::text() const
{
#ifdef SP_NO_MESSAGE_TEXT
  return 0;
#else
  return text_;
#endif
}

inline
MessageType::Severity MessageType::severity() const
{
  return Severity(spare_);
}

inline
MessageFragment MessageType::auxFragment() const
{
  return MessageFragment(module(),
			 number() + 1,
#ifdef SP_NO_MESSAGE_TEXT
			 0
#else
			 auxText_
#endif
			 );
}

inline
Boolean MessageType::isError() const
{
  return severity() != info && severity() != warning;
}

inline
const char *MessageType::clauses() const
{
#ifdef SP_NO_MESSAGE_TEXT
  return 0;
#else
  return clauses_;
#endif
}

inline
Boolean Message::isError() const
{
  return type->isError();
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not Message_INCLUDED */
