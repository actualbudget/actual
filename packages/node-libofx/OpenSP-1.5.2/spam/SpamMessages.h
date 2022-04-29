// This file was automatically generated from SpamMessages.msg by msggen.pl.
#include "Message.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

struct SpamMessages {
  // 0
  static const MessageType1 invalidMarkupArgument;
  // 1
  static const MessageType0 tagInSpecialMarkedSection;
  // 2
  static const MessageType1 hHelp;
  // 3
  static const MessageType1 lHelp;
  // 4
  static const MessageType1 mHelp;
  // 5
  static const MessageType1 oHelp;
  // 6
  static const MessageType1 pHelp;
  // 7
  static const MessageType1 rHelp;
  // 8
  static const MessageType1 xHelp;
  // 9
  static const MessageType1 info1;
  // 10
  static const MessageType1 info2;
  // 11
  static const MessageType1 info3;
  // 12
  static const MessageFragment option;
  // 13
  static const MessageFragment name;
};
const MessageType1 SpamMessages::invalidMarkupArgument(
MessageType::error,
&appModule,
0
#ifndef SP_NO_MESSAGE_TEXT
,"invalid argument for -m option"
#endif
);
const MessageType0 SpamMessages::tagInSpecialMarkedSection(
MessageType::error,
&appModule,
1
#ifndef SP_NO_MESSAGE_TEXT
,"omitted start or end tag implied in CDATA or RCDATA marked section; not normalized"
#endif
);
const MessageType1 SpamMessages::hHelp(
MessageType::info,
&appModule,
2
#ifndef SP_NO_MESSAGE_TEXT
,"Hoist omitted tags."
#endif
);
const MessageType1 SpamMessages::lHelp(
MessageType::info,
&appModule,
3
#ifndef SP_NO_MESSAGE_TEXT
,"Prefer lowercase."
#endif
);
const MessageType1 SpamMessages::mHelp(
MessageType::info,
&appModule,
4
#ifndef SP_NO_MESSAGE_TEXT
,"Use markup option %1."
#endif
);
const MessageType1 SpamMessages::oHelp(
MessageType::info,
&appModule,
5
#ifndef SP_NO_MESSAGE_TEXT
,"Output the entity named %1."
#endif
);
const MessageType1 SpamMessages::pHelp(
MessageType::info,
&appModule,
6
#ifndef SP_NO_MESSAGE_TEXT
,"Output the prolog."
#endif
);
const MessageType1 SpamMessages::rHelp(
MessageType::info,
&appModule,
7
#ifndef SP_NO_MESSAGE_TEXT
,"Raw."
#endif
);
const MessageType1 SpamMessages::xHelp(
MessageType::info,
&appModule,
8
#ifndef SP_NO_MESSAGE_TEXT
,"Expand references."
#endif
);
const MessageType1 SpamMessages::info1(
MessageType::info,
&appModule,
9
#ifndef SP_NO_MESSAGE_TEXT
,"%1 is an SGML markup stream editor. %1 parses the SGML document"
#endif
);
const MessageType1 SpamMessages::info2(
MessageType::info,
&appModule,
10
#ifndef SP_NO_MESSAGE_TEXT
,"contained in SYSID... and copies portions of the document to the"
#endif
);
const MessageType1 SpamMessages::info3(
MessageType::info,
&appModule,
11
#ifndef SP_NO_MESSAGE_TEXT
,"standard output, adding or changing markup as specified by the options."
#endif
);
const MessageFragment SpamMessages::option(
&appModule,
12
#ifndef SP_NO_MESSAGE_TEXT
,"OPTION"
#endif
);
const MessageFragment SpamMessages::name(
&appModule,
13
#ifndef SP_NO_MESSAGE_TEXT
,"NAME"
#endif
);
#ifdef SP_NAMESPACE
}
#endif
