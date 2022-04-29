// This file was automatically generated from ParserAppMessages.msg by msggen.pl.
#include "Message.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

struct ParserAppMessages {
  // 4200
  static const MessageType1 unknownWarning;
  // 4201
  static const MessageType0 badErrorLimit;
  // 4202
  static const MessageType1 errorLimitExceeded;
  // 4203
  static const MessageType1 aHelp;
  // 4204
  static const MessageType1 AHelp;
  // 4205
  static const MessageType1 EHelp;
  // 4206
  static const MessageType1 eHelp;
  // 4207
  static const MessageType1 gHelp;
  // 4208
  static const MessageType1 nHelp;
  // 4209
  static const MessageType1 xHelp;
  // 4210
  static const MessageType1 iHelp;
  // 4211
  static const MessageType1 wHelp;
  // 4212
  static const MessageFragment type;
  // 4213
  static const MessageFragment name;
  // 4214
  static const MessageFragment number;
};
const MessageType1 ParserAppMessages::unknownWarning(
MessageType::error,
&libModule,
4200
#ifndef SP_NO_MESSAGE_TEXT
,"unknown warning type %1"
#endif
);
const MessageType0 ParserAppMessages::badErrorLimit(
MessageType::error,
&libModule,
4201
#ifndef SP_NO_MESSAGE_TEXT
,"invalid error limit"
#endif
);
const MessageType1 ParserAppMessages::errorLimitExceeded(
MessageType::info,
&libModule,
4202
#ifndef SP_NO_MESSAGE_TEXT
,"maximum number of errors (%1) reached; change with -E option"
#endif
);
const MessageType1 ParserAppMessages::aHelp(
MessageType::info,
&libModule,
4203
#ifndef SP_NO_MESSAGE_TEXT
,"Make doctype or linktype %1 active."
#endif
);
const MessageType1 ParserAppMessages::AHelp(
MessageType::info,
&libModule,
4204
#ifndef SP_NO_MESSAGE_TEXT
,"Parse wrt. architecture %1."
#endif
);
const MessageType1 ParserAppMessages::EHelp(
MessageType::info,
&libModule,
4205
#ifndef SP_NO_MESSAGE_TEXT
,"Give up after %1 errors."
#endif
);
const MessageType1 ParserAppMessages::eHelp(
MessageType::info,
&libModule,
4206
#ifndef SP_NO_MESSAGE_TEXT
,"Show open entities in error messages."
#endif
);
const MessageType1 ParserAppMessages::gHelp(
MessageType::info,
&libModule,
4207
#ifndef SP_NO_MESSAGE_TEXT
,"Show open elements in error messages."
#endif
);
const MessageType1 ParserAppMessages::nHelp(
MessageType::info,
&libModule,
4208
#ifndef SP_NO_MESSAGE_TEXT
,"Show error numbers in error messages."
#endif
);
const MessageType1 ParserAppMessages::xHelp(
MessageType::info,
&libModule,
4209
#ifndef SP_NO_MESSAGE_TEXT
,"Show references in error messages."
#endif
);
const MessageType1 ParserAppMessages::iHelp(
MessageType::info,
&libModule,
4210
#ifndef SP_NO_MESSAGE_TEXT
,"Define parameter entity %1 as \"INCLUDE\"."
#endif
);
const MessageType1 ParserAppMessages::wHelp(
MessageType::info,
&libModule,
4211
#ifndef SP_NO_MESSAGE_TEXT
,"Enable warning %1."
#endif
);
const MessageFragment ParserAppMessages::type(
&libModule,
4212
#ifndef SP_NO_MESSAGE_TEXT
,"TYPE"
#endif
);
const MessageFragment ParserAppMessages::name(
&libModule,
4213
#ifndef SP_NO_MESSAGE_TEXT
,"NAME"
#endif
);
const MessageFragment ParserAppMessages::number(
&libModule,
4214
#ifndef SP_NO_MESSAGE_TEXT
,"NUMBER"
#endif
);
#ifdef SP_NAMESPACE
}
#endif
