// This file was automatically generated from SxMessages.msg by msggen.pl.
#include "Message.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

struct SxMessages {
  // 0
  static const MessageType1 unknownOutputOption;
  // 1
  static const MessageType1 xHelp;
  // 2
  static const MessageType1 info1;
  // 3
  static const MessageType1 info2;
  // 4
  static const MessageType1 info3;
  // 5
  static const MessageFragment option;
};
const MessageType1 SxMessages::unknownOutputOption(
MessageType::error,
&appModule,
0
#ifndef SP_NO_MESSAGE_TEXT
,"unknown output option %1"
#endif
);
const MessageType1 SxMessages::xHelp(
MessageType::info,
&appModule,
1
#ifndef SP_NO_MESSAGE_TEXT
,"Modify the XML output according to %1."
#endif
);
const MessageType1 SxMessages::info1(
MessageType::info,
&appModule,
2
#ifndef SP_NO_MESSAGE_TEXT
,"%1 converts SGML to XML. %1 parses and validates the SGML document"
#endif
);
const MessageType1 SxMessages::info2(
MessageType::info,
&appModule,
3
#ifndef SP_NO_MESSAGE_TEXT
,"contained in SYSID... and writes an equivalent XML document to the standard"
#endif
);
const MessageType1 SxMessages::info3(
MessageType::info,
&appModule,
4
#ifndef SP_NO_MESSAGE_TEXT
,"output. %1 will warn about SGML constructs which have no XML equivalent."
#endif
);
const MessageFragment SxMessages::option(
&appModule,
5
#ifndef SP_NO_MESSAGE_TEXT
,"OPTION"
#endif
);
#ifdef SP_NAMESPACE
}
#endif
