// This file was automatically generated from EntityAppMessages.msg by msggen.pl.
#include "Message.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

struct EntityAppMessages {
  // 4100
  static const MessageType1 cHelp;
  // 4101
  static const MessageType1 CHelp;
  // 4102
  static const MessageType1 DHelp;
  // 4103
  static const MessageType1 RHelp;
  // 4104
  static const MessageFragment directory;
  // 4105
  static const MessageFragment sysid;
};
const MessageType1 EntityAppMessages::cHelp(
MessageType::info,
&libModule,
4100
#ifndef SP_NO_MESSAGE_TEXT
,"Use catalog %1."
#endif
);
const MessageType1 EntityAppMessages::CHelp(
MessageType::info,
&libModule,
4101
#ifndef SP_NO_MESSAGE_TEXT
,"Arguments are catalogs, use DOCUMENT entry."
#endif
);
const MessageType1 EntityAppMessages::DHelp(
MessageType::info,
&libModule,
4102
#ifndef SP_NO_MESSAGE_TEXT
,"Search files in directory %1."
#endif
);
const MessageType1 EntityAppMessages::RHelp(
MessageType::info,
&libModule,
4103
#ifndef SP_NO_MESSAGE_TEXT
,"Restrict file reading (for use in Web apps)."
#endif
);
const MessageFragment EntityAppMessages::directory(
&libModule,
4104
#ifndef SP_NO_MESSAGE_TEXT
,"DIRECTORY"
#endif
);
const MessageFragment EntityAppMessages::sysid(
&libModule,
4105
#ifndef SP_NO_MESSAGE_TEXT
,"SYSID"
#endif
);
#ifdef SP_NAMESPACE
}
#endif
