// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"
#include "Message.h"
#include "MessageArg.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

MessageFragment::MessageFragment(const MessageModule *module, unsigned number, const char *
#ifndef SP_NO_MESSAGE_TEXT
				 text
#endif
				 )
: module_(module),
#ifndef SP_NO_MESSAGE_TEXT
  text_(text),
#endif
  number_(number)
{
}

MessageFragment::~MessageFragment() {}

MessageType::MessageType(Severity severity, const MessageModule *module, unsigned number,
			 const char *text, const char *
#ifndef SP_NO_MESSAGE_TEXT
	     		 clauses
#endif
                         , const char *
#ifndef SP_NO_MESSAGE_TEXT
	     		 auxText
#endif
			 )
: 
#ifndef SP_NO_MESSAGE_TEXT
  clauses_(clauses),
  auxText_(auxText),
#endif
  MessageFragment(module, number, text)
{
  spare_ = severity;
}
     
MessageType::~MessageType() {}

MessageType0::MessageType0(Severity severity, const MessageModule *module, unsigned number,
			   const char *text, const char *clauses)
: MessageType(severity, module, number, text, clauses)
{
}

MessageType0::~MessageType0() {}

MessageType1::MessageType1(Severity severity, const MessageModule *module, unsigned number,
			   const char *text, const char *clauses)
: MessageType(severity, module, number, text, clauses)
{
}

MessageType1::~MessageType1() {}

MessageType2::MessageType2(Severity severity, const MessageModule *module, unsigned number,
			   const char *text, const char *clauses)
: MessageType(severity, module, number, text, clauses)
{
}

MessageType2::~MessageType2() {}

MessageType3::MessageType3(Severity severity, const MessageModule *module, unsigned number,
			   const char *text, const char *clauses)
: MessageType(severity, module, number, text, clauses)
{
}

MessageType3::~MessageType3() {}

MessageType4::MessageType4(Severity severity, const MessageModule *module, unsigned number,
			   const char *text, const char *clauses)
: MessageType(severity, module, number, text, clauses)
{
}

MessageType4::~MessageType4() {}

MessageType5::MessageType5(Severity severity, const MessageModule *module, unsigned number,
			   const char *text, const char *clauses)
: MessageType(severity, module, number, text, clauses)
{
}

MessageType5::~MessageType5() {}

MessageType6::MessageType6(Severity severity, const MessageModule *module, unsigned number,
			   const char *text, const char *clauses)
: MessageType(severity, module, number, text, clauses)
{
}

MessageType6::~MessageType6() {}

MessageType0L::MessageType0L(Severity severity, const MessageModule *module, unsigned number,
			     const char *text, const char *clauses,
                             const char *auxText)
: MessageType(severity, module, number, text, clauses, auxText)
{
}

MessageType0L::~MessageType0L() {}

MessageType1L::MessageType1L(Severity severity, const MessageModule *module, unsigned number,
			     const char *text, const char *clauses,
                             const char *auxText)
: MessageType(severity, module, number, text, clauses, auxText)
{
}

MessageType1L::~MessageType1L() {}

OpenElementInfo::OpenElementInfo()
: included(0), matchIndex(0)
{
}

OpenElementInfo::OpenElementInfo(OpenElementInfo const& x)
: included(x.included), matchIndex(x.matchIndex)
{
}

Message::Message()
{
}

Message::Message(int nArgs)
: args(nArgs)
{
}

void Message::swap(Message &to)
{
  const MessageType *tem = type;
  type = to.type;
  to.type = tem;
  to.loc.swap(loc);
  to.auxLoc.swap(auxLoc);
  args.swap(to.args);
  openElementInfo.swap(to.openElementInfo);
}

Messenger::Messenger()
: haveNextLocation_(0)
{
}

Messenger::~Messenger()
{
}

void Messenger::dispatchMessage(Message &msg)
{
  const Message &tem = msg;
  dispatchMessage(tem);
}

void Messenger::message(const MessageType0 &type)
{
  Message msg(0);
  doInitMessage(msg);
  msg.type = &type;
  dispatchMessage(msg);
}

void Messenger::message(const MessageType1 &type, const MessageArg &arg0)
{
  Message msg(1);
  doInitMessage(msg);
  msg.args[0] = arg0.copy();
  msg.type = &type;
  dispatchMessage(msg);
}

void Messenger::message(const MessageType2 &type,
			const MessageArg &arg0,
			const MessageArg &arg1)
{
  Message msg(2);
  doInitMessage(msg);
  msg.args[0] = arg0.copy();
  msg.args[1] = arg1.copy();
  msg.type = &type;
  dispatchMessage(msg);
}

void Messenger::message(const MessageType3 &type,
			const MessageArg &arg0,
			const MessageArg &arg1,
			const MessageArg &arg2)
{
  Message msg(3);
  doInitMessage(msg);
  msg.args[0] = arg0.copy();
  msg.args[1] = arg1.copy();
  msg.args[2] = arg2.copy();
  msg.type = &type;
  dispatchMessage(msg);
}

void Messenger::message(const MessageType4 &type,
			const MessageArg &arg0,
			const MessageArg &arg1,
			const MessageArg &arg2,
			const MessageArg &arg3)
{
  Message msg(4);
  doInitMessage(msg);
  msg.args[0] = arg0.copy();
  msg.args[1] = arg1.copy();
  msg.args[2] = arg2.copy();
  msg.args[3] = arg3.copy();
  msg.type = &type;
  dispatchMessage(msg);
}

void Messenger::message(const MessageType5 &type,
			const MessageArg &arg0,
			const MessageArg &arg1,
			const MessageArg &arg2,
			const MessageArg &arg3,
			const MessageArg &arg4)
{
  Message msg(5);
  doInitMessage(msg);
  msg.args[0] = arg0.copy();
  msg.args[1] = arg1.copy();
  msg.args[2] = arg2.copy();
  msg.args[3] = arg3.copy();
  msg.args[4] = arg4.copy();
  msg.type = &type;
  dispatchMessage(msg);
}

void Messenger::message(const MessageType6 &type,
			const MessageArg &arg0,
			const MessageArg &arg1,
			const MessageArg &arg2,
			const MessageArg &arg3,
			const MessageArg &arg4,
			const MessageArg &arg5)
{
  Message msg(6);
  doInitMessage(msg);
  msg.args[0] = arg0.copy();
  msg.args[1] = arg1.copy();
  msg.args[2] = arg2.copy();
  msg.args[3] = arg3.copy();
  msg.args[4] = arg4.copy();
  msg.args[5] = arg5.copy();
  msg.type = &type;
  dispatchMessage(msg);
}

void Messenger::message(const MessageType0L &type, const Location &loc)
{
  Message msg(0);
  doInitMessage(msg);
  msg.type = &type;
  msg.auxLoc = loc;
  dispatchMessage(msg);
}

void Messenger::message(const MessageType1L &type, const MessageArg &arg0,
			const Location &loc)
{
  Message msg(1);
  doInitMessage(msg);
  msg.args[0] = arg0.copy();
  msg.type = &type;
  msg.auxLoc = loc;
  dispatchMessage(msg);
}


void Messenger::setNextLocation(const Location &loc)
{
  haveNextLocation_ = 1;
  nextLocation_ = loc;
}

void Messenger::initMessage(Message &)
{
}

void Messenger::doInitMessage(Message &msg)
{
  initMessage(msg);
  if (haveNextLocation_) {
    msg.loc = nextLocation_;
    haveNextLocation_ = 0;
  }
}

ForwardingMessenger::ForwardingMessenger(Messenger &to)
: to_(&to)
{
}

void ForwardingMessenger::dispatchMessage(Message &msg)
{
  to_->dispatchMessage(msg);
}

void ForwardingMessenger::dispatchMessage(const Message &msg)
{
  to_->dispatchMessage(msg);
}

void ForwardingMessenger::initMessage(Message &msg)
{
  to_->initMessage(msg);
}

ParentLocationMessenger::ParentLocationMessenger(Messenger &mgr)
: ForwardingMessenger(mgr)
{
}

void ParentLocationMessenger::initMessage(Message &msg)
{
  ForwardingMessenger::initMessage(msg);
  if (!msg.loc.origin().isNull())
    msg.loc = msg.loc.origin()->parent();
}

NullMessenger::NullMessenger()
{
}

void NullMessenger::dispatchMessage(const Message &)
{
}

#ifdef SP_NAMESPACE
}
#endif
