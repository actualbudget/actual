// This file was automatically generated from ArcEngineMessages.msg by msggen.pl.
#include "Message.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

struct ArcEngineMessages {
  // 3000
  static const MessageType1 arcGenerateSystemId;
  // 3001
  static const MessageType1 undefinedElement;
  // 3002
  static const MessageType1 elementExcluded;
  // 3003
  static const MessageType1 invalidElement;
  // 3004
  static const MessageType1 documentElementNotArc;
  // 3005
  static const MessageType1 unfinishedElement;
  // 3006
  static const MessageType0 renameMissingAttName;
  // 3007
  static const MessageType1 renameToInvalid;
  // 3008
  static const MessageType1 renameToDuplicate;
  // 3009
  static const MessageType1 renameFromInvalid;
  // 3010
  static const MessageType1 missingId;
  // 3011
  static const MessageType0 invalidArcContent;
  // 3012
  static const MessageType1 invalidSuppress;
  // 3013
  static const MessageType1 arcDtdNotDeclaredParameter;
  // 3014
  static const MessageType1 arcDtdNotDeclaredGeneral;
  // 3015
  static const MessageType1 arcDtdNotExternal;
  // 3016
  static const MessageType0 noArcDTDAtt;
  // 3017
  static const MessageType1 noArcDataF;
  // 3018
  static const MessageType1 idMismatch;
  // 3019
  static const MessageType1 invalidArcAuto;
  // 3020
  static const MessageType1 noArcNotation;
  // 3021
  static const MessageType0 invalidData;
  // 3022
  static const MessageType1 invalidIgnD;
  // 3024
  static const MessageType1 invalidQuantity;
  // 3025
  static const MessageType1 missingQuantityValue;
  // 3026
  static const MessageType1 quantityValueTooLong;
  // 3027
  static const MessageType1 invalidDigit;
  // 3028
  static const MessageType0 arcIndrNotSupported;
  // 3029
  static const MessageType0 arcContDuplicate;
  // 3030
  static const MessageType1 arcContInvalid;
  // 3031
  static const MessageType1 renameFromDuplicate;
  // 3032
  static const MessageType0 contentDuplicate;
  // 3033
  static const MessageType0 is10744PiKeywordMissing;
  // 3034
  static const MessageType1 is10744PiKeywordInvalid;
  // 3035
  static const MessageType1L duplicateArcDecl;
  // 3037
  static const MessageType1L ignoringPiArcDecl;
  // 3039
  static const MessageType1L ignoringArcBaseArcDecl;
};
const MessageType1 ArcEngineMessages::arcGenerateSystemId(
MessageType::error,
&libModule,
3000
#ifndef SP_NO_MESSAGE_TEXT
,"no system identifier could be generated for meta-DTD for architecture %1"
#endif
);
const MessageType1 ArcEngineMessages::undefinedElement(
MessageType::error,
&libModule,
3001
#ifndef SP_NO_MESSAGE_TEXT
,"element type %1 not defined in meta-DTD"
#endif
);
const MessageType1 ArcEngineMessages::elementExcluded(
MessageType::error,
&libModule,
3002
#ifndef SP_NO_MESSAGE_TEXT
,"element %1 invalid in meta-DTD because excluded"
#endif
);
const MessageType1 ArcEngineMessages::invalidElement(
MessageType::error,
&libModule,
3003
#ifndef SP_NO_MESSAGE_TEXT
,"meta-DTD does not allow element %1 at this point"
#endif
);
const MessageType1 ArcEngineMessages::documentElementNotArc(
MessageType::error,
&libModule,
3004
#ifndef SP_NO_MESSAGE_TEXT
,"document element must be instance of %1 element type form"
#endif
);
const MessageType1 ArcEngineMessages::unfinishedElement(
MessageType::error,
&libModule,
3005
#ifndef SP_NO_MESSAGE_TEXT
,"element %1 unfinished in meta-DTD"
#endif
);
const MessageType0 ArcEngineMessages::renameMissingAttName(
MessageType::error,
&libModule,
3006
#ifndef SP_NO_MESSAGE_TEXT
,"missing substitute name"
#endif
);
const MessageType1 ArcEngineMessages::renameToInvalid(
MessageType::error,
&libModule,
3007
#ifndef SP_NO_MESSAGE_TEXT
,"substitute for non-existent architecture attribute %1"
#endif
);
const MessageType1 ArcEngineMessages::renameToDuplicate(
MessageType::error,
&libModule,
3008
#ifndef SP_NO_MESSAGE_TEXT
,"substitute name for %1 already defined"
#endif
);
const MessageType1 ArcEngineMessages::renameFromInvalid(
MessageType::error,
&libModule,
3009
#ifndef SP_NO_MESSAGE_TEXT
,"substitute name %1 is not the name of an attribute"
#endif
);
const MessageType1 ArcEngineMessages::missingId(
MessageType::idrefError,
&libModule,
3010
#ifndef SP_NO_MESSAGE_TEXT
,"reference in architecture to non-existent ID %1"
#endif
);
const MessageType0 ArcEngineMessages::invalidArcContent(
MessageType::error,
&libModule,
3011
#ifndef SP_NO_MESSAGE_TEXT
,"architectural content specified with #ARCCONT not allowed by meta-DTD"
#endif
);
const MessageType1 ArcEngineMessages::invalidSuppress(
MessageType::error,
&libModule,
3012
#ifndef SP_NO_MESSAGE_TEXT
,"invalid value %1 for ArcSupr attribute"
,"ISO/IEC 10744:1997 A3.5.3"
#endif
);
const MessageType1 ArcEngineMessages::arcDtdNotDeclaredParameter(
MessageType::error,
&libModule,
3013
#ifndef SP_NO_MESSAGE_TEXT
,"no declaration for meta-DTD parameter entity %1"
,"ISO/IEC 10744:1997 A3.4.2"
#endif
);
const MessageType1 ArcEngineMessages::arcDtdNotDeclaredGeneral(
MessageType::error,
&libModule,
3014
#ifndef SP_NO_MESSAGE_TEXT
,"no declaration for meta-DTD general entity %1"
,"ISO/IEC 10744:1997 A3.4.2"
#endif
);
const MessageType1 ArcEngineMessages::arcDtdNotExternal(
MessageType::error,
&libModule,
3015
#ifndef SP_NO_MESSAGE_TEXT
,"meta-DTD entity %1 must be external"
,"ISO/IEC 10744:1997 A3.4.2"
#endif
);
const MessageType0 ArcEngineMessages::noArcDTDAtt(
MessageType::warning,
&libModule,
3016
#ifndef SP_NO_MESSAGE_TEXT
,"no ArcDTD architecture support attribute specified"
,"ISO/IEC 10744:1997 A3.4.2"
#endif
);
const MessageType1 ArcEngineMessages::noArcDataF(
MessageType::error,
&libModule,
3017
#ifndef SP_NO_MESSAGE_TEXT
,"ArcDataF notation %1 not defined in meta-DTD"
,"ISO/IEC 10744:1997 A3.4.2"
#endif
);
const MessageType1 ArcEngineMessages::idMismatch(
MessageType::error,
&libModule,
3018
#ifndef SP_NO_MESSAGE_TEXT
,"ID attribute %1 in meta-DTD not declared as ID in DTD"
,"ISO/IEC 10744:1997 A3.6.4"
#endif
);
const MessageType1 ArcEngineMessages::invalidArcAuto(
MessageType::error,
&libModule,
3019
#ifndef SP_NO_MESSAGE_TEXT
,"invalid value %1 for ArcAuto architectural support attribute"
,"ISO/IEC 10744:1997 A3.4.2"
#endif
);
const MessageType1 ArcEngineMessages::noArcNotation(
MessageType::error,
&libModule,
3020
#ifndef SP_NO_MESSAGE_TEXT
,"no notation declaration for architecture %1"
,"ISO/IEC 10744:1997 A3.4.1"
#endif
);
const MessageType0 ArcEngineMessages::invalidData(
MessageType::error,
&libModule,
3021
#ifndef SP_NO_MESSAGE_TEXT
,"meta-DTD does not allow data at this point"
#endif
);
const MessageType1 ArcEngineMessages::invalidIgnD(
MessageType::error,
&libModule,
3022
#ifndef SP_NO_MESSAGE_TEXT
,"invalid value %1 for ArcIgnD attribute"
,"ISO/IEC 10744:1997 A3.5.4"
#endif
);
const MessageType1 ArcEngineMessages::invalidQuantity(
MessageType::error,
&libModule,
3024
#ifndef SP_NO_MESSAGE_TEXT
,"unrecognized quantity name %1"
#endif
);
const MessageType1 ArcEngineMessages::missingQuantityValue(
MessageType::error,
&libModule,
3025
#ifndef SP_NO_MESSAGE_TEXT
,"no value specified for quantity %1"
#endif
);
const MessageType1 ArcEngineMessages::quantityValueTooLong(
MessageType::error,
&libModule,
3026
#ifndef SP_NO_MESSAGE_TEXT
,"length of value %1 for quantity is too long"
#endif
);
const MessageType1 ArcEngineMessages::invalidDigit(
MessageType::error,
&libModule,
3027
#ifndef SP_NO_MESSAGE_TEXT
,"invalid digit %1"
#endif
);
const MessageType0 ArcEngineMessages::arcIndrNotSupported(
MessageType::error,
&libModule,
3028
#ifndef SP_NO_MESSAGE_TEXT
,"only value of nArcIndr for ArcIndr attribute supported"
#endif
);
const MessageType0 ArcEngineMessages::arcContDuplicate(
MessageType::error,
&libModule,
3029
#ifndef SP_NO_MESSAGE_TEXT
,"#ARCCONT attribute already specified"
,"ISO/IEC 10744:1997 A3.5.2"
#endif
);
const MessageType1 ArcEngineMessages::arcContInvalid(
MessageType::error,
&libModule,
3030
#ifndef SP_NO_MESSAGE_TEXT
,"invalid value %1 for #ARCCONT"
,"ISO/IEC 10744:1997 A3.5.2"
#endif
);
const MessageType1 ArcEngineMessages::renameFromDuplicate(
MessageType::error,
&libModule,
3031
#ifndef SP_NO_MESSAGE_TEXT
,"%1 already used as a substitute name"
,"ISO/IEC 10744:1997 A3.5.2"
#endif
);
const MessageType0 ArcEngineMessages::contentDuplicate(
MessageType::error,
&libModule,
3032
#ifndef SP_NO_MESSAGE_TEXT
,"substitute name #CONTENT already specified"
,"ISO/IEC 10744:1997 A3.5.2"
#endif
);
const MessageType0 ArcEngineMessages::is10744PiKeywordMissing(
MessageType::error,
&libModule,
3033
#ifndef SP_NO_MESSAGE_TEXT
,"IS10744 PI keyword missing"
#endif
);
const MessageType1 ArcEngineMessages::is10744PiKeywordInvalid(
MessageType::error,
&libModule,
3034
#ifndef SP_NO_MESSAGE_TEXT
,"invalid IS10744 PI keyword %1"
#endif
);
const MessageType1L ArcEngineMessages::duplicateArcDecl(
MessageType::error,
&libModule,
3035
#ifndef SP_NO_MESSAGE_TEXT
,"architecture %1 already defined"
,0
,"the first definition"
#endif
);
const MessageType1L ArcEngineMessages::ignoringPiArcDecl(
MessageType::warning,
&libModule,
3037
#ifndef SP_NO_MESSAGE_TEXT
,"ignoring PI declaration of architecture %1"
,0
,"the ArcBase definition"
#endif
);
const MessageType1L ArcEngineMessages::ignoringArcBaseArcDecl(
MessageType::warning,
&libModule,
3039
#ifndef SP_NO_MESSAGE_TEXT
,"ignoring ArcBase declaration of architecture %1"
,0
,"the PI definition"
#endif
);
#ifdef SP_NAMESPACE
}
#endif
