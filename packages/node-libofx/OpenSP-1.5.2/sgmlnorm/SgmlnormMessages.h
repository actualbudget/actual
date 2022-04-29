// This file was automatically generated from SgmlnormMessages.msg by msggen.pl.
#include "Message.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

struct SgmlnormMessages {
  // 0
  static const MessageType1 dHelp;
  // 1
  static const MessageType1 mHelp;
  // 2
  static const MessageType1 nHelp;
  // 3
  static const MessageType1 rHelp;
  // 4
  static const MessageType1 info1;
  // 5
  static const MessageType1 info2;
  // 6
  static const MessageType1 info3;
};
const MessageType1 SgmlnormMessages::dHelp(
MessageType::info,
&appModule,
0
#ifndef SP_NO_MESSAGE_TEXT
,"Output a document type declaration."
#endif
);
const MessageType1 SgmlnormMessages::mHelp(
MessageType::info,
&appModule,
1
#ifndef SP_NO_MESSAGE_TEXT
,"Output marked sections."
#endif
);
const MessageType1 SgmlnormMessages::nHelp(
MessageType::info,
&appModule,
2
#ifndef SP_NO_MESSAGE_TEXT
,"Output comments."
#endif
);
const MessageType1 SgmlnormMessages::rHelp(
MessageType::info,
&appModule,
3
#ifndef SP_NO_MESSAGE_TEXT
,"Raw output."
#endif
);
const MessageType1 SgmlnormMessages::info1(
MessageType::info,
&appModule,
4
#ifndef SP_NO_MESSAGE_TEXT
,"%1 prints on the standard output a normalized document instance"
#endif
);
const MessageType1 SgmlnormMessages::info2(
MessageType::info,
&appModule,
5
#ifndef SP_NO_MESSAGE_TEXT
,"for the SGML document contained in the concatenation of the entities"
#endif
);
const MessageType1 SgmlnormMessages::info3(
MessageType::info,
&appModule,
6
#ifndef SP_NO_MESSAGE_TEXT
,"with system identifiers SYSID..."
#endif
);
#ifdef SP_NAMESPACE
}
#endif
