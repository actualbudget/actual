// This file was automatically generated from RastEventHandlerMessages.msg by msggen.pl.
#include "Message.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

struct RastEventHandlerMessages {
  // 100
  static const MessageType0 invalidRastPiError;
  // 101
  static const MessageType1 invalidActiveLinkType;
  // 102
  static const MessageType1 duplicateActiveLinkType;
  // 103
  static const MessageType0 multipleLinkRuleMatch;
  // 104
  static const MessageType0 noLinkRuleMatch;
  // 105
  static const MessageType0 multipleLinkRules;
};
const MessageType0 RastEventHandlerMessages::invalidRastPiError(
MessageType::error,
&appModule,
100
#ifndef SP_NO_MESSAGE_TEXT
,"invalid RAST processing instruction"
#endif
);
const MessageType1 RastEventHandlerMessages::invalidActiveLinkType(
MessageType::error,
&appModule,
101
#ifndef SP_NO_MESSAGE_TEXT
,"invalid link type %1 in rast-active-lpd processing instruction"
#endif
);
const MessageType1 RastEventHandlerMessages::duplicateActiveLinkType(
MessageType::error,
&appModule,
102
#ifndef SP_NO_MESSAGE_TEXT
,"duplicate link type %1 in rast-active-lpd processing instruction"
#endif
);
const MessageType0 RastEventHandlerMessages::multipleLinkRuleMatch(
MessageType::error,
&appModule,
103
#ifndef SP_NO_MESSAGE_TEXT
,"rast-link-rule: processing instruction matches more than one link rule"
#endif
);
const MessageType0 RastEventHandlerMessages::noLinkRuleMatch(
MessageType::error,
&appModule,
104
#ifndef SP_NO_MESSAGE_TEXT
,"rast-link-rule: processing instruction does not match any link rules"
#endif
);
const MessageType0 RastEventHandlerMessages::multipleLinkRules(
MessageType::error,
&appModule,
105
#ifndef SP_NO_MESSAGE_TEXT
,"multiple applicable link rules without disambiguating rast-link-rule: processing instruction"
#endif
);
#ifdef SP_NAMESPACE
}
#endif
