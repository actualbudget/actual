// This file was automatically generated from PosixStorageMessages.msg by msggen.pl.
#include "Message.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

struct PosixStorageMessages {
  // 2200
  static const MessageType2 readSystemCall;
  // 2201
  static const MessageType2 openSystemCall;
  // 2202
  static const MessageType2 closeSystemCall;
  // 2203
  static const MessageType2 lseekSystemCall;
  // 2204
  static const MessageType1 invalidFilename;
  // 2205
  static const MessageType2 fdRead;
  // 2206
  static const MessageType2 fdLseek;
  // 2207
  static const MessageType1 invalidNumber;
  // 2208
  static const MessageType2 cannotFind;
};
const MessageType2 PosixStorageMessages::readSystemCall(
MessageType::error,
&libModule,
2200
#ifndef SP_NO_MESSAGE_TEXT
,"error reading %1 (%2)"
#endif
);
const MessageType2 PosixStorageMessages::openSystemCall(
MessageType::error,
&libModule,
2201
#ifndef SP_NO_MESSAGE_TEXT
,"cannot open %1 (%2)"
#endif
);
const MessageType2 PosixStorageMessages::closeSystemCall(
MessageType::error,
&libModule,
2202
#ifndef SP_NO_MESSAGE_TEXT
,"error closing %1 (%2)"
#endif
);
const MessageType2 PosixStorageMessages::lseekSystemCall(
MessageType::error,
&libModule,
2203
#ifndef SP_NO_MESSAGE_TEXT
,"error seeking on %1 (%2)"
#endif
);
const MessageType1 PosixStorageMessages::invalidFilename(
MessageType::error,
&libModule,
2204
#ifndef SP_NO_MESSAGE_TEXT
,"invalid filename %1"
#endif
);
const MessageType2 PosixStorageMessages::fdRead(
MessageType::error,
&libModule,
2205
#ifndef SP_NO_MESSAGE_TEXT
,"error reading file descriptor %1 (%2)"
#endif
);
const MessageType2 PosixStorageMessages::fdLseek(
MessageType::error,
&libModule,
2206
#ifndef SP_NO_MESSAGE_TEXT
,"error seeking on file descriptor %1 (%2)"
#endif
);
const MessageType1 PosixStorageMessages::invalidNumber(
MessageType::error,
&libModule,
2207
#ifndef SP_NO_MESSAGE_TEXT
,"%1 is not a valid file descriptor number"
#endif
);
const MessageType2 PosixStorageMessages::cannotFind(
MessageType::error,
&libModule,
2208
#ifndef SP_NO_MESSAGE_TEXT
,"cannot find %1; tried %2"
#endif
);
#ifdef SP_NAMESPACE
}
#endif
