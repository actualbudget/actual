// This file was automatically generated from CmdLineAppMessages.msg by msggen.pl.
#include "Message.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

struct CmdLineAppMessages {
  // 4000
  static const MessageType1 invalidOptionError;
  // 4001
  static const MessageType1 missingOptionArgError;
  // 4002
  static const MessageType1 ambiguousOptionError;
  // 4003
  static const MessageType1 erroneousOptionArgError;
  // 4004
  static const MessageType1 usage;
  // 4005
  static const MessageType1 usageCont;
  // 4006
  static const MessageType1 defaultUsage;
  // 4007
  static const MessageType1 usageStart;
  // 4008
  static const MessageType2 versionInfo;
  // 4009
  static const MessageType1 unknownBctf;
  // 4010
  static const MessageType1 unknownEncoding;
  // 4011
  static const MessageType2 openFileError;
  // 4012
  static const MessageType2 closeFileError;
  // 4013
  static const MessageType1 bHelp;
  // 4014
  static const MessageType1 eHelp;
  // 4015
  static const MessageType1 fHelp;
  // 4016
  static const MessageType1 vHelp;
  // 4017
  static const MessageType1 hHelp;
  // 4018
  static const MessageFragment name;
  // 4019
  static const MessageFragment file;
  // 4020
  static const MessageFragment noArg;
  // 4021
  static const MessageType0 tryHelpOptionForInfo;
  // 4022
  static const MessageFragment someArg;
  // 4023
  static const MessageType1 undocOption;
};
const MessageType1 CmdLineAppMessages::invalidOptionError(
MessageType::error,
&libModule,
4000
#ifndef SP_NO_MESSAGE_TEXT
,"invalid option %1"
#endif
);
const MessageType1 CmdLineAppMessages::missingOptionArgError(
MessageType::error,
&libModule,
4001
#ifndef SP_NO_MESSAGE_TEXT
,"missing argument for option %1"
#endif
);
const MessageType1 CmdLineAppMessages::ambiguousOptionError(
MessageType::error,
&libModule,
4002
#ifndef SP_NO_MESSAGE_TEXT
,"option %1 is ambiguous"
#endif
);
const MessageType1 CmdLineAppMessages::erroneousOptionArgError(
MessageType::error,
&libModule,
4003
#ifndef SP_NO_MESSAGE_TEXT
,"option %1 doesn't allow an argument"
#endif
);
const MessageType1 CmdLineAppMessages::usage(
MessageType::info,
&libModule,
4004
#ifndef SP_NO_MESSAGE_TEXT
,"Usage: %1"
#endif
);
const MessageType1 CmdLineAppMessages::usageCont(
MessageType::info,
&libModule,
4005
#ifndef SP_NO_MESSAGE_TEXT
,"or: %1"
#endif
);
const MessageType1 CmdLineAppMessages::defaultUsage(
MessageType::info,
&libModule,
4006
#ifndef SP_NO_MESSAGE_TEXT
,"%1 [OPTION] SYSID..."
#endif
);
const MessageType1 CmdLineAppMessages::usageStart(
MessageType::info,
&libModule,
4007
#ifndef SP_NO_MESSAGE_TEXT
,"Short options need the same arguments as their long forms."
#endif
);
const MessageType2 CmdLineAppMessages::versionInfo(
MessageType::info,
&libModule,
4008
#ifndef SP_NO_MESSAGE_TEXT
,"%1 version %2"
#endif
);
const MessageType1 CmdLineAppMessages::unknownBctf(
MessageType::error,
&libModule,
4009
#ifndef SP_NO_MESSAGE_TEXT
,"unknown BCTF %1"
#endif
);
const MessageType1 CmdLineAppMessages::unknownEncoding(
MessageType::error,
&libModule,
4010
#ifndef SP_NO_MESSAGE_TEXT
,"unknown encoding %1"
#endif
);
const MessageType2 CmdLineAppMessages::openFileError(
MessageType::error,
&libModule,
4011
#ifndef SP_NO_MESSAGE_TEXT
,"cannot open output file %1 (%2)"
#endif
);
const MessageType2 CmdLineAppMessages::closeFileError(
MessageType::error,
&libModule,
4012
#ifndef SP_NO_MESSAGE_TEXT
,"cannot close output file %1 (%2)"
#endif
);
const MessageType1 CmdLineAppMessages::bHelp(
MessageType::info,
&libModule,
4013
#ifndef SP_NO_MESSAGE_TEXT
,"Use bctf %1 for output."
#endif
);
const MessageType1 CmdLineAppMessages::eHelp(
MessageType::info,
&libModule,
4014
#ifndef SP_NO_MESSAGE_TEXT
,"Use encoding %1 for output."
#endif
);
const MessageType1 CmdLineAppMessages::fHelp(
MessageType::info,
&libModule,
4015
#ifndef SP_NO_MESSAGE_TEXT
,"Append error messages to file %1."
#endif
);
const MessageType1 CmdLineAppMessages::vHelp(
MessageType::info,
&libModule,
4016
#ifndef SP_NO_MESSAGE_TEXT
,"Display the program version."
#endif
);
const MessageType1 CmdLineAppMessages::hHelp(
MessageType::info,
&libModule,
4017
#ifndef SP_NO_MESSAGE_TEXT
,"Show this help text."
#endif
);
const MessageFragment CmdLineAppMessages::name(
&libModule,
4018
#ifndef SP_NO_MESSAGE_TEXT
,"NAME"
#endif
);
const MessageFragment CmdLineAppMessages::file(
&libModule,
4019
#ifndef SP_NO_MESSAGE_TEXT
,"FILE"
#endif
);
const MessageFragment CmdLineAppMessages::noArg(
&libModule,
4020
#ifndef SP_NO_MESSAGE_TEXT
,"NOTHING"
#endif
);
const MessageType0 CmdLineAppMessages::tryHelpOptionForInfo(
MessageType::info,
&libModule,
4021
#ifndef SP_NO_MESSAGE_TEXT
,"Try the \"--help\" option for more information."
#endif
);
const MessageFragment CmdLineAppMessages::someArg(
&libModule,
4022
#ifndef SP_NO_MESSAGE_TEXT
,"ARG"
#endif
);
const MessageType1 CmdLineAppMessages::undocOption(
MessageType::info,
&libModule,
4023
#ifndef SP_NO_MESSAGE_TEXT
,"Undocumented option (check the application's manual)."
#endif
);
#ifdef SP_NAMESPACE
}
#endif
