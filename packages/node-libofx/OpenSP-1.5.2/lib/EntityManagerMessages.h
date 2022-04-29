// This file was automatically generated from EntityManagerMessages.msg by msggen.pl.
#include "Message.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

struct EntityManagerMessages {
  // 2000
  static const MessageType1 fsiSyntax;
  // 2001
  static const MessageType1 fsiMissingValue;
  // 2002
  static const MessageType1 fsiValueAsName;
  // 2003
  static const MessageType1 fsiBadSmcrd;
  // 2004
  static const MessageType1 fsiUnknownBctf;
  // 2005
  static const MessageType1 fsiUnknownEncoding;
  // 2006
  static const MessageType1 fsiUnsupportedRecords;
  // 2007
  static const MessageType1 fsiUnsupportedAttribute;
  // 2008
  static const MessageType1 fsiUnsupportedAttributeToken;
  // 2009
  static const MessageType1 fsiBadTracking;
  // 2010
  static const MessageType1 fsiDuplicateAttribute;
  // 2011
  static const MessageType1 fsiBadZapeof;
  // 2012
  static const MessageType1 fsiBadSearch;
  // 2013
  static const MessageType1 fsiBadFold;
  // 2014
  static const MessageType0 fsiFoldNotNeutral;
  // 2015
  static const MessageType0 fsiBctfEncodingNotApplicable;
  // 2016
  static const MessageType0 fsiBctfAndEncoding;
  // 2017
  static const MessageType0 fsiZapeofNotApplicable;
  // 2018
  static const MessageType0 fsiRecordsNotApplicable;
  // 2019
  static const MessageType1 fsiBadIndirect;
  // 2020
  static const MessageType1 fsiLookupChar;
};
const MessageType1 EntityManagerMessages::fsiSyntax(
MessageType::error,
&libModule,
2000
#ifndef SP_NO_MESSAGE_TEXT
,"bad formal system identifier syntax in %1"
#endif
);
const MessageType1 EntityManagerMessages::fsiMissingValue(
MessageType::error,
&libModule,
2001
#ifndef SP_NO_MESSAGE_TEXT
,"value for attribute %1 missing in formal system identifier"
#endif
);
const MessageType1 EntityManagerMessages::fsiValueAsName(
MessageType::error,
&libModule,
2002
#ifndef SP_NO_MESSAGE_TEXT
,"%1 is a formal system identifier attribute value not an attribute name"
#endif
);
const MessageType1 EntityManagerMessages::fsiBadSmcrd(
MessageType::error,
&libModule,
2003
#ifndef SP_NO_MESSAGE_TEXT
,"value of smcrd attribute must be a single character not %1"
#endif
);
const MessageType1 EntityManagerMessages::fsiUnknownBctf(
MessageType::error,
&libModule,
2004
#ifndef SP_NO_MESSAGE_TEXT
,"unknown BCTF %1"
#endif
);
const MessageType1 EntityManagerMessages::fsiUnknownEncoding(
MessageType::error,
&libModule,
2005
#ifndef SP_NO_MESSAGE_TEXT
,"unknown encoding %1"
#endif
);
const MessageType1 EntityManagerMessages::fsiUnsupportedRecords(
MessageType::error,
&libModule,
2006
#ifndef SP_NO_MESSAGE_TEXT
,"unsupported record boundary indicator %1"
#endif
);
const MessageType1 EntityManagerMessages::fsiUnsupportedAttribute(
MessageType::warning,
&libModule,
2007
#ifndef SP_NO_MESSAGE_TEXT
,"unsupported formal system identifier attribute %1"
#endif
);
const MessageType1 EntityManagerMessages::fsiUnsupportedAttributeToken(
MessageType::warning,
&libModule,
2008
#ifndef SP_NO_MESSAGE_TEXT
,"unsupported formal system identifier attribute value %1"
#endif
);
const MessageType1 EntityManagerMessages::fsiBadTracking(
MessageType::error,
&libModule,
2009
#ifndef SP_NO_MESSAGE_TEXT
,"bad value %1 for formal system identifier tracking attribute"
#endif
);
const MessageType1 EntityManagerMessages::fsiDuplicateAttribute(
MessageType::error,
&libModule,
2010
#ifndef SP_NO_MESSAGE_TEXT
,"duplicate specification for formal system identifier attribute %1"
#endif
);
const MessageType1 EntityManagerMessages::fsiBadZapeof(
MessageType::error,
&libModule,
2011
#ifndef SP_NO_MESSAGE_TEXT
,"bad value %1 for formal system identifier zapeof attribute"
#endif
);
const MessageType1 EntityManagerMessages::fsiBadSearch(
MessageType::error,
&libModule,
2012
#ifndef SP_NO_MESSAGE_TEXT
,"bad value %1 for formal system identifier search attribute"
#endif
);
const MessageType1 EntityManagerMessages::fsiBadFold(
MessageType::error,
&libModule,
2013
#ifndef SP_NO_MESSAGE_TEXT
,"bad value %1 for formal system identifier fold attribute"
#endif
);
const MessageType0 EntityManagerMessages::fsiFoldNotNeutral(
MessageType::error,
&libModule,
2014
#ifndef SP_NO_MESSAGE_TEXT
,"fold attribute allowed only for neutral storage manager"
#endif
);
const MessageType0 EntityManagerMessages::fsiBctfEncodingNotApplicable(
MessageType::error,
&libModule,
2015
#ifndef SP_NO_MESSAGE_TEXT
,"bctf and encoding attributes not applicable to this storage manager"
#endif
);
const MessageType0 EntityManagerMessages::fsiBctfAndEncoding(
MessageType::error,
&libModule,
2016
#ifndef SP_NO_MESSAGE_TEXT
,"cannot specify both bctf and encoding attribute"
#endif
);
const MessageType0 EntityManagerMessages::fsiZapeofNotApplicable(
MessageType::error,
&libModule,
2017
#ifndef SP_NO_MESSAGE_TEXT
,"zapeof attribute not applicable to this storage manager"
#endif
);
const MessageType0 EntityManagerMessages::fsiRecordsNotApplicable(
MessageType::error,
&libModule,
2018
#ifndef SP_NO_MESSAGE_TEXT
,"records attribute not applicable to this storage manager"
#endif
);
const MessageType1 EntityManagerMessages::fsiBadIndirect(
MessageType::error,
&libModule,
2019
#ifndef SP_NO_MESSAGE_TEXT
,"bad value %1 for formal system identifier indirect attribute"
#endif
);
const MessageType1 EntityManagerMessages::fsiLookupChar(
MessageType::error,
&libModule,
2020
#ifndef SP_NO_MESSAGE_TEXT
,"non-minimum data character (number %1) in value of formal system identifier lookup attribute"
#endif
);
#ifdef SP_NAMESPACE
}
#endif
