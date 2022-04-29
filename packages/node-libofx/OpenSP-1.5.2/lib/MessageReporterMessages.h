// This file was automatically generated from MessageReporterMessages.msg by msggen.pl.
#include "Message.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

struct MessageReporterMessages {
  // 5000
  static const MessageFragment infoTag;
  // 5001
  static const MessageFragment warningTag;
  // 5002
  static const MessageFragment quantityErrorTag;
  // 5003
  static const MessageFragment idrefErrorTag;
  // 5004
  static const MessageFragment errorTag;
  // 5005
  static const MessageFragment openElements;
  // 5006
  static const MessageFragment inNamedEntity;
  // 5007
  static const MessageFragment inUnnamedEntity;
  // 5008
  static const MessageFragment invalidLocation;
  // 5009
  static const MessageFragment offset;
  // 5010
  static const MessageFragment relevantClauses;
};
const MessageFragment MessageReporterMessages::infoTag(
&libModule,
5000
#ifndef SP_NO_MESSAGE_TEXT
,"I"
#endif
);
const MessageFragment MessageReporterMessages::warningTag(
&libModule,
5001
#ifndef SP_NO_MESSAGE_TEXT
,"W"
#endif
);
const MessageFragment MessageReporterMessages::quantityErrorTag(
&libModule,
5002
#ifndef SP_NO_MESSAGE_TEXT
,"Q"
#endif
);
const MessageFragment MessageReporterMessages::idrefErrorTag(
&libModule,
5003
#ifndef SP_NO_MESSAGE_TEXT
,"X"
#endif
);
const MessageFragment MessageReporterMessages::errorTag(
&libModule,
5004
#ifndef SP_NO_MESSAGE_TEXT
,"E"
#endif
);
const MessageFragment MessageReporterMessages::openElements(
&libModule,
5005
#ifndef SP_NO_MESSAGE_TEXT
,"open elements"
#endif
);
const MessageFragment MessageReporterMessages::inNamedEntity(
&libModule,
5006
#ifndef SP_NO_MESSAGE_TEXT
,"In entity %1 included from %2"
#endif
);
const MessageFragment MessageReporterMessages::inUnnamedEntity(
&libModule,
5007
#ifndef SP_NO_MESSAGE_TEXT
,"In entity included from %2"
#endif
);
const MessageFragment MessageReporterMessages::invalidLocation(
&libModule,
5008
#ifndef SP_NO_MESSAGE_TEXT
,"(invalid location)"
#endif
);
const MessageFragment MessageReporterMessages::offset(
&libModule,
5009
#ifndef SP_NO_MESSAGE_TEXT
,"offset "
#endif
);
const MessageFragment MessageReporterMessages::relevantClauses(
&libModule,
5010
#ifndef SP_NO_MESSAGE_TEXT
,"relevant clauses: "
#endif
);
#ifdef SP_NAMESPACE
}
#endif
