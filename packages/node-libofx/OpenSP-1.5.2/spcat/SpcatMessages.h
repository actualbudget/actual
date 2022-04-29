// This file was automatically generated from SpcatMessages.msg by msggen.pl.
#include "Message.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

struct SpcatMessages {
  // 0
  static const MessageType1 PHelp;
  // 1
  static const MessageType1 SHelp;
  // 2
  static const MessageType1 pHelp;
  // 3
  static const MessageType1 dHelp;
  // 4
  static const MessageType1 lHelp;
  // 5
  static const MessageType1 eHelp;
  // 6
  static const MessageType1 nHelp;
  // 7
  static const MessageType1 sHelp;
  // 8
  static const MessageType1 info1;
  // 9
  static const MessageType1 info2;
  // 10
  static const MessageType1 info3;
  // 11
  static const MessageType1 info4;
  // 12
  static const MessageFragment literal;
  // 13
  static const MessageFragment name;
};
const MessageType1 SpcatMessages::PHelp(
MessageType::info,
&appModule,
0
#ifndef SP_NO_MESSAGE_TEXT
,"Print the effective system id for the public id %1."
#endif
);
const MessageType1 SpcatMessages::SHelp(
MessageType::info,
&appModule,
1
#ifndef SP_NO_MESSAGE_TEXT
,"Print the effective system id for system id %1."
#endif
);
const MessageType1 SpcatMessages::pHelp(
MessageType::info,
&appModule,
2
#ifndef SP_NO_MESSAGE_TEXT
,"Print the effective system id for parameter entity %1."
#endif
);
const MessageType1 SpcatMessages::dHelp(
MessageType::info,
&appModule,
3
#ifndef SP_NO_MESSAGE_TEXT
,"Print the effective system id for the doctype %1."
#endif
);
const MessageType1 SpcatMessages::lHelp(
MessageType::info,
&appModule,
4
#ifndef SP_NO_MESSAGE_TEXT
,"Print the effective system id for the linktype %1."
#endif
);
const MessageType1 SpcatMessages::eHelp(
MessageType::info,
&appModule,
5
#ifndef SP_NO_MESSAGE_TEXT
,"Print the effective system id for entity %1."
#endif
);
const MessageType1 SpcatMessages::nHelp(
MessageType::info,
&appModule,
6
#ifndef SP_NO_MESSAGE_TEXT
,"Print the effective system id for notation %1."
#endif
);
const MessageType1 SpcatMessages::sHelp(
MessageType::info,
&appModule,
7
#ifndef SP_NO_MESSAGE_TEXT
,"Print the effective system id for the SGML declaration for doctype %1."
#endif
);
const MessageType1 SpcatMessages::info1(
MessageType::info,
&appModule,
8
#ifndef SP_NO_MESSAGE_TEXT
,"%1 prints effective system identifiers found in the catalogs on the"
#endif
);
const MessageType1 SpcatMessages::info2(
MessageType::info,
&appModule,
9
#ifndef SP_NO_MESSAGE_TEXT
,"standard output. It doesn't check that the system identifiers correspond"
#endif
);
const MessageType1 SpcatMessages::info3(
MessageType::info,
&appModule,
10
#ifndef SP_NO_MESSAGE_TEXT
,"to actual files. The return value is 0 if the last system identifier was"
#endif
);
const MessageType1 SpcatMessages::info4(
MessageType::info,
&appModule,
11
#ifndef SP_NO_MESSAGE_TEXT
,"successfully created and 1 otherwise."
#endif
);
const MessageFragment SpcatMessages::literal(
&appModule,
12
#ifndef SP_NO_MESSAGE_TEXT
,"LITERAL"
#endif
);
const MessageFragment SpcatMessages::name(
&appModule,
13
#ifndef SP_NO_MESSAGE_TEXT
,"NAME"
#endif
);
#ifdef SP_NAMESPACE
}
#endif
