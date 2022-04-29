// This file was automatically generated from ParserMessages.msg by msggen.pl.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"
#include "ParserMessages.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

const MessageType1 ParserMessages::nameLength(
MessageType::quantityError,
&libModule,
0
#ifndef SP_NO_MESSAGE_TEXT
,"length of name must not exceed NAMELEN (%1)"
,"ISO 8879:1986 9.3.1"
#endif
);
const MessageType1 ParserMessages::parameterEntityNameLength(
MessageType::quantityError,
&libModule,
1
#ifndef SP_NO_MESSAGE_TEXT
,"length of parameter entity name must not exceed NAMELEN less the length of the PERO delimiter (%1)"
,"ISO 8879:1986 10.5.1.1"
#endif
);
const MessageType1 ParserMessages::numberLength(
MessageType::quantityError,
&libModule,
2
#ifndef SP_NO_MESSAGE_TEXT
,"length of number must not exceed NAMELEN (%1)"
,"ISO 8879:1986 9.3.1"
#endif
);
const MessageType1 ParserMessages::attributeValueLength(
MessageType::quantityError,
&libModule,
3
#ifndef SP_NO_MESSAGE_TEXT
,"length of attribute value must not exceed LITLEN less NORMSEP (%1)"
,"ISO 8879:1986 7.9.4.5"
#endif
);
const MessageType0 ParserMessages::peroGrpoProlog(
MessageType::error,
&libModule,
4
#ifndef SP_NO_MESSAGE_TEXT
,"a name group is not allowed in a parameter entity reference in the prolog"
,"ISO 8879:1986 9.4.4p3"
#endif
);
const MessageType0 ParserMessages::groupLevel(
MessageType::error,
&libModule,
5
#ifndef SP_NO_MESSAGE_TEXT
,"an entity end in a token separator must terminate an entity referenced in the same group"
,"ISO 8879:1986 10.1.3p8"
#endif
);
const MessageType2 ParserMessages::groupCharacter(
MessageType::error,
&libModule,
6
#ifndef SP_NO_MESSAGE_TEXT
,"character %1 invalid: only %2 and token separators allowed"
#endif
);
const MessageType0 ParserMessages::psRequired(
MessageType::error,
&libModule,
7
#ifndef SP_NO_MESSAGE_TEXT
,"a parameter separator is required after a number that is followed by a name start character"
,"ISO 8879:1986 10.1.1p4"
#endif
);
const MessageType2 ParserMessages::markupDeclarationCharacter(
MessageType::error,
&libModule,
8
#ifndef SP_NO_MESSAGE_TEXT
,"character %1 invalid: only %2 and parameter separators allowed"
#endif
);
const MessageType0 ParserMessages::declarationLevel(
MessageType::error,
&libModule,
9
#ifndef SP_NO_MESSAGE_TEXT
,"an entity end in a parameter separator must terminate an entity referenced in the same declaration"
,"ISO 8879:1986 10.1.1p3"
#endif
);
const MessageType0 ParserMessages::groupEntityEnd(
MessageType::error,
&libModule,
10
#ifndef SP_NO_MESSAGE_TEXT
,"an entity end is not allowed in a token separator that does not follow a token"
,"ISO 8879:1986 10.1.3p8"
#endif
);
const MessageType1 ParserMessages::invalidToken(
MessageType::error,
&libModule,
11
#ifndef SP_NO_MESSAGE_TEXT
,"%1 is not a valid token here"
#endif
);
const MessageType0 ParserMessages::groupEntityReference(
MessageType::error,
&libModule,
12
#ifndef SP_NO_MESSAGE_TEXT
,"a parameter entity reference can only occur in a group where a token could occur"
,"ISO 8879:1986 10.1.3p7"
#endif
);
const MessageType1 ParserMessages::duplicateGroupToken(
MessageType::error,
&libModule,
13
#ifndef SP_NO_MESSAGE_TEXT
,"token %1 has already occurred in this group"
,"ISO 8879:1986 10.1.3p6"
#endif
);
const MessageType1 ParserMessages::groupCount(
MessageType::quantityError,
&libModule,
14
#ifndef SP_NO_MESSAGE_TEXT
,"the number of tokens in a group must not exceed GRPCNT (%1)"
,"ISO 8879:1986 10.1.3.1"
#endif
);
const MessageType0 ParserMessages::literalLevel(
MessageType::error,
&libModule,
15
#ifndef SP_NO_MESSAGE_TEXT
,"an entity end in a literal must terminate an entity referenced in the same literal"
,"ISO 8879:1986 10.1.2p6 9.1.1p3"
#endif
);
const MessageType1 ParserMessages::literalMinimumData(
MessageType::error,
&libModule,
16
#ifndef SP_NO_MESSAGE_TEXT
,"character %1 invalid: only minimum data characters allowed"
,"ISO 8879:1986 10.1.7p3"
#endif
);
const MessageType0 ParserMessages::dataTagPatternNonSgml(
MessageType::error,
&libModule,
18
#ifndef SP_NO_MESSAGE_TEXT
,"a parameter literal in a data tag pattern must not contain a numeric character reference to a non-SGML character"
,"ISO 8879:1986 11.2.4.4p9"
#endif
);
const MessageType0 ParserMessages::dataTagPatternFunction(
MessageType::error,
&libModule,
19
#ifndef SP_NO_MESSAGE_TEXT
,"a parameter literal in a data tag pattern must not contain a numeric character reference to a function character"
,"ISO 8879:1986 11.2.4.4p9"
#endif
);
const MessageType0 ParserMessages::eroGrpoStartTag(
MessageType::error,
&libModule,
20
#ifndef SP_NO_MESSAGE_TEXT
,"a name group is not allowed in a general entity reference in a start tag"
,"ISO 8879:1986 9.4.4p3"
#endif
);
const MessageType0 ParserMessages::eroGrpoProlog(
MessageType::error,
&libModule,
21
#ifndef SP_NO_MESSAGE_TEXT
,"a name group is not allowed in a general entity reference in the prolog"
,"ISO 8879:1986 9.4.4p3"
#endif
);
const MessageType1 ParserMessages::functionName(
MessageType::error,
&libModule,
22
#ifndef SP_NO_MESSAGE_TEXT
,"%1 is not a function name"
,"ISO 8879:1986 9.5p4"
#endif
);
const MessageType1 ParserMessages::characterNumber(
MessageType::error,
&libModule,
23
#ifndef SP_NO_MESSAGE_TEXT
,"%1 is not a character number in the document character set"
,"ISO 8879:1986 4.36"
#endif
);
const MessageType1 ParserMessages::parameterEntityUndefined(
MessageType::error,
&libModule,
24
#ifndef SP_NO_MESSAGE_TEXT
,"parameter entity %1 not defined"
,"ISO 8879:1986 9.4.4.1p2"
#endif
);
const MessageType1 ParserMessages::entityUndefined(
MessageType::error,
&libModule,
25
#ifndef SP_NO_MESSAGE_TEXT
,"general entity %1 not defined and no default entity"
,"ISO 8879:1986 9.4.4.1p2"
#endif
);
const MessageType0 ParserMessages::rniNameStart(
MessageType::error,
&libModule,
26
#ifndef SP_NO_MESSAGE_TEXT
,"RNI delimiter must be followed by name start character"
#endif
);
const MessageType0L ParserMessages::commentEntityEnd(
MessageType::error,
&libModule,
28
#ifndef SP_NO_MESSAGE_TEXT
,"unterminated comment: found end of entity inside comment"
,"ISO 8879:1986 10.3p2"
,"comment started here"
#endif
);
const MessageType0 ParserMessages::mixedConnectors(
MessageType::warning,
&libModule,
30
#ifndef SP_NO_MESSAGE_TEXT
,"only one type of connector should be used in a single group"
,"ISO 8879:1986 10.1.3p4"
#endif
);
const MessageType1 ParserMessages::noSuchReservedName(
MessageType::error,
&libModule,
31
#ifndef SP_NO_MESSAGE_TEXT
,"%1 is not a reserved name"
#endif
);
const MessageType1 ParserMessages::invalidReservedName(
MessageType::error,
&libModule,
32
#ifndef SP_NO_MESSAGE_TEXT
,"%1 is not allowed as a reserved name here"
#endif
);
const MessageType1 ParserMessages::minimumLiteralLength(
MessageType::quantityError,
&libModule,
33
#ifndef SP_NO_MESSAGE_TEXT
,"length of interpreted minimum literal must not exceed reference LITLEN (%1)"
,"ISO 8879:1986 10.1.7.1"
#endif
);
const MessageType1 ParserMessages::tokenizedAttributeValueLength(
MessageType::quantityError,
&libModule,
34
#ifndef SP_NO_MESSAGE_TEXT
,"length of tokenized attribute value must not exceed LITLEN less NORMSEP (%1)"
,"ISO 8879:1986 7.9.4.5 7.9.3p5"
#endif
);
const MessageType1 ParserMessages::systemIdentifierLength(
MessageType::quantityError,
&libModule,
35
#ifndef SP_NO_MESSAGE_TEXT
,"length of system identifier must not exceed LITLEN (%1)"
,"ISO 8879:1986 10.1.6.1"
#endif
);
const MessageType1 ParserMessages::parameterLiteralLength(
MessageType::quantityError,
&libModule,
36
#ifndef SP_NO_MESSAGE_TEXT
,"length of interpreted parameter literal must not exceed LITLEN (%1)"
,"ISO 8879:1986 10.1.2.1"
#endif
);
const MessageType1 ParserMessages::dataTagPatternLiteralLength(
MessageType::quantityError,
&libModule,
37
#ifndef SP_NO_MESSAGE_TEXT
,"length of interpreted parameter literal in data tag pattern must not exceed DTEMPLEN (%1)"
,"ISO 8879:1986 11.2.4.5p3"
#endif
);
const MessageType0 ParserMessages::literalClosingDelimiter(
MessageType::error,
&libModule,
38
#ifndef SP_NO_MESSAGE_TEXT
,"literal is missing closing delimiter"
#endif
);
const MessageType2 ParserMessages::paramInvalidToken(
MessageType::error,
&libModule,
39
#ifndef SP_NO_MESSAGE_TEXT
,"%1 invalid: only %2 and parameter separators are allowed"
#endif
);
const MessageType2 ParserMessages::groupTokenInvalidToken(
MessageType::error,
&libModule,
40
#ifndef SP_NO_MESSAGE_TEXT
,"%1 invalid: only %2 and token separators are allowed"
#endif
);
const MessageType2 ParserMessages::connectorInvalidToken(
MessageType::error,
&libModule,
41
#ifndef SP_NO_MESSAGE_TEXT
,"%1 invalid: only %2 and token separators are allowed"
#endif
);
const MessageType1 ParserMessages::noSuchDeclarationType(
MessageType::error,
&libModule,
42
#ifndef SP_NO_MESSAGE_TEXT
,"unknown declaration type %1"
#endif
);
const MessageType1 ParserMessages::dtdSubsetDeclaration(
MessageType::error,
&libModule,
43
#ifndef SP_NO_MESSAGE_TEXT
,"%1 declaration not allowed in DTD subset"
#endif
);
const MessageType1 ParserMessages::declSubsetCharacter(
MessageType::error,
&libModule,
44
#ifndef SP_NO_MESSAGE_TEXT
,"character %1 not allowed in declaration subset"
#endif
);
const MessageType0 ParserMessages::documentEndDtdSubset(
MessageType::error,
&libModule,
45
#ifndef SP_NO_MESSAGE_TEXT
,"end of document in DTD subset"
#endif
);
const MessageType1 ParserMessages::prologCharacter(
MessageType::error,
&libModule,
46
#ifndef SP_NO_MESSAGE_TEXT
,"character %1 not allowed in prolog"
#endif
);
const MessageType0 ParserMessages::documentEndProlog(
MessageType::error,
&libModule,
47
#ifndef SP_NO_MESSAGE_TEXT
,"end of document in prolog"
#endif
);
const MessageType1 ParserMessages::prologDeclaration(
MessageType::error,
&libModule,
48
#ifndef SP_NO_MESSAGE_TEXT
,"%1 declaration not allowed in prolog"
#endif
);
const MessageType1 ParserMessages::rankStemGenericIdentifier(
MessageType::error,
&libModule,
49
#ifndef SP_NO_MESSAGE_TEXT
,"%1 used both a rank stem and generic identifier"
,"ISO 8879:1986 11.2.1p2"
#endif
);
const MessageType0 ParserMessages::missingTagMinimization(
MessageType::error,
&libModule,
50
#ifndef SP_NO_MESSAGE_TEXT
,"omitted tag minimization parameter can be omitted only if OMITTAG NO is specified"
,"ISO 8879:1986 11.2p3"
#endif
);
const MessageType1 ParserMessages::duplicateElementDefinition(
MessageType::error,
&libModule,
51
#ifndef SP_NO_MESSAGE_TEXT
,"element type %1 already defined"
,"ISO 8879:1986 11.2p2"
#endif
);
const MessageType0 ParserMessages::entityApplicableDtd(
MessageType::error,
&libModule,
52
#ifndef SP_NO_MESSAGE_TEXT
,"entity reference with no applicable DTD"
#endif
);
const MessageType1L ParserMessages::commentDeclInvalidToken(
MessageType::error,
&libModule,
53
#ifndef SP_NO_MESSAGE_TEXT
,"invalid comment declaration: found %1 outside comment but inside comment declaration"
,"ISO 8879:1986 10.3p1"
,"comment declaration started here"
#endif
);
const MessageType1 ParserMessages::instanceDeclaration(
MessageType::error,
&libModule,
55
#ifndef SP_NO_MESSAGE_TEXT
,"%1 declaration not allowed in instance"
#endif
);
const MessageType0 ParserMessages::contentNonSgml(
MessageType::error,
&libModule,
56
#ifndef SP_NO_MESSAGE_TEXT
,"non-SGML character not allowed in content"
#endif
);
const MessageType1 ParserMessages::noCurrentRank(
MessageType::error,
&libModule,
57
#ifndef SP_NO_MESSAGE_TEXT
,"no current rank for rank stem %1"
#endif
);
const MessageType1 ParserMessages::duplicateAttlistNotation(
MessageType::error,
&libModule,
58
#ifndef SP_NO_MESSAGE_TEXT
,"duplicate attribute definition list for notation %1"
,"ISO 8879:1986 11.4.1.1p4"
#endif
);
const MessageType1 ParserMessages::duplicateAttlistElement(
MessageType::error,
&libModule,
59
#ifndef SP_NO_MESSAGE_TEXT
,"duplicate attribute definition list for element %1"
,"ISO 8879:1986 11.3p4"
#endif
);
const MessageType0 ParserMessages::endTagEntityEnd(
MessageType::error,
&libModule,
60
#ifndef SP_NO_MESSAGE_TEXT
,"entity end not allowed in end tag"
#endif
);
const MessageType1 ParserMessages::endTagCharacter(
MessageType::error,
&libModule,
61
#ifndef SP_NO_MESSAGE_TEXT
,"character %1 not allowed in end tag"
#endif
);
const MessageType1 ParserMessages::endTagInvalidToken(
MessageType::error,
&libModule,
62
#ifndef SP_NO_MESSAGE_TEXT
,"%1 invalid: only S separators and TAGC allowed here"
#endif
);
const MessageType0 ParserMessages::pcdataNotAllowed(
MessageType::error,
&libModule,
63
#ifndef SP_NO_MESSAGE_TEXT
,"character data is not allowed here"
#endif
);
const MessageType1 ParserMessages::elementNotAllowed(
MessageType::error,
&libModule,
64
#ifndef SP_NO_MESSAGE_TEXT
,"document type does not allow element %1 here"
#endif
);
const MessageType2 ParserMessages::missingElementMultiple(
MessageType::error,
&libModule,
65
#ifndef SP_NO_MESSAGE_TEXT
,"document type does not allow element %1 here; missing one of %2 start-tag"
#endif
);
const MessageType2 ParserMessages::missingElementInferred(
MessageType::error,
&libModule,
66
#ifndef SP_NO_MESSAGE_TEXT
,"document type does not allow element %1 here; assuming missing %2 start-tag"
#endif
);
const MessageType1 ParserMessages::startTagEmptyElement(
MessageType::error,
&libModule,
67
#ifndef SP_NO_MESSAGE_TEXT
,"no start tag specified for implied empty element %1"
,"ISO 8879:1986 7.3.1.1p3"
#endif
);
const MessageType1L ParserMessages::omitEndTagDeclare(
MessageType::error,
&libModule,
68
#ifndef SP_NO_MESSAGE_TEXT
,"end tag for %1 omitted, but its declaration does not permit this"
,0
,"start tag was here"
#endif
);
const MessageType1L ParserMessages::omitEndTagOmittag(
MessageType::error,
&libModule,
70
#ifndef SP_NO_MESSAGE_TEXT
,"end tag for %1 omitted, but OMITTAG NO was specified"
,"ISO 8879:1986 7.3.1p1"
,"start tag was here"
#endif
);
const MessageType1 ParserMessages::omitStartTagDeclaredContent(
MessageType::error,
&libModule,
72
#ifndef SP_NO_MESSAGE_TEXT
,"start tag omitted for element %1 with declared content"
,"ISO 8879:1986 7.3.1.1p2"
#endif
);
const MessageType1 ParserMessages::elementEndTagNotFinished(
MessageType::error,
&libModule,
73
#ifndef SP_NO_MESSAGE_TEXT
,"end tag for %1 which is not finished"
#endif
);
const MessageType1 ParserMessages::omitStartTagDeclare(
MessageType::error,
&libModule,
74
#ifndef SP_NO_MESSAGE_TEXT
,"start tag for %1 omitted, but its declaration does not permit this"
#endif
);
const MessageType1 ParserMessages::taglvlOpenElements(
MessageType::quantityError,
&libModule,
75
#ifndef SP_NO_MESSAGE_TEXT
,"number of open elements exceeds TAGLVL (%1)"
#endif
);
const MessageType1 ParserMessages::undefinedElement(
MessageType::error,
&libModule,
76
#ifndef SP_NO_MESSAGE_TEXT
,"element %1 undefined"
#endif
);
const MessageType0 ParserMessages::emptyEndTagNoOpenElements(
MessageType::error,
&libModule,
77
#ifndef SP_NO_MESSAGE_TEXT
,"empty end tag but no open elements"
#endif
);
const MessageType1 ParserMessages::elementNotFinished(
MessageType::error,
&libModule,
78
#ifndef SP_NO_MESSAGE_TEXT
,"%1 not finished but containing element ended"
#endif
);
const MessageType1 ParserMessages::elementNotOpen(
MessageType::error,
&libModule,
79
#ifndef SP_NO_MESSAGE_TEXT
,"end tag for element %1 which is not open"
#endif
);
const MessageType1 ParserMessages::internalParameterDataEntity(
MessageType::error,
&libModule,
80
#ifndef SP_NO_MESSAGE_TEXT
,"internal parameter entity %1 cannot be CDATA or SDATA"
#endif
);
const MessageType1 ParserMessages::attributeSpecCharacter(
MessageType::error,
&libModule,
81
#ifndef SP_NO_MESSAGE_TEXT
,"character %1 not allowed in attribute specification list"
#endif
);
const MessageType0 ParserMessages::unquotedAttributeValue(
MessageType::error,
&libModule,
82
#ifndef SP_NO_MESSAGE_TEXT
,"an attribute value must be a literal unless it contains only name characters"
#endif
);
const MessageType0 ParserMessages::attributeSpecEntityEnd(
MessageType::error,
&libModule,
83
#ifndef SP_NO_MESSAGE_TEXT
,"entity end not allowed in attribute specification list except in attribute value literal"
#endif
);
const MessageType1 ParserMessages::externalParameterDataSubdocEntity(
MessageType::error,
&libModule,
84
#ifndef SP_NO_MESSAGE_TEXT
,"external parameter entity %1 cannot be CDATA, SDATA, NDATA or SUBDOC"
#endif
);
const MessageType1 ParserMessages::duplicateEntityDeclaration(
MessageType::warning,
&libModule,
85
#ifndef SP_NO_MESSAGE_TEXT
,"duplicate declaration of entity %1"
#endif
);
const MessageType1 ParserMessages::duplicateParameterEntityDeclaration(
MessageType::warning,
&libModule,
86
#ifndef SP_NO_MESSAGE_TEXT
,"duplicate declaration of parameter entity %1"
#endif
);
const MessageType0 ParserMessages::piEntityReference(
MessageType::error,
&libModule,
87
#ifndef SP_NO_MESSAGE_TEXT
,"a reference to a PI entity is allowed only in a context where a processing instruction could occur"
,"ISO 8879:1986 10.5.3p9"
#endif
);
const MessageType0 ParserMessages::internalDataEntityReference(
MessageType::error,
&libModule,
88
#ifndef SP_NO_MESSAGE_TEXT
,"a reference to a CDATA or SDATA entity is allowed only in a context where a data character could occur"
,"ISO 8879:1986 10.5.3p9"
#endif
);
const MessageType0 ParserMessages::externalNonTextEntityReference(
MessageType::error,
&libModule,
89
#ifndef SP_NO_MESSAGE_TEXT
,"a reference to a subdocument entity or external data entity is allowed only in a context where a data character could occur"
,"ISO 8879:1986 9.4p0"
#endif
);
const MessageType0 ParserMessages::externalNonTextEntityRcdata(
MessageType::error,
&libModule,
90
#ifndef SP_NO_MESSAGE_TEXT
,"a reference to a subdocument entity or external data entity is not allowed in replaceable character data"
,"ISO 8879:1986 9.4p0"
#endif
);
const MessageType1 ParserMessages::entlvl(
MessageType::quantityError,
&libModule,
91
#ifndef SP_NO_MESSAGE_TEXT
,"the number of open entities cannot exceed ENTLVL (%1)"
,"ISO 8879:1986 9.4.1"
#endif
);
const MessageType0 ParserMessages::piEntityRcdata(
MessageType::error,
&libModule,
92
#ifndef SP_NO_MESSAGE_TEXT
,"a reference to a PI entity is not allowed in replaceable character data"
,"ISO 8879:1986 10.5.3p9"
#endif
);
const MessageType1 ParserMessages::recursiveEntityReference(
MessageType::error,
&libModule,
93
#ifndef SP_NO_MESSAGE_TEXT
,"entity %1 is already open"
,"ISO 8879:1986 9.4p4"
#endif
);
const MessageType1 ParserMessages::undefinedShortrefMapInstance(
MessageType::error,
&libModule,
94
#ifndef SP_NO_MESSAGE_TEXT
,"short reference map %1 not defined"
,"ISO 8879:1986 11.6.2p2"
#endif
);
const MessageType0 ParserMessages::usemapAssociatedElementTypeDtd(
MessageType::error,
&libModule,
95
#ifndef SP_NO_MESSAGE_TEXT
,"short reference map in DTD must specify associated element type"
,"ISO 8879:1986 11.6.1p1"
#endif
);
const MessageType0 ParserMessages::usemapAssociatedElementTypeInstance(
MessageType::error,
&libModule,
96
#ifndef SP_NO_MESSAGE_TEXT
,"short reference map in document instance cannot specify associated element type"
,"ISO 8879:1986 11.6.2p1"
#endif
);
const MessageType2 ParserMessages::undefinedShortrefMapDtd(
MessageType::error,
&libModule,
97
#ifndef SP_NO_MESSAGE_TEXT
,"short reference map %1 for element %2 not defined in DTD"
,"ISO 8879:1986 11.6.1p2"
#endif
);
const MessageType1 ParserMessages::unknownShortrefDelim(
MessageType::error,
&libModule,
98
#ifndef SP_NO_MESSAGE_TEXT
,"%1 is not a short reference delimiter"
,"ISO 8879:1986 11.5p4"
#endif
);
const MessageType1 ParserMessages::delimDuplicateMap(
MessageType::error,
&libModule,
99
#ifndef SP_NO_MESSAGE_TEXT
,"short reference delimiter %1 already mapped in this declaration"
,"ISO 8879:1986 11.5p6"
#endif
);
const MessageType0 ParserMessages::noDocumentElement(
MessageType::error,
&libModule,
100
#ifndef SP_NO_MESSAGE_TEXT
,"no document element"
#endif
);
const MessageType0 ParserMessages::processingInstructionEntityEnd(
MessageType::error,
&libModule,
102
#ifndef SP_NO_MESSAGE_TEXT
,"entity end not allowed in processing instruction"
#endif
);
const MessageType1 ParserMessages::processingInstructionLength(
MessageType::quantityError,
&libModule,
103
#ifndef SP_NO_MESSAGE_TEXT
,"length of processing instruction must not exceed PILEN (%1)"
,"ISO 8879:1986 8.1p1"
#endif
);
const MessageType0 ParserMessages::processingInstructionClose(
MessageType::error,
&libModule,
104
#ifndef SP_NO_MESSAGE_TEXT
,"missing PIC delimiter"
#endif
);
const MessageType0 ParserMessages::attributeSpecNameTokenExpected(
MessageType::error,
&libModule,
105
#ifndef SP_NO_MESSAGE_TEXT
,"an attribute specification must start with a name or name token"
,"ISO 8879:1986 7.9p2 7.9.1.2p1"
#endif
);
const MessageType1 ParserMessages::noSuchAttributeToken(
MessageType::error,
&libModule,
106
#ifndef SP_NO_MESSAGE_TEXT
,"%1 is not a member of a group specified for any attribute"
,"ISO 8879:1986 7.9.1.2p1"
#endif
);
const MessageType0 ParserMessages::attributeNameShorttag(
MessageType::error,
&libModule,
107
#ifndef SP_NO_MESSAGE_TEXT
,"the name and VI delimiter can be omitted from an attribute specification only if SHORTTAG YES is specified"
,"ISO 8879:1986 7.9.1.2"
#endif
);
const MessageType1 ParserMessages::noSuchAttribute(
MessageType::error,
&libModule,
108
#ifndef SP_NO_MESSAGE_TEXT
,"there is no attribute %1"
#endif
);
const MessageType0 ParserMessages::attributeValueExpected(
MessageType::error,
&libModule,
109
#ifndef SP_NO_MESSAGE_TEXT
,"an attribute value specification must start with a literal or a name character"
,"ISO 8879:1986 7.9.3p1"
#endif
);
const MessageType1 ParserMessages::nameTokenLength(
MessageType::quantityError,
&libModule,
110
#ifndef SP_NO_MESSAGE_TEXT
,"length of name token must not exceed NAMELEN (%1)"
,"ISO 8879:1986 9.3.1"
#endif
);
const MessageType0 ParserMessages::attributeSpecLiteral(
MessageType::error,
&libModule,
111
#ifndef SP_NO_MESSAGE_TEXT
,"an attribute value literal can occur in an attribute specification list only after a VI delimiter"
,"ISO 8879:1986 7.9.3p1 7.9.1.2p1"
#endif
);
const MessageType1 ParserMessages::duplicateAttributeSpec(
MessageType::error,
&libModule,
112
#ifndef SP_NO_MESSAGE_TEXT
,"duplicate specification of attribute %1"
,"ISO 8879:1986 7.9p5"
#endif
);
const MessageType1 ParserMessages::duplicateAttributeDef(
MessageType::warning,
&libModule,
113
#ifndef SP_NO_MESSAGE_TEXT
,"duplicate definition of attribute %1"
,"ISO 8879:1986 11.3.2p2"
#endif
);
const MessageType0 ParserMessages::emptyDataAttributeSpec(
MessageType::error,
&libModule,
114
#ifndef SP_NO_MESSAGE_TEXT
,"data attribute specification must be omitted if attribute specification list is empty"
,"ISO 8879:1986 11.4.1.2p3"
#endif
);
const MessageType0 ParserMessages::markedSectionEnd(
MessageType::error,
&libModule,
115
#ifndef SP_NO_MESSAGE_TEXT
,"marked section end not in marked section declaration"
,"ISO 8879:1986 10.4p6"
#endif
);
const MessageType1 ParserMessages::markedSectionLevel(
MessageType::error,
&libModule,
116
#ifndef SP_NO_MESSAGE_TEXT
,"number of open marked sections must not exceed TAGLVL (%1)"
,"ISO 8879:1986 10.4.1p1"
#endif
);
const MessageType0L ParserMessages::unclosedMarkedSection(
MessageType::error,
&libModule,
117
#ifndef SP_NO_MESSAGE_TEXT
,"missing marked section end"
,"ISO 8879:1986 10.4p1"
,"marked section started here"
#endif
);
const MessageType0 ParserMessages::specialParseEntityEnd(
MessageType::error,
&libModule,
119
#ifndef SP_NO_MESSAGE_TEXT
,"entity end in character data, replaceable character data or ignored marked section"
#endif
);
const MessageType2 ParserMessages::normalizedAttributeValueLength(
MessageType::quantityError,
&libModule,
120
#ifndef SP_NO_MESSAGE_TEXT
,"normalized length of attribute value literal must not exceed LITLEN (%1); length was %2"
,"ISO 8879:1986 7.9.4.5"
#endif
);
const MessageType0 ParserMessages::attributeValueSyntax(
MessageType::error,
&libModule,
121
#ifndef SP_NO_MESSAGE_TEXT
,"syntax of attribute value does not conform to declared value"
,"ISO 8879:1986 7.9.4.1p1"
#endif
);
const MessageType2 ParserMessages::attributeValueChar(
MessageType::error,
&libModule,
122
#ifndef SP_NO_MESSAGE_TEXT
,"character %1 is not allowed in the value of attribute %2"
,"ISO 8879:1986 7.9.4.1p1"
#endif
);
const MessageType1 ParserMessages::attributeValueMultiple(
MessageType::error,
&libModule,
123
#ifndef SP_NO_MESSAGE_TEXT
,"value of attribute %1 must be a single token"
,"ISO 8879:1986 7.9.4.1p1"
#endif
);
const MessageType2 ParserMessages::attributeValueNumberToken(
MessageType::error,
&libModule,
124
#ifndef SP_NO_MESSAGE_TEXT
,"value of attribute %2 invalid: %1 cannot start a number token"
,"ISO 8879:1986 7.9.4p1"
#endif
);
const MessageType2 ParserMessages::attributeValueName(
MessageType::error,
&libModule,
125
#ifndef SP_NO_MESSAGE_TEXT
,"value of attribute %2 invalid: %1 cannot start a name"
,"ISO 8879:1986 7.9.4p1"
#endif
);
const MessageType1 ParserMessages::attributeMissing(
MessageType::error,
&libModule,
126
#ifndef SP_NO_MESSAGE_TEXT
,"non-impliable attribute %1 not specified but OMITTAG NO and SHORTTAG NO"
,"ISO 8879:1986 7.9p4"
#endif
);
const MessageType1 ParserMessages::requiredAttributeMissing(
MessageType::error,
&libModule,
127
#ifndef SP_NO_MESSAGE_TEXT
,"required attribute %1 not specified"
,"ISO 8879:1986 7.9p4 7.9.1.1p2"
#endif
);
const MessageType1 ParserMessages::currentAttributeMissing(
MessageType::error,
&libModule,
128
#ifndef SP_NO_MESSAGE_TEXT
,"first occurrence of CURRENT attribute %1 not specified"
,"ISO 8879:1986 7.9.1.1p2"
#endif
);
const MessageType1 ParserMessages::invalidNotationAttribute(
MessageType::error,
&libModule,
129
#ifndef SP_NO_MESSAGE_TEXT
,"%1 is not a notation name"
,"ISO 8879:1986 7.9.4.4p1"
#endif
);
const MessageType1 ParserMessages::invalidEntityAttribute(
MessageType::error,
&libModule,
130
#ifndef SP_NO_MESSAGE_TEXT
,"%1 is not a general entity name"
,"ISO 8879:1986 7.9.4.3p1"
#endif
);
const MessageType3 ParserMessages::attributeValueNotInGroup(
MessageType::error,
&libModule,
131
#ifndef SP_NO_MESSAGE_TEXT
,"value of attribute %2 cannot be %1; must be one of %3"
,"ISO 8879:1986 7.9.4.1p2"
#endif
);
const MessageType1 ParserMessages::notDataOrSubdocEntity(
MessageType::error,
&libModule,
132
#ifndef SP_NO_MESSAGE_TEXT
,"%1 is not a data or subdocument entity"
,"ISO 8879:1986 7.9.4.3p1"
#endif
);
const MessageType3 ParserMessages::ambiguousModelInitial(
MessageType::error,
&libModule,
133
#ifndef SP_NO_MESSAGE_TEXT
,"content model is ambiguous: when no tokens have been matched, both the %2 and %3 occurrences of %1 are possible"
#endif
);
const MessageType5 ParserMessages::ambiguousModel(
MessageType::error,
&libModule,
134
#ifndef SP_NO_MESSAGE_TEXT
,"content model is ambiguous: when the current token is the %2 occurrence of %1, both the %4 and %5 occurrences of %3 are possible"
#endif
);
const MessageType5 ParserMessages::ambiguousModelSingleAnd(
MessageType::error,
&libModule,
135
#ifndef SP_NO_MESSAGE_TEXT
,"content model is ambiguous: when the current token is the %2 occurrence of %1 and the innermost containing AND group has been matched, both the %4 and %5 occurrences of %3 are possible"
#endif
);
const MessageType6 ParserMessages::ambiguousModelMultipleAnd(
MessageType::error,
&libModule,
136
#ifndef SP_NO_MESSAGE_TEXT
,"content model is ambiguous: when the current token is the %2 occurrence of %1 and the innermost %3 containing AND groups have been matched, both the %5 and %6 occurrences of %4 are possible"
#endif
);
const MessageType1L ParserMessages::commentDeclarationCharacter(
MessageType::error,
&libModule,
137
#ifndef SP_NO_MESSAGE_TEXT
,"invalid comment declaration: found character %1 outside comment but inside comment declaration"
,0
,"comment declaration started here"
#endif
);
const MessageType1 ParserMessages::nonSgmlCharacter(
MessageType::error,
&libModule,
139
#ifndef SP_NO_MESSAGE_TEXT
,"non SGML character number %1"
#endif
);
const MessageType0 ParserMessages::dataMarkedSectionDeclSubset(
MessageType::error,
&libModule,
140
#ifndef SP_NO_MESSAGE_TEXT
,"data or replaceable character data in declaration subset"
#endif
);
const MessageType1L ParserMessages::duplicateId(
MessageType::error,
&libModule,
141
#ifndef SP_NO_MESSAGE_TEXT
,"ID %1 already defined"
,"ISO 8879:1986 4.153"
,"ID %1 first defined here"
#endif
);
const MessageType1 ParserMessages::notFixedValue(
MessageType::error,
&libModule,
143
#ifndef SP_NO_MESSAGE_TEXT
,"value of fixed attribute %1 not equal to default"
,"ISO 8879:1986 4.136"
#endif
);
const MessageType1 ParserMessages::sdCommentSignificant(
MessageType::error,
&libModule,
144
#ifndef SP_NO_MESSAGE_TEXT
,"character %1 is not significant in the reference concrete syntax and so cannot occur in a comment in the SGML declaration"
#endif
);
const MessageType1 ParserMessages::standardVersion(
MessageType::error,
&libModule,
145
#ifndef SP_NO_MESSAGE_TEXT
,"minimum data of first minimum literal in SGML declaration must be \"ISO 8879:1986\" or \"ISO 8879:1986 (ENR)\" or \"ISO 8879:1986 (WWW)\" not %1"
,"ISO 8879:1986 13p2"
#endif
);
const MessageType1 ParserMessages::namingBeforeLcnmstrt(
MessageType::error,
&libModule,
146
#ifndef SP_NO_MESSAGE_TEXT
,"parameter before LCNMSTRT must be NAMING not %1"
,"ISO 8879:1986 13.4.5p1"
#endif
);
const MessageType1 ParserMessages::sdEntityEnd(
MessageType::error,
&libModule,
147
#ifndef SP_NO_MESSAGE_TEXT
,"unexpected entity end in SGML declaration: only %1, S separators and comments allowed"
,"ISO 8879:1986 13p1"
#endif
);
const MessageType2 ParserMessages::sdInvalidNameToken(
MessageType::error,
&libModule,
148
#ifndef SP_NO_MESSAGE_TEXT
,"%1 invalid: only %2 and parameter separators allowed"
#endif
);
const MessageType1 ParserMessages::numberTooBig(
MessageType::error,
&libModule,
149
#ifndef SP_NO_MESSAGE_TEXT
,"magnitude of %1 too big"
#endif
);
const MessageType1 ParserMessages::sdLiteralSignificant(
MessageType::error,
&libModule,
150
#ifndef SP_NO_MESSAGE_TEXT
,"character %1 is not significant in the reference concrete syntax and so cannot occur in a literal in the SGML declaration except as the replacement of a character reference"
#endif
);
const MessageType1 ParserMessages::syntaxCharacterNumber(
MessageType::error,
&libModule,
151
#ifndef SP_NO_MESSAGE_TEXT
,"%1 is not a valid syntax reference character number"
,"ISO 8879:1986 4.36"
#endif
);
const MessageType0 ParserMessages::sdParameterEntity(
MessageType::error,
&libModule,
152
#ifndef SP_NO_MESSAGE_TEXT
,"a parameter entity reference cannot occur in an SGML declaration"
,"ISO 8879:1986 451p7"
#endif
);
const MessageType2 ParserMessages::sdParamInvalidToken(
MessageType::error,
&libModule,
153
#ifndef SP_NO_MESSAGE_TEXT
,"%1 invalid: only %2 and parameter separators are allowed"
#endif
);
const MessageType0 ParserMessages::giveUp(
MessageType::error,
&libModule,
154
#ifndef SP_NO_MESSAGE_TEXT
,"cannot continue because of previous errors"
#endif
);
const MessageType1 ParserMessages::sdMissingCharacters(
MessageType::error,
&libModule,
155
#ifndef SP_NO_MESSAGE_TEXT
,"SGML declaration cannot be parsed because the character set does not contain characters having the following numbers in ISO 646: %1"
#endif
);
const MessageType1 ParserMessages::missingMinimumChars(
MessageType::error,
&libModule,
156
#ifndef SP_NO_MESSAGE_TEXT
,"the specified character set is invalid because it does not contain the minimum data characters having the following numbers in ISO 646: %1"
#endif
);
const MessageType1 ParserMessages::duplicateCharNumbers(
MessageType::error,
&libModule,
157
#ifndef SP_NO_MESSAGE_TEXT
,"character numbers declared more than once: %1"
#endif
);
const MessageType1 ParserMessages::codeSetHoles(
MessageType::error,
&libModule,
158
#ifndef SP_NO_MESSAGE_TEXT
,"character numbers should have been declared UNUSED: %1"
#endif
);
const MessageType1 ParserMessages::basesetCharsMissing(
MessageType::warning,
&libModule,
159
#ifndef SP_NO_MESSAGE_TEXT
,"character numbers missing in base set: %1"
#endif
);
const MessageType1 ParserMessages::documentCharMax(
MessageType::warning,
&libModule,
160
#ifndef SP_NO_MESSAGE_TEXT
,"characters in the document character set with numbers exceeding %1 not supported"
#endif
);
const MessageType1 ParserMessages::fpiMissingField(
MessageType::error,
&libModule,
161
#ifndef SP_NO_MESSAGE_TEXT
,"invalid formal public identifier %1: missing //"
#endif
);
const MessageType1 ParserMessages::fpiMissingTextClassSpace(
MessageType::error,
&libModule,
162
#ifndef SP_NO_MESSAGE_TEXT
,"invalid formal public identifier %1: no SPACE after public text class"
#endif
);
const MessageType1 ParserMessages::fpiInvalidTextClass(
MessageType::error,
&libModule,
163
#ifndef SP_NO_MESSAGE_TEXT
,"invalid formal public identifier %1: invalid public text class"
#endif
);
const MessageType1 ParserMessages::fpiInvalidLanguage(
MessageType::error,
&libModule,
164
#ifndef SP_NO_MESSAGE_TEXT
,"invalid formal public identifier %1: public text language must be a name containing only upper case letters"
#endif
);
const MessageType1 ParserMessages::fpiIllegalDisplayVersion(
MessageType::error,
&libModule,
165
#ifndef SP_NO_MESSAGE_TEXT
,"invalid formal public identifer %1: public text display version not permitted with this text class"
#endif
);
const MessageType1 ParserMessages::fpiExtraField(
MessageType::error,
&libModule,
166
#ifndef SP_NO_MESSAGE_TEXT
,"invalid formal public identifier %1: extra field"
#endif
);
const MessageType0 ParserMessages::notationIdentifierTextClass(
MessageType::error,
&libModule,
167
#ifndef SP_NO_MESSAGE_TEXT
,"public text class of public identifier in notation identifier must be NOTATION"
#endif
);
const MessageType1 ParserMessages::unknownBaseset(
MessageType::warning,
&libModule,
168
#ifndef SP_NO_MESSAGE_TEXT
,"base character set %1 is unknown"
#endif
);
const MessageType2 ParserMessages::lexicalAmbiguity(
MessageType::error,
&libModule,
169
#ifndef SP_NO_MESSAGE_TEXT
,"delimiter set is ambiguous: %1 and %2 can be recognized in the same mode"
,"ISO 8879:1986 13.4.6p2"
#endif
);
const MessageType1 ParserMessages::missingSignificant(
MessageType::error,
&libModule,
170
#ifndef SP_NO_MESSAGE_TEXT
,"characters with the following numbers in the syntax reference character set are significant in the concrete syntax but are not in the document character set: %1"
#endif
);
const MessageType1 ParserMessages::translateSyntaxCharDoc(
MessageType::error,
&libModule,
171
#ifndef SP_NO_MESSAGE_TEXT
,"there is no unique character in the document character set corresponding to character number %1 in the syntax reference character set"
#endif
);
const MessageType1 ParserMessages::translateSyntaxCharInternal(
MessageType::error,
&libModule,
172
#ifndef SP_NO_MESSAGE_TEXT
,"there is no unique character in the internal character set corresponding to character number %1 in the syntax reference character set"
#endif
);
const MessageType1 ParserMessages::missingSyntaxChar(
MessageType::error,
&libModule,
173
#ifndef SP_NO_MESSAGE_TEXT
,"the character with number %1 in ISO 646 is significant but has no representation in the syntax reference character set"
,"ISO 8879:1986 13.4.3p2"
#endif
);
const MessageType1 ParserMessages::unknownCapacitySet(
MessageType::error,
&libModule,
174
#ifndef SP_NO_MESSAGE_TEXT
,"capacity set %1 is unknown"
#endif
);
const MessageType1 ParserMessages::duplicateCapacity(
MessageType::warning,
&libModule,
175
#ifndef SP_NO_MESSAGE_TEXT
,"capacity %1 already specified"
#endif
);
const MessageType1 ParserMessages::capacityExceedsTotalcap(
MessageType::error,
&libModule,
176
#ifndef SP_NO_MESSAGE_TEXT
,"value of capacity %1 exceeds value of TOTALCAP"
#endif
);
const MessageType1 ParserMessages::unknownPublicSyntax(
MessageType::error,
&libModule,
177
#ifndef SP_NO_MESSAGE_TEXT
,"syntax %1 is unknown"
#endif
);
const MessageType0 ParserMessages::nmstrtLength(
MessageType::error,
&libModule,
178
#ifndef SP_NO_MESSAGE_TEXT
,"UCNMSTRT must have the same number of characters as LCNMSTRT"
,"ISO 8879:1986 13.4.5p13"
#endif
);
const MessageType0 ParserMessages::nmcharLength(
MessageType::error,
&libModule,
179
#ifndef SP_NO_MESSAGE_TEXT
,"UCNMCHAR must have the same number of characters as LCNMCHAR"
,"ISO 8879:1986 13.4.5p13"
#endif
);
const MessageType1 ParserMessages::subdocLevel(
MessageType::error,
&libModule,
180
#ifndef SP_NO_MESSAGE_TEXT
,"number of open subdocuments exceeds quantity specified for SUBDOC parameter in SGML declaration (%1)"
,"ISO 8879:1986 9.4.2p1"
#endif
);
const MessageType1 ParserMessages::subdocEntity(
MessageType::error,
&libModule,
181
#ifndef SP_NO_MESSAGE_TEXT
,"entity %1 declared SUBDOC, but SUBDOC NO specified in SGML declaration"
,"ISO 8879:1986 10.5.5p12"
#endif
);
const MessageType0 ParserMessages::parameterEntityNotEnded(
MessageType::error,
&libModule,
182
#ifndef SP_NO_MESSAGE_TEXT
,"a parameter entity referenced in a parameter separator must end in the same declaration"
,"ISO 8879:1986 10.1.1p2"
#endif
);
const MessageType1 ParserMessages::missingId(
MessageType::idrefError,
&libModule,
183
#ifndef SP_NO_MESSAGE_TEXT
,"reference to non-existent ID %1"
#endif
);
const MessageType1 ParserMessages::dtdUndefinedElement(
MessageType::warning,
&libModule,
184
#ifndef SP_NO_MESSAGE_TEXT
,"generic identifier %1 used in DTD but not defined"
#endif
);
const MessageType1 ParserMessages::elementNotFinishedDocumentEnd(
MessageType::error,
&libModule,
185
#ifndef SP_NO_MESSAGE_TEXT
,"%1 not finished but document ended"
#endif
);
const MessageType0 ParserMessages::subdocGiveUp(
MessageType::error,
&libModule,
186
#ifndef SP_NO_MESSAGE_TEXT
,"cannot continue with subdocument because of previous errors"
#endif
);
const MessageType0 ParserMessages::noDtd(
MessageType::error,
&libModule,
187
#ifndef SP_NO_MESSAGE_TEXT
,"no document type declaration; will parse without validation"
#endif
);
const MessageType0 ParserMessages::noDtdSubset(
MessageType::error,
&libModule,
188
#ifndef SP_NO_MESSAGE_TEXT
,"no internal or external document type declaration subset; will parse without validation"
#endif
);
const MessageType0 ParserMessages::notSgml(
MessageType::error,
&libModule,
189
#ifndef SP_NO_MESSAGE_TEXT
,"this is not an SGML document"
#endif
);
const MessageType1 ParserMessages::taglen(
MessageType::quantityError,
&libModule,
190
#ifndef SP_NO_MESSAGE_TEXT
,"length of start-tag before interpretation of literals must not exceed TAGLEN (%1)"
,"ISO 8879:1986 7.4.2p1"
#endif
);
const MessageType0 ParserMessages::groupParameterEntityNotEnded(
MessageType::error,
&libModule,
191
#ifndef SP_NO_MESSAGE_TEXT
,"a parameter entity referenced in a token separator must end in the same group"
,"ISO 8879:1986 10.1.3p7"
#endif
);
const MessageType1 ParserMessages::invalidSgmlChar(
MessageType::error,
&libModule,
192
#ifndef SP_NO_MESSAGE_TEXT
,"the following character numbers are shunned characters that are not significant and so should have been declared UNUSED: %1"
,"ISO 8879:1986 13.1.2p3"
#endif
);
const MessageType1 ParserMessages::translateDocChar(
MessageType::error,
&libModule,
193
#ifndef SP_NO_MESSAGE_TEXT
,"there is no unique character in the specified document character set corresponding to character number %1 in ISO 646"
#endif
);
const MessageType1 ParserMessages::attributeValueLengthNeg(
MessageType::quantityError,
&libModule,
194
#ifndef SP_NO_MESSAGE_TEXT
,"length of attribute value must not exceed LITLEN less NORMSEP (-%1)"
,"ISO 8879:1986 7.9.4.5"
#endif
);
const MessageType1 ParserMessages::tokenizedAttributeValueLengthNeg(
MessageType::quantityError,
&libModule,
195
#ifndef SP_NO_MESSAGE_TEXT
,"length of tokenized attribute value must not exceed LITLEN less NORMSEP (-%1)"
,"ISO 8879:1986 7.9.4.5 7.9.3p5"
#endif
);
const MessageType1 ParserMessages::scopeInstanceQuantity(
MessageType::error,
&libModule,
196
#ifndef SP_NO_MESSAGE_TEXT
,"concrete syntax scope is INSTANCE but value of %1 quantity is less than value in reference quantity set"
,"ISO 8879:1986 13.3p9"
#endif
);
const MessageType1 ParserMessages::basesetTextClass(
MessageType::error,
&libModule,
197
#ifndef SP_NO_MESSAGE_TEXT
,"public text class of formal public identifier of base character set must be CHARSET"
,"ISO 8879:1986 13.1.1.1p4"
#endif
);
const MessageType1 ParserMessages::capacityTextClass(
MessageType::error,
&libModule,
198
#ifndef SP_NO_MESSAGE_TEXT
,"public text class of formal public identifier of capacity set must be CAPACITY"
,"ISO 8879:1986 13.2p7"
#endif
);
const MessageType1 ParserMessages::syntaxTextClass(
MessageType::error,
&libModule,
199
#ifndef SP_NO_MESSAGE_TEXT
,"public text class of formal public identifier of concrete syntax must be SYNTAX"
,"ISO 8879:1986 13.4.1p6"
#endif
);
const MessageType0 ParserMessages::msocharRequiresMsichar(
MessageType::error,
&libModule,
200
#ifndef SP_NO_MESSAGE_TEXT
,"when there is an MSOCHAR there must also be an MSICHAR"
,"ISO 8879:1986 13.4.4p13"
#endif
);
const MessageType1 ParserMessages::switchNotMarkup(
MessageType::error,
&libModule,
201
#ifndef SP_NO_MESSAGE_TEXT
,"character number %1 in the syntax reference character set was specified as a character to be switched but is not a markup character"
,"ISO 8879:1986 13.4.1p4"
#endif
);
const MessageType1 ParserMessages::switchNotInCharset(
MessageType::error,
&libModule,
202
#ifndef SP_NO_MESSAGE_TEXT
,"character number %1 was specified as a character to be switched but is not in the syntax reference character set"
,"ISO 8879:1986 13.4.1p4"
#endif
);
const MessageType1 ParserMessages::ambiguousDocCharacter(
MessageType::warning,
&libModule,
203
#ifndef SP_NO_MESSAGE_TEXT
,"character numbers %1 in the document character set have been assigned the same meaning, but this is the meaning of a significant character"
#endif
);
const MessageType1 ParserMessages::oneFunction(
MessageType::error,
&libModule,
204
#ifndef SP_NO_MESSAGE_TEXT
,"character number %1 assigned to more than one function"
,"ISO 8879:1986 13.4.4p11"
#endif
);
const MessageType1 ParserMessages::duplicateFunctionName(
MessageType::error,
&libModule,
205
#ifndef SP_NO_MESSAGE_TEXT
,"%1 is already a function name"
,"ISO 8879:1986 13.4.4p12"
#endif
);
const MessageType1 ParserMessages::missingSignificant646(
MessageType::error,
&libModule,
206
#ifndef SP_NO_MESSAGE_TEXT
,"characters with the following numbers in ISO 646 are significant in the concrete syntax but are not in the document character set: %1"
#endif
);
const MessageType1 ParserMessages::generalDelimAllFunction(
MessageType::error,
&libModule,
207
#ifndef SP_NO_MESSAGE_TEXT
,"general delimiter %1 consists solely of function characters"
,"ISO 8879:1986 13.4.6.1p5"
#endif
);
const MessageType1 ParserMessages::nmcharLetter(
MessageType::error,
&libModule,
208
#ifndef SP_NO_MESSAGE_TEXT
,"letters assigned to LCNMCHAR, UCNMCHAR, LCNMSTRT or UCNMSTRT: %1"
,"ISO 8879:1986 13.4.5p11"
#endif
);
const MessageType1 ParserMessages::nmcharDigit(
MessageType::error,
&libModule,
209
#ifndef SP_NO_MESSAGE_TEXT
,"digits assigned to LCNMCHAR, UCNMCHAR, LCNMSTRT or UCNMSTRT: %1"
,"ISO 8879:1986 13.4.5p11"
#endif
);
const MessageType1 ParserMessages::nmcharRe(
MessageType::error,
&libModule,
210
#ifndef SP_NO_MESSAGE_TEXT
,"character number %1 cannot be assigned to LCNMCHAR, UCNMCHAR, LCNMSTRT or UCNMSTRT because it is RE"
,"ISO 8879:1986 13.4.5p11"
#endif
);
const MessageType1 ParserMessages::nmcharRs(
MessageType::error,
&libModule,
211
#ifndef SP_NO_MESSAGE_TEXT
,"character number %1 cannot be assigned to LCNMCHAR, UCNMCHAR, LCNMSTRT or UCNMSTRT because it is RS"
,"ISO 8879:1986 13.4.5p11"
#endif
);
const MessageType1 ParserMessages::nmcharSpace(
MessageType::error,
&libModule,
212
#ifndef SP_NO_MESSAGE_TEXT
,"character number %1 cannot be assigned to LCNMCHAR, UCNMCHAR, LCNMSTRT or UCNMSTRT because it is SPACE"
,"ISO 8879:1986 13.4.5p11"
#endif
);
const MessageType1 ParserMessages::nmcharSepchar(
MessageType::error,
&libModule,
213
#ifndef SP_NO_MESSAGE_TEXT
,"separator characters assigned to LCNMCHAR, UCNMCHAR, LCNMSTRT or UCNMSTRT: %1"
,"ISO 8879:1986 13.4.5p11"
#endif
);
const MessageType1 ParserMessages::switchLetterDigit(
MessageType::error,
&libModule,
214
#ifndef SP_NO_MESSAGE_TEXT
,"character number %1 cannot be switched because it is a Digit, LC Letter or UC Letter"
,"ISO 8879:1986 13.4.1p4"
#endif
);
const MessageType0 ParserMessages::zeroNumberOfCharacters(
MessageType::warning,
&libModule,
215
#ifndef SP_NO_MESSAGE_TEXT
,"pointless for number of characters to be 0"
#endif
);
const MessageType1 ParserMessages::nameReferenceReservedName(
MessageType::error,
&libModule,
216
#ifndef SP_NO_MESSAGE_TEXT
,"%1 cannot be the replacement for a reference reserved name because it is another reference reserved name"
,"ISO 8879:1986 13.4.7p6"
#endif
);
const MessageType1 ParserMessages::ambiguousReservedName(
MessageType::error,
&libModule,
217
#ifndef SP_NO_MESSAGE_TEXT
,"%1 cannot be the replacement for a reference reserved name because it is the replacement of another reference reserved name"
,"ISO 8879:1986 13.4.7p6"
#endif
);
const MessageType1 ParserMessages::duplicateReservedName(
MessageType::error,
&libModule,
218
#ifndef SP_NO_MESSAGE_TEXT
,"replacement for reserved name %1 already specified"
,"ISO 8879:1986 13.4.7p2"
#endif
);
const MessageType1 ParserMessages::reservedNameSyntax(
MessageType::warning,
&libModule,
219
#ifndef SP_NO_MESSAGE_TEXT
,"%1 is not a valid name in the declared concrete syntax"
#endif
);
const MessageType1 ParserMessages::multipleBSequence(
MessageType::error,
&libModule,
220
#ifndef SP_NO_MESSAGE_TEXT
,"%1 is not a valid short reference delimiter because it has more than one B sequence"
,"ISO 8879:1986 13.4.6.2p6"
#endif
);
const MessageType1 ParserMessages::blankAdjacentBSequence(
MessageType::error,
&libModule,
221
#ifndef SP_NO_MESSAGE_TEXT
,"%1 is not a valid short reference delimiter because it is adjacent to a character that can occur in a blank sequence"
,"ISO 8879:1986 13.4.6.2p6"
#endif
);
const MessageType2 ParserMessages::delimiterLength(
MessageType::error,
&libModule,
222
#ifndef SP_NO_MESSAGE_TEXT
,"length of delimiter %1 exceeds NAMELEN (%2)"
,"ISO 8879:1986 13.4.6p5"
#endif
);
const MessageType2 ParserMessages::reservedNameLength(
MessageType::warning,
&libModule,
223
#ifndef SP_NO_MESSAGE_TEXT
,"length of reserved name %1 exceeds NAMELEN (%2)"
#endif
);
const MessageType1 ParserMessages::nmcharNmstrt(
MessageType::error,
&libModule,
224
#ifndef SP_NO_MESSAGE_TEXT
,"character numbers assigned to both LCNMCHAR or UCNMCHAR and LCNMSTRT or UCNMSTRT: %1"
,"ISO 8879:1986 13.4.5p12"
#endif
);
const MessageType0 ParserMessages::scopeInstanceSyntaxCharset(
MessageType::error,
&libModule,
225
#ifndef SP_NO_MESSAGE_TEXT
,"when the concrete syntax scope is INSTANCE the syntax reference character set of the declared syntax must be the same as that of the reference concrete syntax"
,"ISO 8879:1986 13.3p7"
#endif
);
const MessageType0 ParserMessages::emptyOmitEndTag(
MessageType::warning,
&libModule,
226
#ifndef SP_NO_MESSAGE_TEXT
,"end-tag minimization should be O for element with declared content of EMPTY"
,"ISO 8879:1986 11.2.2p8"
#endif
);
const MessageType1 ParserMessages::conrefOmitEndTag(
MessageType::warning,
&libModule,
227
#ifndef SP_NO_MESSAGE_TEXT
,"end-tag minimization should be O for element %1 because it has CONREF attribute"
,"ISO 8879:1986 11.2.2p8"
#endif
);
const MessageType1 ParserMessages::conrefEmpty(
MessageType::error,
&libModule,
228
#ifndef SP_NO_MESSAGE_TEXT
,"element %1 has a declared content of EMPTY and a CONREF attribute"
,"ISO 8879:1986 11.3.4p12"
#endif
);
const MessageType1 ParserMessages::notationEmpty(
MessageType::error,
&libModule,
229
#ifndef SP_NO_MESSAGE_TEXT
,"element %1 has a declared content of EMPTY and a NOTATION attribute"
,"ISO 8879:1986 11.3.3p21"
#endif
);
const MessageType0 ParserMessages::dataAttributeDeclaredValue(
MessageType::error,
&libModule,
230
#ifndef SP_NO_MESSAGE_TEXT
,"declared value of data attribute cannot be ENTITY, ENTITIES, ID, IDREF, IDREFS or NOTATION"
,"ISO 8879:1986 11.4.1p2"
#endif
);
const MessageType0 ParserMessages::dataAttributeDefaultValue(
MessageType::error,
&libModule,
231
#ifndef SP_NO_MESSAGE_TEXT
,"default value of data attribute cannot be CONREF or CURRENT"
,"ISO 8879:1986 11.4.1p3"
#endif
);
const MessageType2 ParserMessages::attcnt(
MessageType::quantityError,
&libModule,
232
#ifndef SP_NO_MESSAGE_TEXT
,"number of attribute names and name tokens (%1) exceeds ATTCNT (%2)"
,"ISO 8879:1986 11.3.1"
#endif
);
const MessageType0 ParserMessages::idDeclaredValue(
MessageType::error,
&libModule,
233
#ifndef SP_NO_MESSAGE_TEXT
,"if the declared value is ID the default value must be IMPLIED or REQUIRED"
,"ISO 8879:1986 11.3.4p11"
#endif
);
const MessageType1 ParserMessages::multipleIdAttributes(
MessageType::error,
&libModule,
234
#ifndef SP_NO_MESSAGE_TEXT
,"the attribute definition list already declared attribute %1 as the ID attribute"
,"ISO 8879:1986 11.3.3p19"
#endif
);
const MessageType1 ParserMessages::multipleNotationAttributes(
MessageType::error,
&libModule,
235
#ifndef SP_NO_MESSAGE_TEXT
,"the attribute definition list already declared attribute %1 as the NOTATION attribute"
,"ISO 8879:1986 11.3.3p19"
#endif
);
const MessageType1 ParserMessages::duplicateAttributeToken(
MessageType::error,
&libModule,
236
#ifndef SP_NO_MESSAGE_TEXT
,"token %1 occurs more than once in attribute definition list"
,"ISO 8879:1986 11.3.3p20"
#endif
);
const MessageType1 ParserMessages::notationNoAttributes(
MessageType::error,
&libModule,
237
#ifndef SP_NO_MESSAGE_TEXT
,"no attributes defined for notation %1"
,"ISO 8879:1986 11.4.1.2p2"
#endif
);
const MessageType2 ParserMessages::entityNotationUndefined(
MessageType::error,
&libModule,
238
#ifndef SP_NO_MESSAGE_TEXT
,"notation %1 for entity %2 undefined"
,"ISO 8879:1986 10.5.5p10"
#endif
);
const MessageType2 ParserMessages::mapEntityUndefined(
MessageType::error,
&libModule,
239
#ifndef SP_NO_MESSAGE_TEXT
,"entity %1 undefined in short reference map %2"
#endif
);
const MessageType1 ParserMessages::attlistNotationUndefined(
MessageType::error,
&libModule,
240
#ifndef SP_NO_MESSAGE_TEXT
,"notation %1 is undefined but had attribute definition"
,"ISO 8879:1986 11.4.1.1p4"
#endif
);
const MessageType1 ParserMessages::bracketedLitlen(
MessageType::quantityError,
&libModule,
241
#ifndef SP_NO_MESSAGE_TEXT
,"length of interpreted parameter literal in bracketed text plus the length of the bracketing delimiters must not exceed LITLEN (%1)"
,"ISO 8879:1986 10.5.4.1"
#endif
);
const MessageType1 ParserMessages::genericIdentifierLength(
MessageType::quantityError,
&libModule,
242
#ifndef SP_NO_MESSAGE_TEXT
,"length of rank stem plus length of rank suffix must not exceed NAMELEN (%1)"
,"ISO 8879:1986 11.2.1.2"
#endif
);
const MessageType0 ParserMessages::instanceStartOmittag(
MessageType::error,
&libModule,
243
#ifndef SP_NO_MESSAGE_TEXT
,"document instance must start with document element"
,"ISO 8879:1986 7.2p1"
#endif
);
const MessageType1 ParserMessages::grplvl(
MessageType::quantityError,
&libModule,
244
#ifndef SP_NO_MESSAGE_TEXT
,"content model nesting level exceeds GRPLVL (%1)"
,"ISO 8879:1986 11.2.4.5p1"
#endif
);
const MessageType1 ParserMessages::grpgtcnt(
MessageType::quantityError,
&libModule,
245
#ifndef SP_NO_MESSAGE_TEXT
,"grand total of content tokens exceeds GRPGTCNT (%1)"
,"ISO 8879:1986 11.2.4.5p2"
#endif
);
const MessageType0 ParserMessages::unclosedStartTagShorttag(
MessageType::error,
&libModule,
246
#ifndef SP_NO_MESSAGE_TEXT
,"unclosed start-tag requires SHORTTAG YES"
,"ISO 8879:1986 7.4.1p2"
#endif
);
const MessageType0 ParserMessages::netEnablingStartTagShorttag(
MessageType::error,
&libModule,
247
#ifndef SP_NO_MESSAGE_TEXT
,"NET-enabling start-tag requires SHORTTAG YES"
,"ISO 8879:1986 7.4.1p2"
#endif
);
const MessageType0 ParserMessages::unclosedEndTagShorttag(
MessageType::error,
&libModule,
248
#ifndef SP_NO_MESSAGE_TEXT
,"unclosed end-tag requires SHORTTAG YES"
,"ISO 8879:1986 7.5.1p2"
#endif
);
const MessageType0 ParserMessages::multipleDtds(
MessageType::error,
&libModule,
249
#ifndef SP_NO_MESSAGE_TEXT
,"DTDs other than base allowed only if CONCUR YES or EXPLICIT YES"
,"ISO 8879:1986 7.1p6"
#endif
);
const MessageType0 ParserMessages::afterDocumentElementEntityEnd(
MessageType::error,
&libModule,
250
#ifndef SP_NO_MESSAGE_TEXT
,"end of entity other than document entity after document element"
,"ISO 8879:1986 7.2p1"
#endif
);
const MessageType1 ParserMessages::declarationAfterDocumentElement(
MessageType::error,
&libModule,
251
#ifndef SP_NO_MESSAGE_TEXT
,"%1 declaration illegal after document element"
,"ISO 8879:1986 7.2p1"
#endif
);
const MessageType0 ParserMessages::characterReferenceAfterDocumentElement(
MessageType::error,
&libModule,
252
#ifndef SP_NO_MESSAGE_TEXT
,"character reference illegal after document element"
,"ISO 8879:1986 7.2p1"
#endif
);
const MessageType0 ParserMessages::entityReferenceAfterDocumentElement(
MessageType::error,
&libModule,
253
#ifndef SP_NO_MESSAGE_TEXT
,"entity reference illegal after document element"
,"ISO 8879:1986 7.2p1"
#endif
);
const MessageType0 ParserMessages::markedSectionAfterDocumentElement(
MessageType::error,
&libModule,
254
#ifndef SP_NO_MESSAGE_TEXT
,"marked section illegal after document element"
,"ISO 8879:1986 7.2p1"
#endif
);
const MessageType3 ParserMessages::requiredElementExcluded(
MessageType::error,
&libModule,
255
#ifndef SP_NO_MESSAGE_TEXT
,"the %1 occurrence of %2 in the content model for %3 cannot be excluded at this point because it is contextually required"
,"ISO 8879:1986 11.2.5.2p5"
#endif
);
const MessageType3 ParserMessages::invalidExclusion(
MessageType::error,
&libModule,
256
#ifndef SP_NO_MESSAGE_TEXT
,"the %1 occurrence of %2 in the content model for %3 cannot be excluded because it is neither inherently optional nor a member of an OR group"
,"ISO 8879:1986 11.2.5.2p4"
#endif
);
const MessageType0 ParserMessages::attributeValueShorttag(
MessageType::error,
&libModule,
257
#ifndef SP_NO_MESSAGE_TEXT
,"an attribute value specification must be an attribute value literal unless SHORTTAG YES is specified"
,"ISO 8879:1986 7.9.3.1"
#endif
);
const MessageType0 ParserMessages::conrefNotation(
MessageType::error,
&libModule,
258
#ifndef SP_NO_MESSAGE_TEXT
,"value cannot be specified both for notation attribute and content reference attribute"
,"ISO 8879:1986 7.9.4.4p2"
#endif
);
const MessageType1 ParserMessages::duplicateNotationDeclaration(
MessageType::error,
&libModule,
259
#ifndef SP_NO_MESSAGE_TEXT
,"notation %1 already defined"
,"ISO 8879:1986 11.4p3"
#endif
);
const MessageType1L ParserMessages::duplicateShortrefDeclaration(
MessageType::error,
&libModule,
260
#ifndef SP_NO_MESSAGE_TEXT
,"short reference map %1 already defined"
,"ISO 8879:1986 11.5p3"
,"first defined here"
#endif
);
const MessageType1 ParserMessages::duplicateDelimGeneral(
MessageType::error,
&libModule,
262
#ifndef SP_NO_MESSAGE_TEXT
,"general delimiter role %1 already defined"
,"ISO 8879:1986 13.4.6.1"
#endif
);
const MessageType1 ParserMessages::idrefGrpcnt(
MessageType::quantityError,
&libModule,
263
#ifndef SP_NO_MESSAGE_TEXT
,"number of ID references in start-tag must not exceed GRPCNT (%1)"
,"ISO 8879:1986 7.9.4.5p5"
#endif
);
const MessageType1 ParserMessages::entityNameGrpcnt(
MessageType::quantityError,
&libModule,
264
#ifndef SP_NO_MESSAGE_TEXT
,"number of entity names in attribute specification list must not exceed GRPCNT (%1)"
,"ISO 8879:1986 7.9.4.5p6"
#endif
);
const MessageType2 ParserMessages::attsplen(
MessageType::quantityError,
&libModule,
265
#ifndef SP_NO_MESSAGE_TEXT
,"normalized length of attribute specification list must not exceed ATTSPLEN (%1); length was %2"
,"ISO 8879:1986 7.9.2"
#endif
);
const MessageType1 ParserMessages::duplicateDelimShortref(
MessageType::error,
&libModule,
266
#ifndef SP_NO_MESSAGE_TEXT
,"short reference delimiter %1 already specified"
,"ISO 8879:1986 13.4.6p2"
#endif
);
const MessageType1 ParserMessages::duplicateDelimShortrefSet(
MessageType::error,
&libModule,
267
#ifndef SP_NO_MESSAGE_TEXT
,"single character short references were already specified for character numbers: %1"
,"ISO 8879:1986 13.4.6.2"
#endif
);
const MessageType1 ParserMessages::defaultEntityInAttribute(
MessageType::warning,
&libModule,
268
#ifndef SP_NO_MESSAGE_TEXT
,"default entity used in entity attribute %1"
#endif
);
const MessageType1 ParserMessages::defaultEntityReference(
MessageType::warning,
&libModule,
269
#ifndef SP_NO_MESSAGE_TEXT
,"reference to entity %1 uses default entity"
#endif
);
const MessageType2 ParserMessages::mapDefaultEntity(
MessageType::warning,
&libModule,
270
#ifndef SP_NO_MESSAGE_TEXT
,"entity %1 in short reference map %2 uses default entity"
#endif
);
const MessageType1 ParserMessages::noSuchDtd(
MessageType::error,
&libModule,
271
#ifndef SP_NO_MESSAGE_TEXT
,"no DTD %1 declared"
,"ISO 8879:1986 12.1.3p6"
#endif
);
const MessageType1 ParserMessages::noLpdSubset(
MessageType::warning,
&libModule,
272
#ifndef SP_NO_MESSAGE_TEXT
,"LPD %1 has neither internal nor external subset"
#endif
);
const MessageType0 ParserMessages::assocElementDifferentAtts(
MessageType::error,
&libModule,
273
#ifndef SP_NO_MESSAGE_TEXT
,"element types have different link attribute definitions"
,"ISO 8879:1986 12.2.1p11"
#endif
);
const MessageType1 ParserMessages::duplicateLinkSet(
MessageType::error,
&libModule,
274
#ifndef SP_NO_MESSAGE_TEXT
,"link set %1 already defined"
,"ISO 8879:1986 12.2p6"
#endif
);
const MessageType0 ParserMessages::emptyResultAttributeSpec(
MessageType::error,
&libModule,
275
#ifndef SP_NO_MESSAGE_TEXT
,"empty result attribute specification"
,"ISO 8879:1986 12.2.2p8"
#endif
);
const MessageType1 ParserMessages::noSuchSourceElement(
MessageType::error,
&libModule,
276
#ifndef SP_NO_MESSAGE_TEXT
,"no source element type %1"
#endif
);
const MessageType1 ParserMessages::noSuchResultElement(
MessageType::error,
&libModule,
277
#ifndef SP_NO_MESSAGE_TEXT
,"no result element type %1"
#endif
);
const MessageType0 ParserMessages::documentEndLpdSubset(
MessageType::error,
&libModule,
278
#ifndef SP_NO_MESSAGE_TEXT
,"end of document in LPD subset"
#endif
);
const MessageType1 ParserMessages::lpdSubsetDeclaration(
MessageType::error,
&libModule,
279
#ifndef SP_NO_MESSAGE_TEXT
,"%1 declaration not allowed in LPD subset"
#endif
);
const MessageType0 ParserMessages::idlinkDeclSimple(
MessageType::error,
&libModule,
280
#ifndef SP_NO_MESSAGE_TEXT
,"ID link set declaration not allowed in simple link declaration subset"
,"ISO 8879:1986 12.1.4.3"
#endif
);
const MessageType0 ParserMessages::linkDeclSimple(
MessageType::error,
&libModule,
281
#ifndef SP_NO_MESSAGE_TEXT
,"link set declaration not allowed in simple link declaration subset"
,"ISO 8879:1986 12.1.4.3"
#endif
);
const MessageType1 ParserMessages::simpleLinkAttlistElement(
MessageType::error,
&libModule,
282
#ifndef SP_NO_MESSAGE_TEXT
,"attributes can only be defined for base document element (not %1) in simple link declaration subset"
,"ISO 8879:1986 12.1.4.3"
#endif
);
const MessageType0 ParserMessages::shortrefOnlyInBaseDtd(
MessageType::error,
&libModule,
283
#ifndef SP_NO_MESSAGE_TEXT
,"a short reference mapping declaration is allowed only in the base DTD"
,"ISO 8879:1986 11.1p11"
#endif
);
const MessageType0 ParserMessages::usemapOnlyInBaseDtd(
MessageType::error,
&libModule,
284
#ifndef SP_NO_MESSAGE_TEXT
,"a short reference use declaration is allowed only in the base DTD"
,"ISO 8879:1986 11.1p11"
#endif
);
const MessageType0 ParserMessages::linkAttributeDefaultValue(
MessageType::error,
&libModule,
285
#ifndef SP_NO_MESSAGE_TEXT
,"default value of link attribute cannot be CURRENT or CONREF"
,"ISO 8879:1986 12.1.4.2p3"
#endif
);
const MessageType0 ParserMessages::linkAttributeDeclaredValue(
MessageType::error,
&libModule,
286
#ifndef SP_NO_MESSAGE_TEXT
,"declared value of link attribute cannot be ID, IDREF, IDREFS or NOTATION"
,"ISO 8879:1986 12.1.4.2p2"
#endif
);
const MessageType0 ParserMessages::simpleLinkFixedAttribute(
MessageType::error,
&libModule,
287
#ifndef SP_NO_MESSAGE_TEXT
,"only fixed attributes can be defined in simple LPD"
,"ISO 8879:1986 12.1.4.3"
#endif
);
const MessageType0 ParserMessages::duplicateIdLinkSet(
MessageType::error,
&libModule,
288
#ifndef SP_NO_MESSAGE_TEXT
,"only one ID link set declaration allowed in an LPD subset"
,"ISO 8879:1986 12.1.4p1"
#endif
);
const MessageType1 ParserMessages::noInitialLinkSet(
MessageType::error,
&libModule,
289
#ifndef SP_NO_MESSAGE_TEXT
,"no initial link set defined for LPD %1"
,"ISO 8879:1986 12.2p7"
#endif
);
const MessageType1 ParserMessages::notationUndefinedSourceDtd(
MessageType::error,
&libModule,
290
#ifndef SP_NO_MESSAGE_TEXT
,"notation %1 not defined in source DTD"
#endif
);
const MessageType0 ParserMessages::simpleLinkResultNotImplied(
MessageType::error,
&libModule,
291
#ifndef SP_NO_MESSAGE_TEXT
,"result document type in simple link specification must be implied"
,"ISO 8879:1986 12.1.1p1"
#endif
);
const MessageType0 ParserMessages::simpleLinkFeature(
MessageType::error,
&libModule,
292
#ifndef SP_NO_MESSAGE_TEXT
,"simple link requires SIMPLE YES"
,"ISO 8879:1986 12.1.1p5"
#endif
);
const MessageType0 ParserMessages::implicitLinkFeature(
MessageType::error,
&libModule,
293
#ifndef SP_NO_MESSAGE_TEXT
,"implicit link requires IMPLICIT YES"
,"ISO 8879:1986 12.1.2p4"
#endif
);
const MessageType0 ParserMessages::explicitLinkFeature(
MessageType::error,
&libModule,
294
#ifndef SP_NO_MESSAGE_TEXT
,"explicit link requires EXPLICIT YES"
,"ISO 8879:1986 12.1.3p4"
#endif
);
const MessageType0 ParserMessages::lpdBeforeBaseDtd(
MessageType::error,
&libModule,
295
#ifndef SP_NO_MESSAGE_TEXT
,"LPD not allowed before first DTD"
,"ISO 8879:1986 7.1p1"
#endif
);
const MessageType0 ParserMessages::dtdAfterLpd(
MessageType::error,
&libModule,
296
#ifndef SP_NO_MESSAGE_TEXT
,"DTD not allowed after an LPD"
,"ISO 8879:1986 7.1p1"
#endif
);
const MessageType1 ParserMessages::unstableLpdGeneralEntity(
MessageType::error,
&libModule,
297
#ifndef SP_NO_MESSAGE_TEXT
,"definition of general entity %1 is unstable"
#endif
);
const MessageType1 ParserMessages::unstableLpdParameterEntity(
MessageType::error,
&libModule,
298
#ifndef SP_NO_MESSAGE_TEXT
,"definition of parameter entity %1 is unstable"
#endif
);
const MessageType1 ParserMessages::multipleIdLinkRuleAttribute(
MessageType::error,
&libModule,
299
#ifndef SP_NO_MESSAGE_TEXT
,"multiple link rules for ID %1 but not all have link attribute specifications"
,"ISO 8879:1986 12.2.3p3"
#endif
);
const MessageType1 ParserMessages::multipleLinkRuleAttribute(
MessageType::error,
&libModule,
300
#ifndef SP_NO_MESSAGE_TEXT
,"multiple link rules for element type %1 but not all have link attribute specifications"
,"ISO 8879:1986 12.2.1p9"
#endif
);
const MessageType2 ParserMessages::uselinkBadLinkSet(
MessageType::error,
&libModule,
301
#ifndef SP_NO_MESSAGE_TEXT
,"link type %1 does not have a link set %2"
,"ISO 8879:1986 12.3p10"
#endif
);
const MessageType1 ParserMessages::uselinkSimpleLpd(
MessageType::error,
&libModule,
302
#ifndef SP_NO_MESSAGE_TEXT
,"link set use declaration for simple link process"
#endif
);
const MessageType1 ParserMessages::uselinkBadLinkType(
MessageType::error,
&libModule,
303
#ifndef SP_NO_MESSAGE_TEXT
,"no link type %1"
,"ISO 8879:1986 12.3p10"
#endif
);
const MessageType1 ParserMessages::duplicateDtdLpd(
MessageType::error,
&libModule,
304
#ifndef SP_NO_MESSAGE_TEXT
,"both document type and link type %1"
,"ISO 8879:1986 12.1p3"
#endif
);
const MessageType1 ParserMessages::duplicateLpd(
MessageType::error,
&libModule,
305
#ifndef SP_NO_MESSAGE_TEXT
,"link type %1 already defined"
,"ISO 8879:1986 12.1p3"
#endif
);
const MessageType1 ParserMessages::duplicateDtd(
MessageType::error,
&libModule,
306
#ifndef SP_NO_MESSAGE_TEXT
,"document type %1 already defined"
,"ISO 8879:1986 11.1p7"
#endif
);
const MessageType1 ParserMessages::undefinedLinkSet(
MessageType::error,
&libModule,
307
#ifndef SP_NO_MESSAGE_TEXT
,"link set %1 used in LPD but not defined"
,"ISO 8879:1986 12.2.2p8"
#endif
);
const MessageType1 ParserMessages::duplicateImpliedResult(
MessageType::error,
&libModule,
308
#ifndef SP_NO_MESSAGE_TEXT
,"#IMPLIED already linked to result element type %1"
,"ISO 8879:1986 12.2.2p6"
#endif
);
const MessageType1 ParserMessages::simpleLinkCount(
MessageType::error,
&libModule,
309
#ifndef SP_NO_MESSAGE_TEXT
,"number of active simple link processes exceeds quantity specified for SIMPLE parameter in SGML declaration (%1)"
,"ISO 8879:1986 12.1.1.1p1"
#endif
);
const MessageType0 ParserMessages::duplicateExplicitChain(
MessageType::error,
&libModule,
310
#ifndef SP_NO_MESSAGE_TEXT
,"only one chain of explicit link processes can be active"
,"ISO 8879:1986 7.1p11"
#endif
);
const MessageType1 ParserMessages::explicit1RequiresSourceTypeBase(
MessageType::error,
&libModule,
311
#ifndef SP_NO_MESSAGE_TEXT
,"source document type name for link type %1 must be base document type since EXPLICIT YES 1"
,"ISO 8879:1986 12.1.2p5 12.1.3p5 12.1.3.1"
#endif
);
const MessageType0 ParserMessages::oneImplicitLink(
MessageType::error,
&libModule,
312
#ifndef SP_NO_MESSAGE_TEXT
,"only one implicit link process can be active"
,"ISO 8879:1986 7.1p10"
#endif
);
const MessageType1 ParserMessages::sorryLink(
MessageType::warning,
&libModule,
313
#ifndef SP_NO_MESSAGE_TEXT
,"sorry, link type %1 not activated: only one implicit or explicit link process can be active (with base document type as source document type)"
#endif
);
const MessageType0 ParserMessages::entityReferenceMissingName(
MessageType::error,
&libModule,
314
#ifndef SP_NO_MESSAGE_TEXT
,"name missing after name group in entity reference"
,"ISO 8879:1986 9.4.4p1 9.4.4p2"
#endif
);
const MessageType1 ParserMessages::explicitNoRequiresSourceTypeBase(
MessageType::error,
&libModule,
315
#ifndef SP_NO_MESSAGE_TEXT
,"source document type name for link type %1 must be base document type since EXPLICIT NO"
,"ISO 8879:1986 12.1.2p5 12.1.3p5 12.1.3.1"
#endif
);
const MessageType0 ParserMessages::linkActivateTooLate(
MessageType::warning,
&libModule,
316
#ifndef SP_NO_MESSAGE_TEXT
,"link process must be activated before base DTD"
#endif
);
const MessageType0 ParserMessages::pass2Ee(
MessageType::error,
&libModule,
317
#ifndef SP_NO_MESSAGE_TEXT
,"unexpected entity end while starting second pass"
#endif
);
const MessageType2 ParserMessages::idlinkElementType(
MessageType::error,
&libModule,
318
#ifndef SP_NO_MESSAGE_TEXT
,"type %1 of element with ID %2 not associated element type for applicable link rule in ID link set"
,"ISO 8879:1986 12.2.3p2"
#endif
);
const MessageType0 ParserMessages::datatagNotImplemented(
MessageType::error,
&libModule,
319
#ifndef SP_NO_MESSAGE_TEXT
,"DATATAG feature not implemented"
#endif
);
const MessageType0 ParserMessages::startTagMissingName(
MessageType::error,
&libModule,
320
#ifndef SP_NO_MESSAGE_TEXT
,"generic identifier specification missing after document type specification in start-tag"
,"ISO 8879:1986 7.4p1"
#endif
);
const MessageType0 ParserMessages::endTagMissingName(
MessageType::error,
&libModule,
321
#ifndef SP_NO_MESSAGE_TEXT
,"generic identifier specification missing after document type specification in end-tag"
,"ISO 8879:1986 7.5p1"
#endif
);
const MessageType0 ParserMessages::startTagGroupNet(
MessageType::error,
&libModule,
322
#ifndef SP_NO_MESSAGE_TEXT
,"a NET-enabling start-tag cannot include a document type specification"
,"ISO 8879:1986 7.4.1.3p1"
#endif
);
const MessageType0 ParserMessages::documentElementUndefined(
MessageType::error,
&libModule,
323
#ifndef SP_NO_MESSAGE_TEXT
,"DTD did not contain element declaration for document type name"
,"ISO 8879:1986 11.1p10"
#endif
);
const MessageType0 ParserMessages::badDefaultSgmlDecl(
MessageType::error,
&libModule,
324
#ifndef SP_NO_MESSAGE_TEXT
,"invalid default SGML declaration"
#endif
);
const MessageType1L ParserMessages::nonExistentEntityRef(
MessageType::error,
&libModule,
325
#ifndef SP_NO_MESSAGE_TEXT
,"reference to entity %1 for which no system identifier could be generated"
,0
,"entity was defined here"
#endif
);
const MessageType0 ParserMessages::pcdataUnreachable(
MessageType::warning,
&libModule,
327
#ifndef SP_NO_MESSAGE_TEXT
,"content model is mixed but does not allow #PCDATA everywhere"
,"ISO 8879:1986 11.2.4p11"
#endif
);
const MessageType0 ParserMessages::sdRangeNotSingleChar(
MessageType::error,
&libModule,
328
#ifndef SP_NO_MESSAGE_TEXT
,"start or end of range must specify a single character"
#endif
);
const MessageType0 ParserMessages::sdInvalidRange(
MessageType::error,
&libModule,
329
#ifndef SP_NO_MESSAGE_TEXT
,"number of first character in range must not exceed number of second character in range"
#endif
);
const MessageType0 ParserMessages::sdEmptyDelimiter(
MessageType::error,
&libModule,
330
#ifndef SP_NO_MESSAGE_TEXT
,"delimiter cannot be an empty string"
#endif
);
const MessageType0 ParserMessages::tooManyCharsMinimumLiteral(
MessageType::warning,
&libModule,
331
#ifndef SP_NO_MESSAGE_TEXT
,"too many characters assigned same meaning with minimum literal"
#endif
);
const MessageType1 ParserMessages::defaultedEntityDefined(
MessageType::warning,
&libModule,
332
#ifndef SP_NO_MESSAGE_TEXT
,"earlier reference to entity %1 used default entity"
#endif
);
const MessageType0 ParserMessages::emptyStartTag(
MessageType::warning,
&libModule,
333
#ifndef SP_NO_MESSAGE_TEXT
,"empty start-tag"
#endif
);
const MessageType0 ParserMessages::emptyEndTag(
MessageType::warning,
&libModule,
334
#ifndef SP_NO_MESSAGE_TEXT
,"empty end-tag"
#endif
);
const MessageType1 ParserMessages::unusedMap(
MessageType::warning,
&libModule,
335
#ifndef SP_NO_MESSAGE_TEXT
,"unused short reference map %1"
#endif
);
const MessageType1 ParserMessages::unusedParamEntity(
MessageType::warning,
&libModule,
336
#ifndef SP_NO_MESSAGE_TEXT
,"unused parameter entity %1"
#endif
);
const MessageType1 ParserMessages::cannotGenerateSystemIdPublic(
MessageType::warning,
&libModule,
337
#ifndef SP_NO_MESSAGE_TEXT
,"cannot generate system identifier for public text %1"
#endif
);
const MessageType1 ParserMessages::cannotGenerateSystemIdGeneral(
MessageType::warning,
&libModule,
338
#ifndef SP_NO_MESSAGE_TEXT
,"cannot generate system identifier for general entity %1"
#endif
);
const MessageType1 ParserMessages::cannotGenerateSystemIdParameter(
MessageType::warning,
&libModule,
339
#ifndef SP_NO_MESSAGE_TEXT
,"cannot generate system identifier for parameter entity %1"
#endif
);
const MessageType1 ParserMessages::cannotGenerateSystemIdDoctype(
MessageType::warning,
&libModule,
340
#ifndef SP_NO_MESSAGE_TEXT
,"cannot generate system identifier for document type %1"
#endif
);
const MessageType1 ParserMessages::cannotGenerateSystemIdLinktype(
MessageType::warning,
&libModule,
341
#ifndef SP_NO_MESSAGE_TEXT
,"cannot generate system identifier for link type %1"
#endif
);
const MessageType1 ParserMessages::cannotGenerateSystemIdNotation(
MessageType::warning,
&libModule,
342
#ifndef SP_NO_MESSAGE_TEXT
,"cannot generate system identifier for notation %1"
#endif
);
const MessageType1 ParserMessages::excludeIncludeSame(
MessageType::warning,
&libModule,
343
#ifndef SP_NO_MESSAGE_TEXT
,"element type %1 both included and excluded"
#endif
);
const MessageType1 ParserMessages::implyingDtd(
MessageType::error,
&libModule,
344
#ifndef SP_NO_MESSAGE_TEXT
,"no document type declaration; implying %1"
#endif
);
const MessageType1 ParserMessages::afdrVersion(
MessageType::error,
&libModule,
345
#ifndef SP_NO_MESSAGE_TEXT
,"minimum data of AFDR declaration must be \"ISO/IEC 10744:1997\" not %1"
#endif
);
const MessageType0 ParserMessages::missingAfdrDecl(
MessageType::error,
&libModule,
346
#ifndef SP_NO_MESSAGE_TEXT
,"AFDR declaration required before use of AFDR extensions"
#endif
);
const MessageType0 ParserMessages::enrRequired(
MessageType::error,
&libModule,
347
#ifndef SP_NO_MESSAGE_TEXT
,"ENR extensions were used but minimum literal was not \"ISO 8879:1986 (ENR)\" or \"ISO 8879:1986 (WWW)\""
#endif
);
const MessageType1 ParserMessages::numericCharRefLiteralNonSgml(
MessageType::error,
&libModule,
348
#ifndef SP_NO_MESSAGE_TEXT
,"illegal numeric character reference to non-SGML character %1 in literal"
#endif
);
const MessageType2 ParserMessages::numericCharRefUnknownDesc(
MessageType::error,
&libModule,
349
#ifndef SP_NO_MESSAGE_TEXT
,"cannot convert character reference to number %1 because description %2 unrecognized"
#endif
);
const MessageType3 ParserMessages::numericCharRefUnknownBase(
MessageType::error,
&libModule,
350
#ifndef SP_NO_MESSAGE_TEXT
,"cannot convert character reference to number %1 because character %2 from baseset %3 unknown"
#endif
);
const MessageType1 ParserMessages::numericCharRefBadInternal(
MessageType::error,
&libModule,
351
#ifndef SP_NO_MESSAGE_TEXT
,"character reference to number %1 cannot be converted because of problem with internal character set"
#endif
);
const MessageType1 ParserMessages::numericCharRefNoInternal(
MessageType::error,
&libModule,
352
#ifndef SP_NO_MESSAGE_TEXT
,"cannot convert character reference to number %1 because character not in internal character set"
#endif
);
const MessageType0 ParserMessages::wwwRequired(
MessageType::error,
&libModule,
353
#ifndef SP_NO_MESSAGE_TEXT
,"Web SGML adaptations were used but minimum literal was not \"ISO 8879:1986 (WWW)\""
#endif
);
const MessageType1 ParserMessages::attributeTokenNotUnique(
MessageType::error,
&libModule,
354
#ifndef SP_NO_MESSAGE_TEXT
,"token %1 can be value for multiple attributes so attribute name required"
#endif
);
const MessageType1 ParserMessages::hexNumberLength(
MessageType::quantityError,
&libModule,
355
#ifndef SP_NO_MESSAGE_TEXT
,"length of hex number must not exceed NAMELEN (%1)"
#endif
);
const MessageType1 ParserMessages::entityNameSyntax(
MessageType::warning,
&libModule,
356
#ifndef SP_NO_MESSAGE_TEXT
,"%1 is not a valid name in the declared concrete syntax"
#endif
);
const MessageType0 ParserMessages::cdataContent(
MessageType::warning,
&libModule,
357
#ifndef SP_NO_MESSAGE_TEXT
,"CDATA declared content"
#endif
);
const MessageType0 ParserMessages::rcdataContent(
MessageType::warning,
&libModule,
358
#ifndef SP_NO_MESSAGE_TEXT
,"RCDATA declared content"
#endif
);
const MessageType0 ParserMessages::inclusion(
MessageType::warning,
&libModule,
359
#ifndef SP_NO_MESSAGE_TEXT
,"inclusion"
#endif
);
const MessageType0 ParserMessages::exclusion(
MessageType::warning,
&libModule,
360
#ifndef SP_NO_MESSAGE_TEXT
,"exclusion"
#endif
);
const MessageType0 ParserMessages::numberDeclaredValue(
MessageType::warning,
&libModule,
361
#ifndef SP_NO_MESSAGE_TEXT
,"NUMBER or NUMBERS declared value"
#endif
);
const MessageType0 ParserMessages::nameDeclaredValue(
MessageType::warning,
&libModule,
362
#ifndef SP_NO_MESSAGE_TEXT
,"NAME or NAMES declared value"
#endif
);
const MessageType0 ParserMessages::nutokenDeclaredValue(
MessageType::warning,
&libModule,
363
#ifndef SP_NO_MESSAGE_TEXT
,"NUTOKEN or NUTOKENS declared value"
#endif
);
const MessageType0 ParserMessages::conrefAttribute(
MessageType::warning,
&libModule,
364
#ifndef SP_NO_MESSAGE_TEXT
,"CONREF attribute"
#endif
);
const MessageType0 ParserMessages::currentAttribute(
MessageType::warning,
&libModule,
365
#ifndef SP_NO_MESSAGE_TEXT
,"CURRENT attribute"
#endif
);
const MessageType0 ParserMessages::tempMarkedSection(
MessageType::warning,
&libModule,
366
#ifndef SP_NO_MESSAGE_TEXT
,"TEMP marked section"
#endif
);
const MessageType0 ParserMessages::instanceIncludeMarkedSection(
MessageType::warning,
&libModule,
367
#ifndef SP_NO_MESSAGE_TEXT
,"included marked section in the instance"
#endif
);
const MessageType0 ParserMessages::instanceIgnoreMarkedSection(
MessageType::warning,
&libModule,
368
#ifndef SP_NO_MESSAGE_TEXT
,"ignored marked section in the instance"
#endif
);
const MessageType0 ParserMessages::rcdataMarkedSection(
MessageType::warning,
&libModule,
369
#ifndef SP_NO_MESSAGE_TEXT
,"RCDATA marked section"
#endif
);
const MessageType0 ParserMessages::piEntity(
MessageType::warning,
&libModule,
370
#ifndef SP_NO_MESSAGE_TEXT
,"processing instruction entity"
#endif
);
const MessageType0 ParserMessages::bracketEntity(
MessageType::warning,
&libModule,
371
#ifndef SP_NO_MESSAGE_TEXT
,"bracketed text entity"
#endif
);
const MessageType0 ParserMessages::internalCdataEntity(
MessageType::warning,
&libModule,
372
#ifndef SP_NO_MESSAGE_TEXT
,"internal CDATA entity"
#endif
);
const MessageType0 ParserMessages::internalSdataEntity(
MessageType::warning,
&libModule,
373
#ifndef SP_NO_MESSAGE_TEXT
,"internal SDATA entity"
#endif
);
const MessageType0 ParserMessages::externalCdataEntity(
MessageType::warning,
&libModule,
374
#ifndef SP_NO_MESSAGE_TEXT
,"external CDATA entity"
#endif
);
const MessageType0 ParserMessages::externalSdataEntity(
MessageType::warning,
&libModule,
375
#ifndef SP_NO_MESSAGE_TEXT
,"external SDATA entity"
#endif
);
const MessageType0 ParserMessages::dataAttributes(
MessageType::warning,
&libModule,
376
#ifndef SP_NO_MESSAGE_TEXT
,"attribute definition list declaration for notation"
#endif
);
const MessageType0 ParserMessages::rank(
MessageType::warning,
&libModule,
377
#ifndef SP_NO_MESSAGE_TEXT
,"rank stem"
#endif
);
const MessageType0 ParserMessages::missingSystemId(
MessageType::warning,
&libModule,
378
#ifndef SP_NO_MESSAGE_TEXT
,"no system id specified"
#endif
);
const MessageType0 ParserMessages::psComment(
MessageType::warning,
&libModule,
379
#ifndef SP_NO_MESSAGE_TEXT
,"comment in parameter separator"
#endif
);
const MessageType0 ParserMessages::namedCharRef(
MessageType::warning,
&libModule,
380
#ifndef SP_NO_MESSAGE_TEXT
,"named character reference"
#endif
);
const MessageType0 ParserMessages::andGroup(
MessageType::warning,
&libModule,
381
#ifndef SP_NO_MESSAGE_TEXT
,"AND group"
#endif
);
const MessageType0 ParserMessages::attributeValueNotLiteral(
MessageType::warning,
&libModule,
382
#ifndef SP_NO_MESSAGE_TEXT
,"attribute value not a literal"
#endif
);
const MessageType0 ParserMessages::missingAttributeName(
MessageType::warning,
&libModule,
383
#ifndef SP_NO_MESSAGE_TEXT
,"attribute name missing"
#endif
);
const MessageType0 ParserMessages::elementGroupDecl(
MessageType::warning,
&libModule,
384
#ifndef SP_NO_MESSAGE_TEXT
,"element declaration for group of element types"
#endif
);
const MessageType0 ParserMessages::attlistGroupDecl(
MessageType::warning,
&libModule,
385
#ifndef SP_NO_MESSAGE_TEXT
,"attribute definition list declaration for group of element types"
#endif
);
const MessageType0 ParserMessages::emptyCommentDecl(
MessageType::warning,
&libModule,
386
#ifndef SP_NO_MESSAGE_TEXT
,"empty comment declaration"
#endif
);
const MessageType0 ParserMessages::commentDeclS(
MessageType::warning,
&libModule,
387
#ifndef SP_NO_MESSAGE_TEXT
,"S separator in comment declaration"
#endif
);
const MessageType0 ParserMessages::commentDeclMultiple(
MessageType::warning,
&libModule,
388
#ifndef SP_NO_MESSAGE_TEXT
,"multiple comments in comment declaration"
#endif
);
const MessageType0 ParserMessages::missingStatusKeyword(
MessageType::warning,
&libModule,
389
#ifndef SP_NO_MESSAGE_TEXT
,"no status keyword"
#endif
);
const MessageType0 ParserMessages::multipleStatusKeyword(
MessageType::warning,
&libModule,
390
#ifndef SP_NO_MESSAGE_TEXT
,"multiple status keywords"
#endif
);
const MessageType0 ParserMessages::instanceParamEntityRef(
MessageType::warning,
&libModule,
391
#ifndef SP_NO_MESSAGE_TEXT
,"parameter entity reference in document instance"
#endif
);
const MessageType0 ParserMessages::current(
MessageType::warning,
&libModule,
392
#ifndef SP_NO_MESSAGE_TEXT
,"CURRENT attribute"
#endif
);
const MessageType0 ParserMessages::minimizationParam(
MessageType::warning,
&libModule,
393
#ifndef SP_NO_MESSAGE_TEXT
,"element type minimization parameter"
#endif
);
const MessageType0 ParserMessages::refc(
MessageType::warning,
&libModule,
394
#ifndef SP_NO_MESSAGE_TEXT
,"reference not terminated by REFC delimiter"
#endif
);
const MessageType0 ParserMessages::pcdataNotFirstInGroup(
MessageType::warning,
&libModule,
395
#ifndef SP_NO_MESSAGE_TEXT
,"#PCDATA not first in model group"
#endif
);
const MessageType0 ParserMessages::pcdataInSeqGroup(
MessageType::warning,
&libModule,
396
#ifndef SP_NO_MESSAGE_TEXT
,"#PCDATA in SEQ group"
#endif
);
const MessageType0 ParserMessages::pcdataInNestedModelGroup(
MessageType::warning,
&libModule,
397
#ifndef SP_NO_MESSAGE_TEXT
,"#PCDATA in nested model group"
#endif
);
const MessageType0 ParserMessages::pcdataGroupNotRep(
MessageType::warning,
&libModule,
398
#ifndef SP_NO_MESSAGE_TEXT
,"#PCDATA in model group that does not have REP occurrence indicator"
#endif
);
const MessageType0 ParserMessages::nameGroupNotOr(
MessageType::warning,
&libModule,
399
#ifndef SP_NO_MESSAGE_TEXT
,"name group or name token group used connector other than OR"
#endif
);
const MessageType0 ParserMessages::piMissingName(
MessageType::warning,
&libModule,
400
#ifndef SP_NO_MESSAGE_TEXT
,"processing instruction does not start with name"
#endif
);
const MessageType0 ParserMessages::instanceStatusKeywordSpecS(
MessageType::warning,
&libModule,
401
#ifndef SP_NO_MESSAGE_TEXT
,"S separator in status keyword specification in document instance"
#endif
);
const MessageType0 ParserMessages::externalDataEntityRef(
MessageType::warning,
&libModule,
402
#ifndef SP_NO_MESSAGE_TEXT
,"reference to external data entity"
#endif
);
const MessageType0 ParserMessages::attributeValueExternalEntityRef(
MessageType::warning,
&libModule,
403
#ifndef SP_NO_MESSAGE_TEXT
,"reference to external entity in attribute value"
#endif
);
const MessageType1 ParserMessages::dataCharDelim(
MessageType::warning,
&libModule,
404
#ifndef SP_NO_MESSAGE_TEXT
,"character %1 is the first character of a delimiter but occurred as data"
#endif
);
const MessageType0 ParserMessages::explicitSgmlDecl(
MessageType::warning,
&libModule,
405
#ifndef SP_NO_MESSAGE_TEXT
,"SGML declaration was not implied"
#endif
);
const MessageType0 ParserMessages::internalSubsetMarkedSection(
MessageType::warning,
&libModule,
406
#ifndef SP_NO_MESSAGE_TEXT
,"marked section in internal DTD subset"
#endif
);
const MessageType0 ParserMessages::nestcWithoutNet(
MessageType::error,
&libModule,
407
#ifndef SP_NO_MESSAGE_TEXT
,"NET-enabling start-tag not immediately followed by null end-tag"
#endif
);
const MessageType0 ParserMessages::contentAsyncEntityRef(
MessageType::error,
&libModule,
408
#ifndef SP_NO_MESSAGE_TEXT
,"entity end in different element from entity reference"
#endif
);
const MessageType0 ParserMessages::immednetRequiresEmptynrm(
MessageType::error,
&libModule,
409
#ifndef SP_NO_MESSAGE_TEXT
,"NETENABL IMMEDNET requires EMPTYNRM YES"
#endif
);
const MessageType0 ParserMessages::nonSgmlCharRef(
MessageType::warning,
&libModule,
410
#ifndef SP_NO_MESSAGE_TEXT
,"reference to non-SGML character"
#endif
);
const MessageType0 ParserMessages::defaultEntityDecl(
MessageType::warning,
&libModule,
411
#ifndef SP_NO_MESSAGE_TEXT
,"declaration of default entity"
#endif
);
const MessageType0 ParserMessages::internalSubsetPsParamEntityRef(
MessageType::warning,
&libModule,
412
#ifndef SP_NO_MESSAGE_TEXT
,"reference to parameter entity in parameter separator in internal subset"
#endif
);
const MessageType0 ParserMessages::internalSubsetTsParamEntityRef(
MessageType::warning,
&libModule,
413
#ifndef SP_NO_MESSAGE_TEXT
,"reference to parameter entity in token separator in internal subset"
#endif
);
const MessageType0 ParserMessages::internalSubsetLiteralParamEntityRef(
MessageType::warning,
&libModule,
414
#ifndef SP_NO_MESSAGE_TEXT
,"reference to parameter entity in parameter literal in internal subset"
#endif
);
const MessageType0 ParserMessages::cannotGenerateSystemIdSgml(
MessageType::error,
&libModule,
415
#ifndef SP_NO_MESSAGE_TEXT
,"cannot generate system identifier for SGML declaration reference"
#endif
);
const MessageType1 ParserMessages::sdTextClass(
MessageType::error,
&libModule,
416
#ifndef SP_NO_MESSAGE_TEXT
,"public text class of formal public identifier of SGML declaration must be SD"
#endif
);
const MessageType0 ParserMessages::sgmlDeclRefRequiresWww(
MessageType::error,
&libModule,
417
#ifndef SP_NO_MESSAGE_TEXT
,"SGML declaration reference was used but minimum literal was not \"ISO 8879:1986 (WWW)\""
#endif
);
const MessageType0 ParserMessages::pcdataGroupMemberOccurrenceIndicator(
MessageType::warning,
&libModule,
418
#ifndef SP_NO_MESSAGE_TEXT
,"member of model group containing #PCDATA has occurrence indicator"
#endif
);
const MessageType0 ParserMessages::pcdataGroupMemberModelGroup(
MessageType::warning,
&libModule,
419
#ifndef SP_NO_MESSAGE_TEXT
,"member of model group containing #PCDATA is a model group"
#endif
);
const MessageType0 ParserMessages::entityRefNone(
MessageType::error,
&libModule,
420
#ifndef SP_NO_MESSAGE_TEXT
,"reference to non-predefined entity"
#endif
);
const MessageType0 ParserMessages::entityRefInternal(
MessageType::error,
&libModule,
421
#ifndef SP_NO_MESSAGE_TEXT
,"reference to external entity"
#endif
);
const MessageType0 ParserMessages::implydefEntityDefault(
MessageType::error,
&libModule,
422
#ifndef SP_NO_MESSAGE_TEXT
,"declaration of default entity conflicts with IMPLYDEF ENTITY YES"
#endif
);
const MessageType0 ParserMessages::sorryActiveDoctypes(
MessageType::error,
&libModule,
423
#ifndef SP_NO_MESSAGE_TEXT
,"parsing with respect to more than one active doctype not supported"
#endif
);
const MessageType0 ParserMessages::activeDocLink(
MessageType::error,
&libModule,
424
#ifndef SP_NO_MESSAGE_TEXT
,"cannot have active doctypes and link types at the same time"
,"ISO 8879:1986 7.1"
#endif
);
const MessageType1 ParserMessages::concurrentInstances(
MessageType::error,
&libModule,
425
#ifndef SP_NO_MESSAGE_TEXT
,"number of concurrent document instances exceeds quantity specified for CONCUR parameter in SGML declaration (%1)"
,"ISO 8879:1986 7.2.1"
#endif
);
const MessageType0 ParserMessages::datatagBaseDtd(
MessageType::error,
&libModule,
426
#ifndef SP_NO_MESSAGE_TEXT
,"datatag group can only be specified in base document type"
,"ISO 8879:1986 11.2.4.4"
#endif
);
const MessageType0 ParserMessages::emptyStartTagBaseDtd(
MessageType::error,
&libModule,
427
#ifndef SP_NO_MESSAGE_TEXT
,"element not in the base document type can't have an empty start-tag"
,"ISO 8879:1986 7.4.1.1"
#endif
);
const MessageType0 ParserMessages::emptyEndTagBaseDtd(
MessageType::error,
&libModule,
428
#ifndef SP_NO_MESSAGE_TEXT
,"element not in base document type can't have an empty end-tag"
,"ISO 8879:1986 7.5.1.1"
#endif
);
const MessageType0 ParserMessages::immediateRecursion(
MessageType::warning,
&libModule,
429
#ifndef SP_NO_MESSAGE_TEXT
,"immediately recursive element"
#endif
);
const MessageType1 ParserMessages::urnMissingField(
MessageType::error,
&libModule,
430
#ifndef SP_NO_MESSAGE_TEXT
,"invalid URN %1: missing \":\""
#endif
);
const MessageType1 ParserMessages::urnMissingPrefix(
MessageType::error,
&libModule,
431
#ifndef SP_NO_MESSAGE_TEXT
,"invalid URN %1: missing \"urn:\" prefix"
#endif
);
const MessageType1 ParserMessages::urnInvalidNid(
MessageType::error,
&libModule,
432
#ifndef SP_NO_MESSAGE_TEXT
,"invalid URN %1: invalid namespace identifier"
#endif
);
const MessageType1 ParserMessages::urnInvalidNss(
MessageType::error,
&libModule,
433
#ifndef SP_NO_MESSAGE_TEXT
,"invalid URN %1: invalid namespace specific string"
#endif
);
const MessageType1 ParserMessages::urnExtraField(
MessageType::error,
&libModule,
434
#ifndef SP_NO_MESSAGE_TEXT
,"invalid URN %1: extra field"
#endif
);
const MessageType0 ParserMessages::omittedProlog(
MessageType::error,
&libModule,
435
#ifndef SP_NO_MESSAGE_TEXT
,"prolog can't be omitted unless CONCUR NO and LINK EXPLICIT NO and either IMPLYDEF ELEMENT YES or IMPLYDEF DOCTYPE YES"
#endif
);
const MessageType0 ParserMessages::impliedDocumentElement(
MessageType::error,
&libModule,
436
#ifndef SP_NO_MESSAGE_TEXT
,"can't determine name of #IMPLIED document element"
#endif
);
const MessageType0 ParserMessages::impliedDoctypeConcurLink(
MessageType::error,
&libModule,
437
#ifndef SP_NO_MESSAGE_TEXT
,"can't use #IMPLICIT doctype unless CONCUR NO and LINK EXPLICIT NO"
#endif
);
const MessageType0 ParserMessages::sorryImpliedDoctype(
MessageType::error,
&libModule,
438
#ifndef SP_NO_MESSAGE_TEXT
,"Sorry, #IMPLIED doctypes not implemented"
#endif
);
const MessageType0 ParserMessages::dtdDataEntityReference(
MessageType::warning,
&libModule,
439
#ifndef SP_NO_MESSAGE_TEXT
,"reference to DTD data entity ignored"
#endif
);
const MessageType2 ParserMessages::parameterEntityNotationUndefined(
MessageType::error,
&libModule,
440
#ifndef SP_NO_MESSAGE_TEXT
,"notation %1 for parameter entity %2 undefined"
#endif
);
const MessageType1 ParserMessages::dsEntityNotationUndefined(
MessageType::error,
&libModule,
441
#ifndef SP_NO_MESSAGE_TEXT
,"notation %1 for external subset undefined"
#endif
);
const MessageType1 ParserMessages::specifiedAttributeRedeclared(
MessageType::error,
&libModule,
442
#ifndef SP_NO_MESSAGE_TEXT
,"attribute %1 can't be redeclared"
,"ISO 8879:1986 K4.4"
#endif
);
const MessageType1 ParserMessages::notationMustNotBeDeclared(
MessageType::error,
&libModule,
443
#ifndef SP_NO_MESSAGE_TEXT
,"#IMPLICIT attributes have already been specified for notation %1"
#endif
);
const MessageType0 ParserMessages::peroGrpoStartTag(
MessageType::error,
&libModule,
444
#ifndef SP_NO_MESSAGE_TEXT
,"a name group is not allowed in a parameter entity reference in a start tag"
,"ISO 8879:1986 9.4.4p3"
#endif
);
const MessageType0 ParserMessages::peroGrpoEndTag(
MessageType::warning,
&libModule,
445
#ifndef SP_NO_MESSAGE_TEXT
,"name group in a parameter entity reference in an end tag (SGML forbids them in start tags)"
,"ISO 8879:1986 9.4.4p3"
#endif
);
const MessageType0 ParserMessages::notationConref(
MessageType::warning,
&libModule,
446
#ifndef SP_NO_MESSAGE_TEXT
,"if the declared value is NOTATION a default value of CONREF is useless"
#endif
);
const MessageType0 ParserMessages::sorryAllImplicit(
MessageType::error,
&libModule,
447
#ifndef SP_NO_MESSAGE_TEXT
,"Sorry, #ALL and #IMPLICIT content tokens not implemented"
#endif
);
const MessageFragment ParserMessages::delimStart(
&libModule,
1000
#ifndef SP_NO_MESSAGE_TEXT
,"delimiter "
#endif
);
const MessageFragment ParserMessages::digit(
&libModule,
1002
#ifndef SP_NO_MESSAGE_TEXT
,"digit"
#endif
);
const MessageFragment ParserMessages::nameStartCharacter(
&libModule,
1003
#ifndef SP_NO_MESSAGE_TEXT
,"name start character"
#endif
);
const MessageFragment ParserMessages::sepchar(
&libModule,
1004
#ifndef SP_NO_MESSAGE_TEXT
,"sepchar"
#endif
);
const MessageFragment ParserMessages::separator(
&libModule,
1005
#ifndef SP_NO_MESSAGE_TEXT
,"separator"
#endif
);
const MessageFragment ParserMessages::nameCharacter(
&libModule,
1006
#ifndef SP_NO_MESSAGE_TEXT
,"name character"
#endif
);
const MessageFragment ParserMessages::dataCharacter(
&libModule,
1007
#ifndef SP_NO_MESSAGE_TEXT
,"data character"
#endif
);
const MessageFragment ParserMessages::minimumDataCharacter(
&libModule,
1008
#ifndef SP_NO_MESSAGE_TEXT
,"minimum data character"
#endif
);
const MessageFragment ParserMessages::significantCharacter(
&libModule,
1009
#ifndef SP_NO_MESSAGE_TEXT
,"significant character"
#endif
);
const MessageFragment ParserMessages::recordEnd(
&libModule,
1010
#ifndef SP_NO_MESSAGE_TEXT
,"record end character"
#endif
);
const MessageFragment ParserMessages::recordStart(
&libModule,
1011
#ifndef SP_NO_MESSAGE_TEXT
,"record start character"
#endif
);
const MessageFragment ParserMessages::space(
&libModule,
1012
#ifndef SP_NO_MESSAGE_TEXT
,"space character"
#endif
);
const MessageFragment ParserMessages::listSep(
&libModule,
1013
#ifndef SP_NO_MESSAGE_TEXT
,", "
#endif
);
const MessageFragment ParserMessages::rangeSep(
&libModule,
1014
#ifndef SP_NO_MESSAGE_TEXT
,"-"
#endif
);
const MessageFragment ParserMessages::parameterLiteral(
&libModule,
1015
#ifndef SP_NO_MESSAGE_TEXT
,"parameter literal"
#endif
);
const MessageFragment ParserMessages::dataTagGroup(
&libModule,
1016
#ifndef SP_NO_MESSAGE_TEXT
,"data tag group"
#endif
);
const MessageFragment ParserMessages::modelGroup(
&libModule,
1017
#ifndef SP_NO_MESSAGE_TEXT
,"model group"
#endif
);
const MessageFragment ParserMessages::dataTagTemplateGroup(
&libModule,
1018
#ifndef SP_NO_MESSAGE_TEXT
,"data tag template group"
#endif
);
const MessageFragment ParserMessages::name(
&libModule,
1019
#ifndef SP_NO_MESSAGE_TEXT
,"name"
#endif
);
const MessageFragment ParserMessages::nameToken(
&libModule,
1020
#ifndef SP_NO_MESSAGE_TEXT
,"name token"
#endif
);
const MessageFragment ParserMessages::elementToken(
&libModule,
1021
#ifndef SP_NO_MESSAGE_TEXT
,"element token"
#endif
);
const MessageFragment ParserMessages::inclusions(
&libModule,
1022
#ifndef SP_NO_MESSAGE_TEXT
,"inclusions"
#endif
);
const MessageFragment ParserMessages::exclusions(
&libModule,
1023
#ifndef SP_NO_MESSAGE_TEXT
,"exclusions"
#endif
);
const MessageFragment ParserMessages::minimumLiteral(
&libModule,
1024
#ifndef SP_NO_MESSAGE_TEXT
,"minimum literal"
#endif
);
const MessageFragment ParserMessages::attributeValueLiteral(
&libModule,
1025
#ifndef SP_NO_MESSAGE_TEXT
,"attribute value literal"
#endif
);
const MessageFragment ParserMessages::systemIdentifier(
&libModule,
1026
#ifndef SP_NO_MESSAGE_TEXT
,"system identifier"
#endif
);
const MessageFragment ParserMessages::number(
&libModule,
1027
#ifndef SP_NO_MESSAGE_TEXT
,"number"
#endif
);
const MessageFragment ParserMessages::attributeValue(
&libModule,
1028
#ifndef SP_NO_MESSAGE_TEXT
,"attribute value"
#endif
);
const MessageFragment ParserMessages::capacityName(
&libModule,
1029
#ifndef SP_NO_MESSAGE_TEXT
,"name of capacity"
#endif
);
const MessageFragment ParserMessages::generalDelimiteRoleName(
&libModule,
1030
#ifndef SP_NO_MESSAGE_TEXT
,"name of general delimiter role"
#endif
);
const MessageFragment ParserMessages::referenceReservedName(
&libModule,
1031
#ifndef SP_NO_MESSAGE_TEXT
,"reference reserved name"
#endif
);
const MessageFragment ParserMessages::quantityName(
&libModule,
1032
#ifndef SP_NO_MESSAGE_TEXT
,"name of quantity"
#endif
);
const MessageFragment ParserMessages::entityEnd(
&libModule,
1033
#ifndef SP_NO_MESSAGE_TEXT
,"entity end"
#endif
);
const MessageFragment ParserMessages::shortrefDelim(
&libModule,
1034
#ifndef SP_NO_MESSAGE_TEXT
,"short reference delimiter"
#endif
);
#ifdef SP_NAMESPACE
}
#endif
