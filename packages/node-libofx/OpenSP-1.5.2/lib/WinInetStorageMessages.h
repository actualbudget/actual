// This file was automatically generated from WinInetStorageMessages.msg by msggen.pl.
#include "Message.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

struct WinInetStorageMessages {
  // 2500
  static const MessageType2 cannotOpen;
  // 2501
  static const MessageType2 readFailed;
};
const MessageType2 WinInetStorageMessages::cannotOpen(
MessageType::error,
&libModule,
2500
#ifndef SP_NO_MESSAGE_TEXT
,"cannot open URL %1 (%2)"
#endif
);
const MessageType2 WinInetStorageMessages::readFailed(
MessageType::error,
&libModule,
2501
#ifndef SP_NO_MESSAGE_TEXT
,"error reading URL %1 (%2)"
#endif
);
#ifdef SP_NAMESPACE
}
#endif
