// This file was automatically generated from SpentMessages.msg by msggen.pl.
#include "Message.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

struct SpentMessages {
  // 0
  static const MessageType1 nHelp;
  // 1
  static const MessageType1 rHelp;
  // 2
  static const MessageType1 info1;
  // 3
  static const MessageType1 info2;
};
const MessageType1 SpentMessages::nHelp(
MessageType::info,
&appModule,
0
#ifndef SP_NO_MESSAGE_TEXT
,"non-SGML"
#endif
);
const MessageType1 SpentMessages::rHelp(
MessageType::info,
&appModule,
1
#ifndef SP_NO_MESSAGE_TEXT
,"raw"
#endif
);
const MessageType1 SpentMessages::info1(
MessageType::info,
&appModule,
2
#ifndef SP_NO_MESSAGE_TEXT
,"%1 prints the concatenation of the entities with system identifiers"
#endif
);
const MessageType1 SpentMessages::info2(
MessageType::info,
&appModule,
3
#ifndef SP_NO_MESSAGE_TEXT
,"SYSID... on the standard output"
#endif
);
#ifdef SP_NAMESPACE
}
#endif
