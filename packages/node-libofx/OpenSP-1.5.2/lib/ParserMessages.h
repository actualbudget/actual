// This file was automatically generated from ParserMessages.msg by msggen.pl.
#ifndef ParserMessages_INCLUDED
#define ParserMessages_INCLUDED 1

#ifdef __GNUG__
#pragma interface
#endif
#include "Message.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

struct ParserMessages {
  // 0
  static const MessageType1 nameLength;
  // 1
  static const MessageType1 parameterEntityNameLength;
  // 2
  static const MessageType1 numberLength;
  // 3
  static const MessageType1 attributeValueLength;
  // 4
  static const MessageType0 peroGrpoProlog;
  // 5
  static const MessageType0 groupLevel;
  // 6
  static const MessageType2 groupCharacter;
  // 7
  static const MessageType0 psRequired;
  // 8
  static const MessageType2 markupDeclarationCharacter;
  // 9
  static const MessageType0 declarationLevel;
  // 10
  static const MessageType0 groupEntityEnd;
  // 11
  static const MessageType1 invalidToken;
  // 12
  static const MessageType0 groupEntityReference;
  // 13
  static const MessageType1 duplicateGroupToken;
  // 14
  static const MessageType1 groupCount;
  // 15
  static const MessageType0 literalLevel;
  // 16
  static const MessageType1 literalMinimumData;
  // 18
  static const MessageType0 dataTagPatternNonSgml;
  // 19
  static const MessageType0 dataTagPatternFunction;
  // 20
  static const MessageType0 eroGrpoStartTag;
  // 21
  static const MessageType0 eroGrpoProlog;
  // 22
  static const MessageType1 functionName;
  // 23
  static const MessageType1 characterNumber;
  // 24
  static const MessageType1 parameterEntityUndefined;
  // 25
  static const MessageType1 entityUndefined;
  // 26
  static const MessageType0 rniNameStart;
  // 28
  static const MessageType0L commentEntityEnd;
  // 30
  static const MessageType0 mixedConnectors;
  // 31
  static const MessageType1 noSuchReservedName;
  // 32
  static const MessageType1 invalidReservedName;
  // 33
  static const MessageType1 minimumLiteralLength;
  // 34
  static const MessageType1 tokenizedAttributeValueLength;
  // 35
  static const MessageType1 systemIdentifierLength;
  // 36
  static const MessageType1 parameterLiteralLength;
  // 37
  static const MessageType1 dataTagPatternLiteralLength;
  // 38
  static const MessageType0 literalClosingDelimiter;
  // 39
  static const MessageType2 paramInvalidToken;
  // 40
  static const MessageType2 groupTokenInvalidToken;
  // 41
  static const MessageType2 connectorInvalidToken;
  // 42
  static const MessageType1 noSuchDeclarationType;
  // 43
  static const MessageType1 dtdSubsetDeclaration;
  // 44
  static const MessageType1 declSubsetCharacter;
  // 45
  static const MessageType0 documentEndDtdSubset;
  // 46
  static const MessageType1 prologCharacter;
  // 47
  static const MessageType0 documentEndProlog;
  // 48
  static const MessageType1 prologDeclaration;
  // 49
  static const MessageType1 rankStemGenericIdentifier;
  // 50
  static const MessageType0 missingTagMinimization;
  // 51
  static const MessageType1 duplicateElementDefinition;
  // 52
  static const MessageType0 entityApplicableDtd;
  // 53
  static const MessageType1L commentDeclInvalidToken;
  // 55
  static const MessageType1 instanceDeclaration;
  // 56
  static const MessageType0 contentNonSgml;
  // 57
  static const MessageType1 noCurrentRank;
  // 58
  static const MessageType1 duplicateAttlistNotation;
  // 59
  static const MessageType1 duplicateAttlistElement;
  // 60
  static const MessageType0 endTagEntityEnd;
  // 61
  static const MessageType1 endTagCharacter;
  // 62
  static const MessageType1 endTagInvalidToken;
  // 63
  static const MessageType0 pcdataNotAllowed;
  // 64
  static const MessageType1 elementNotAllowed;
  // 65
  static const MessageType2 missingElementMultiple;
  // 66
  static const MessageType2 missingElementInferred;
  // 67
  static const MessageType1 startTagEmptyElement;
  // 68
  static const MessageType1L omitEndTagDeclare;
  // 70
  static const MessageType1L omitEndTagOmittag;
  // 72
  static const MessageType1 omitStartTagDeclaredContent;
  // 73
  static const MessageType1 elementEndTagNotFinished;
  // 74
  static const MessageType1 omitStartTagDeclare;
  // 75
  static const MessageType1 taglvlOpenElements;
  // 76
  static const MessageType1 undefinedElement;
  // 77
  static const MessageType0 emptyEndTagNoOpenElements;
  // 78
  static const MessageType1 elementNotFinished;
  // 79
  static const MessageType1 elementNotOpen;
  // 80
  static const MessageType1 internalParameterDataEntity;
  // 81
  static const MessageType1 attributeSpecCharacter;
  // 82
  static const MessageType0 unquotedAttributeValue;
  // 83
  static const MessageType0 attributeSpecEntityEnd;
  // 84
  static const MessageType1 externalParameterDataSubdocEntity;
  // 85
  static const MessageType1 duplicateEntityDeclaration;
  // 86
  static const MessageType1 duplicateParameterEntityDeclaration;
  // 87
  static const MessageType0 piEntityReference;
  // 88
  static const MessageType0 internalDataEntityReference;
  // 89
  static const MessageType0 externalNonTextEntityReference;
  // 90
  static const MessageType0 externalNonTextEntityRcdata;
  // 91
  static const MessageType1 entlvl;
  // 92
  static const MessageType0 piEntityRcdata;
  // 93
  static const MessageType1 recursiveEntityReference;
  // 94
  static const MessageType1 undefinedShortrefMapInstance;
  // 95
  static const MessageType0 usemapAssociatedElementTypeDtd;
  // 96
  static const MessageType0 usemapAssociatedElementTypeInstance;
  // 97
  static const MessageType2 undefinedShortrefMapDtd;
  // 98
  static const MessageType1 unknownShortrefDelim;
  // 99
  static const MessageType1 delimDuplicateMap;
  // 100
  static const MessageType0 noDocumentElement;
  // 102
  static const MessageType0 processingInstructionEntityEnd;
  // 103
  static const MessageType1 processingInstructionLength;
  // 104
  static const MessageType0 processingInstructionClose;
  // 105
  static const MessageType0 attributeSpecNameTokenExpected;
  // 106
  static const MessageType1 noSuchAttributeToken;
  // 107
  static const MessageType0 attributeNameShorttag;
  // 108
  static const MessageType1 noSuchAttribute;
  // 109
  static const MessageType0 attributeValueExpected;
  // 110
  static const MessageType1 nameTokenLength;
  // 111
  static const MessageType0 attributeSpecLiteral;
  // 112
  static const MessageType1 duplicateAttributeSpec;
  // 113
  static const MessageType1 duplicateAttributeDef;
  // 114
  static const MessageType0 emptyDataAttributeSpec;
  // 115
  static const MessageType0 markedSectionEnd;
  // 116
  static const MessageType1 markedSectionLevel;
  // 117
  static const MessageType0L unclosedMarkedSection;
  // 119
  static const MessageType0 specialParseEntityEnd;
  // 120
  static const MessageType2 normalizedAttributeValueLength;
  // 121
  static const MessageType0 attributeValueSyntax;
  // 122
  static const MessageType2 attributeValueChar;
  // 123
  static const MessageType1 attributeValueMultiple;
  // 124
  static const MessageType2 attributeValueNumberToken;
  // 125
  static const MessageType2 attributeValueName;
  // 126
  static const MessageType1 attributeMissing;
  // 127
  static const MessageType1 requiredAttributeMissing;
  // 128
  static const MessageType1 currentAttributeMissing;
  // 129
  static const MessageType1 invalidNotationAttribute;
  // 130
  static const MessageType1 invalidEntityAttribute;
  // 131
  static const MessageType3 attributeValueNotInGroup;
  // 132
  static const MessageType1 notDataOrSubdocEntity;
  // 133
  static const MessageType3 ambiguousModelInitial;
  // 134
  static const MessageType5 ambiguousModel;
  // 135
  static const MessageType5 ambiguousModelSingleAnd;
  // 136
  static const MessageType6 ambiguousModelMultipleAnd;
  // 137
  static const MessageType1L commentDeclarationCharacter;
  // 139
  static const MessageType1 nonSgmlCharacter;
  // 140
  static const MessageType0 dataMarkedSectionDeclSubset;
  // 141
  static const MessageType1L duplicateId;
  // 143
  static const MessageType1 notFixedValue;
  // 144
  static const MessageType1 sdCommentSignificant;
  // 145
  static const MessageType1 standardVersion;
  // 146
  static const MessageType1 namingBeforeLcnmstrt;
  // 147
  static const MessageType1 sdEntityEnd;
  // 148
  static const MessageType2 sdInvalidNameToken;
  // 149
  static const MessageType1 numberTooBig;
  // 150
  static const MessageType1 sdLiteralSignificant;
  // 151
  static const MessageType1 syntaxCharacterNumber;
  // 152
  static const MessageType0 sdParameterEntity;
  // 153
  static const MessageType2 sdParamInvalidToken;
  // 154
  static const MessageType0 giveUp;
  // 155
  static const MessageType1 sdMissingCharacters;
  // 156
  static const MessageType1 missingMinimumChars;
  // 157
  static const MessageType1 duplicateCharNumbers;
  // 158
  static const MessageType1 codeSetHoles;
  // 159
  static const MessageType1 basesetCharsMissing;
  // 160
  static const MessageType1 documentCharMax;
  // 161
  static const MessageType1 fpiMissingField;
  // 162
  static const MessageType1 fpiMissingTextClassSpace;
  // 163
  static const MessageType1 fpiInvalidTextClass;
  // 164
  static const MessageType1 fpiInvalidLanguage;
  // 165
  static const MessageType1 fpiIllegalDisplayVersion;
  // 166
  static const MessageType1 fpiExtraField;
  // 167
  static const MessageType0 notationIdentifierTextClass;
  // 168
  static const MessageType1 unknownBaseset;
  // 169
  static const MessageType2 lexicalAmbiguity;
  // 170
  static const MessageType1 missingSignificant;
  // 171
  static const MessageType1 translateSyntaxCharDoc;
  // 172
  static const MessageType1 translateSyntaxCharInternal;
  // 173
  static const MessageType1 missingSyntaxChar;
  // 174
  static const MessageType1 unknownCapacitySet;
  // 175
  static const MessageType1 duplicateCapacity;
  // 176
  static const MessageType1 capacityExceedsTotalcap;
  // 177
  static const MessageType1 unknownPublicSyntax;
  // 178
  static const MessageType0 nmstrtLength;
  // 179
  static const MessageType0 nmcharLength;
  // 180
  static const MessageType1 subdocLevel;
  // 181
  static const MessageType1 subdocEntity;
  // 182
  static const MessageType0 parameterEntityNotEnded;
  // 183
  static const MessageType1 missingId;
  // 184
  static const MessageType1 dtdUndefinedElement;
  // 185
  static const MessageType1 elementNotFinishedDocumentEnd;
  // 186
  static const MessageType0 subdocGiveUp;
  // 187
  static const MessageType0 noDtd;
  // 188
  static const MessageType0 noDtdSubset;
  // 189
  static const MessageType0 notSgml;
  // 190
  static const MessageType1 taglen;
  // 191
  static const MessageType0 groupParameterEntityNotEnded;
  // 192
  static const MessageType1 invalidSgmlChar;
  // 193
  static const MessageType1 translateDocChar;
  // 194
  static const MessageType1 attributeValueLengthNeg;
  // 195
  static const MessageType1 tokenizedAttributeValueLengthNeg;
  // 196
  static const MessageType1 scopeInstanceQuantity;
  // 197
  static const MessageType1 basesetTextClass;
  // 198
  static const MessageType1 capacityTextClass;
  // 199
  static const MessageType1 syntaxTextClass;
  // 200
  static const MessageType0 msocharRequiresMsichar;
  // 201
  static const MessageType1 switchNotMarkup;
  // 202
  static const MessageType1 switchNotInCharset;
  // 203
  static const MessageType1 ambiguousDocCharacter;
  // 204
  static const MessageType1 oneFunction;
  // 205
  static const MessageType1 duplicateFunctionName;
  // 206
  static const MessageType1 missingSignificant646;
  // 207
  static const MessageType1 generalDelimAllFunction;
  // 208
  static const MessageType1 nmcharLetter;
  // 209
  static const MessageType1 nmcharDigit;
  // 210
  static const MessageType1 nmcharRe;
  // 211
  static const MessageType1 nmcharRs;
  // 212
  static const MessageType1 nmcharSpace;
  // 213
  static const MessageType1 nmcharSepchar;
  // 214
  static const MessageType1 switchLetterDigit;
  // 215
  static const MessageType0 zeroNumberOfCharacters;
  // 216
  static const MessageType1 nameReferenceReservedName;
  // 217
  static const MessageType1 ambiguousReservedName;
  // 218
  static const MessageType1 duplicateReservedName;
  // 219
  static const MessageType1 reservedNameSyntax;
  // 220
  static const MessageType1 multipleBSequence;
  // 221
  static const MessageType1 blankAdjacentBSequence;
  // 222
  static const MessageType2 delimiterLength;
  // 223
  static const MessageType2 reservedNameLength;
  // 224
  static const MessageType1 nmcharNmstrt;
  // 225
  static const MessageType0 scopeInstanceSyntaxCharset;
  // 226
  static const MessageType0 emptyOmitEndTag;
  // 227
  static const MessageType1 conrefOmitEndTag;
  // 228
  static const MessageType1 conrefEmpty;
  // 229
  static const MessageType1 notationEmpty;
  // 230
  static const MessageType0 dataAttributeDeclaredValue;
  // 231
  static const MessageType0 dataAttributeDefaultValue;
  // 232
  static const MessageType2 attcnt;
  // 233
  static const MessageType0 idDeclaredValue;
  // 234
  static const MessageType1 multipleIdAttributes;
  // 235
  static const MessageType1 multipleNotationAttributes;
  // 236
  static const MessageType1 duplicateAttributeToken;
  // 237
  static const MessageType1 notationNoAttributes;
  // 238
  static const MessageType2 entityNotationUndefined;
  // 239
  static const MessageType2 mapEntityUndefined;
  // 240
  static const MessageType1 attlistNotationUndefined;
  // 241
  static const MessageType1 bracketedLitlen;
  // 242
  static const MessageType1 genericIdentifierLength;
  // 243
  static const MessageType0 instanceStartOmittag;
  // 244
  static const MessageType1 grplvl;
  // 245
  static const MessageType1 grpgtcnt;
  // 246
  static const MessageType0 unclosedStartTagShorttag;
  // 247
  static const MessageType0 netEnablingStartTagShorttag;
  // 248
  static const MessageType0 unclosedEndTagShorttag;
  // 249
  static const MessageType0 multipleDtds;
  // 250
  static const MessageType0 afterDocumentElementEntityEnd;
  // 251
  static const MessageType1 declarationAfterDocumentElement;
  // 252
  static const MessageType0 characterReferenceAfterDocumentElement;
  // 253
  static const MessageType0 entityReferenceAfterDocumentElement;
  // 254
  static const MessageType0 markedSectionAfterDocumentElement;
  // 255
  static const MessageType3 requiredElementExcluded;
  // 256
  static const MessageType3 invalidExclusion;
  // 257
  static const MessageType0 attributeValueShorttag;
  // 258
  static const MessageType0 conrefNotation;
  // 259
  static const MessageType1 duplicateNotationDeclaration;
  // 260
  static const MessageType1L duplicateShortrefDeclaration;
  // 262
  static const MessageType1 duplicateDelimGeneral;
  // 263
  static const MessageType1 idrefGrpcnt;
  // 264
  static const MessageType1 entityNameGrpcnt;
  // 265
  static const MessageType2 attsplen;
  // 266
  static const MessageType1 duplicateDelimShortref;
  // 267
  static const MessageType1 duplicateDelimShortrefSet;
  // 268
  static const MessageType1 defaultEntityInAttribute;
  // 269
  static const MessageType1 defaultEntityReference;
  // 270
  static const MessageType2 mapDefaultEntity;
  // 271
  static const MessageType1 noSuchDtd;
  // 272
  static const MessageType1 noLpdSubset;
  // 273
  static const MessageType0 assocElementDifferentAtts;
  // 274
  static const MessageType1 duplicateLinkSet;
  // 275
  static const MessageType0 emptyResultAttributeSpec;
  // 276
  static const MessageType1 noSuchSourceElement;
  // 277
  static const MessageType1 noSuchResultElement;
  // 278
  static const MessageType0 documentEndLpdSubset;
  // 279
  static const MessageType1 lpdSubsetDeclaration;
  // 280
  static const MessageType0 idlinkDeclSimple;
  // 281
  static const MessageType0 linkDeclSimple;
  // 282
  static const MessageType1 simpleLinkAttlistElement;
  // 283
  static const MessageType0 shortrefOnlyInBaseDtd;
  // 284
  static const MessageType0 usemapOnlyInBaseDtd;
  // 285
  static const MessageType0 linkAttributeDefaultValue;
  // 286
  static const MessageType0 linkAttributeDeclaredValue;
  // 287
  static const MessageType0 simpleLinkFixedAttribute;
  // 288
  static const MessageType0 duplicateIdLinkSet;
  // 289
  static const MessageType1 noInitialLinkSet;
  // 290
  static const MessageType1 notationUndefinedSourceDtd;
  // 291
  static const MessageType0 simpleLinkResultNotImplied;
  // 292
  static const MessageType0 simpleLinkFeature;
  // 293
  static const MessageType0 implicitLinkFeature;
  // 294
  static const MessageType0 explicitLinkFeature;
  // 295
  static const MessageType0 lpdBeforeBaseDtd;
  // 296
  static const MessageType0 dtdAfterLpd;
  // 297
  static const MessageType1 unstableLpdGeneralEntity;
  // 298
  static const MessageType1 unstableLpdParameterEntity;
  // 299
  static const MessageType1 multipleIdLinkRuleAttribute;
  // 300
  static const MessageType1 multipleLinkRuleAttribute;
  // 301
  static const MessageType2 uselinkBadLinkSet;
  // 302
  static const MessageType1 uselinkSimpleLpd;
  // 303
  static const MessageType1 uselinkBadLinkType;
  // 304
  static const MessageType1 duplicateDtdLpd;
  // 305
  static const MessageType1 duplicateLpd;
  // 306
  static const MessageType1 duplicateDtd;
  // 307
  static const MessageType1 undefinedLinkSet;
  // 308
  static const MessageType1 duplicateImpliedResult;
  // 309
  static const MessageType1 simpleLinkCount;
  // 310
  static const MessageType0 duplicateExplicitChain;
  // 311
  static const MessageType1 explicit1RequiresSourceTypeBase;
  // 312
  static const MessageType0 oneImplicitLink;
  // 313
  static const MessageType1 sorryLink;
  // 314
  static const MessageType0 entityReferenceMissingName;
  // 315
  static const MessageType1 explicitNoRequiresSourceTypeBase;
  // 316
  static const MessageType0 linkActivateTooLate;
  // 317
  static const MessageType0 pass2Ee;
  // 318
  static const MessageType2 idlinkElementType;
  // 319
  static const MessageType0 datatagNotImplemented;
  // 320
  static const MessageType0 startTagMissingName;
  // 321
  static const MessageType0 endTagMissingName;
  // 322
  static const MessageType0 startTagGroupNet;
  // 323
  static const MessageType0 documentElementUndefined;
  // 324
  static const MessageType0 badDefaultSgmlDecl;
  // 325
  static const MessageType1L nonExistentEntityRef;
  // 327
  static const MessageType0 pcdataUnreachable;
  // 328
  static const MessageType0 sdRangeNotSingleChar;
  // 329
  static const MessageType0 sdInvalidRange;
  // 330
  static const MessageType0 sdEmptyDelimiter;
  // 331
  static const MessageType0 tooManyCharsMinimumLiteral;
  // 332
  static const MessageType1 defaultedEntityDefined;
  // 333
  static const MessageType0 emptyStartTag;
  // 334
  static const MessageType0 emptyEndTag;
  // 335
  static const MessageType1 unusedMap;
  // 336
  static const MessageType1 unusedParamEntity;
  // 337
  static const MessageType1 cannotGenerateSystemIdPublic;
  // 338
  static const MessageType1 cannotGenerateSystemIdGeneral;
  // 339
  static const MessageType1 cannotGenerateSystemIdParameter;
  // 340
  static const MessageType1 cannotGenerateSystemIdDoctype;
  // 341
  static const MessageType1 cannotGenerateSystemIdLinktype;
  // 342
  static const MessageType1 cannotGenerateSystemIdNotation;
  // 343
  static const MessageType1 excludeIncludeSame;
  // 344
  static const MessageType1 implyingDtd;
  // 345
  static const MessageType1 afdrVersion;
  // 346
  static const MessageType0 missingAfdrDecl;
  // 347
  static const MessageType0 enrRequired;
  // 348
  static const MessageType1 numericCharRefLiteralNonSgml;
  // 349
  static const MessageType2 numericCharRefUnknownDesc;
  // 350
  static const MessageType3 numericCharRefUnknownBase;
  // 351
  static const MessageType1 numericCharRefBadInternal;
  // 352
  static const MessageType1 numericCharRefNoInternal;
  // 353
  static const MessageType0 wwwRequired;
  // 354
  static const MessageType1 attributeTokenNotUnique;
  // 355
  static const MessageType1 hexNumberLength;
  // 356
  static const MessageType1 entityNameSyntax;
  // 357
  static const MessageType0 cdataContent;
  // 358
  static const MessageType0 rcdataContent;
  // 359
  static const MessageType0 inclusion;
  // 360
  static const MessageType0 exclusion;
  // 361
  static const MessageType0 numberDeclaredValue;
  // 362
  static const MessageType0 nameDeclaredValue;
  // 363
  static const MessageType0 nutokenDeclaredValue;
  // 364
  static const MessageType0 conrefAttribute;
  // 365
  static const MessageType0 currentAttribute;
  // 366
  static const MessageType0 tempMarkedSection;
  // 367
  static const MessageType0 instanceIncludeMarkedSection;
  // 368
  static const MessageType0 instanceIgnoreMarkedSection;
  // 369
  static const MessageType0 rcdataMarkedSection;
  // 370
  static const MessageType0 piEntity;
  // 371
  static const MessageType0 bracketEntity;
  // 372
  static const MessageType0 internalCdataEntity;
  // 373
  static const MessageType0 internalSdataEntity;
  // 374
  static const MessageType0 externalCdataEntity;
  // 375
  static const MessageType0 externalSdataEntity;
  // 376
  static const MessageType0 dataAttributes;
  // 377
  static const MessageType0 rank;
  // 378
  static const MessageType0 missingSystemId;
  // 379
  static const MessageType0 psComment;
  // 380
  static const MessageType0 namedCharRef;
  // 381
  static const MessageType0 andGroup;
  // 382
  static const MessageType0 attributeValueNotLiteral;
  // 383
  static const MessageType0 missingAttributeName;
  // 384
  static const MessageType0 elementGroupDecl;
  // 385
  static const MessageType0 attlistGroupDecl;
  // 386
  static const MessageType0 emptyCommentDecl;
  // 387
  static const MessageType0 commentDeclS;
  // 388
  static const MessageType0 commentDeclMultiple;
  // 389
  static const MessageType0 missingStatusKeyword;
  // 390
  static const MessageType0 multipleStatusKeyword;
  // 391
  static const MessageType0 instanceParamEntityRef;
  // 392
  static const MessageType0 current;
  // 393
  static const MessageType0 minimizationParam;
  // 394
  static const MessageType0 refc;
  // 395
  static const MessageType0 pcdataNotFirstInGroup;
  // 396
  static const MessageType0 pcdataInSeqGroup;
  // 397
  static const MessageType0 pcdataInNestedModelGroup;
  // 398
  static const MessageType0 pcdataGroupNotRep;
  // 399
  static const MessageType0 nameGroupNotOr;
  // 400
  static const MessageType0 piMissingName;
  // 401
  static const MessageType0 instanceStatusKeywordSpecS;
  // 402
  static const MessageType0 externalDataEntityRef;
  // 403
  static const MessageType0 attributeValueExternalEntityRef;
  // 404
  static const MessageType1 dataCharDelim;
  // 405
  static const MessageType0 explicitSgmlDecl;
  // 406
  static const MessageType0 internalSubsetMarkedSection;
  // 407
  static const MessageType0 nestcWithoutNet;
  // 408
  static const MessageType0 contentAsyncEntityRef;
  // 409
  static const MessageType0 immednetRequiresEmptynrm;
  // 410
  static const MessageType0 nonSgmlCharRef;
  // 411
  static const MessageType0 defaultEntityDecl;
  // 412
  static const MessageType0 internalSubsetPsParamEntityRef;
  // 413
  static const MessageType0 internalSubsetTsParamEntityRef;
  // 414
  static const MessageType0 internalSubsetLiteralParamEntityRef;
  // 415
  static const MessageType0 cannotGenerateSystemIdSgml;
  // 416
  static const MessageType1 sdTextClass;
  // 417
  static const MessageType0 sgmlDeclRefRequiresWww;
  // 418
  static const MessageType0 pcdataGroupMemberOccurrenceIndicator;
  // 419
  static const MessageType0 pcdataGroupMemberModelGroup;
  // 420
  static const MessageType0 entityRefNone;
  // 421
  static const MessageType0 entityRefInternal;
  // 422
  static const MessageType0 implydefEntityDefault;
  // 423
  static const MessageType0 sorryActiveDoctypes;
  // 424
  static const MessageType0 activeDocLink;
  // 425
  static const MessageType1 concurrentInstances;
  // 426
  static const MessageType0 datatagBaseDtd;
  // 427
  static const MessageType0 emptyStartTagBaseDtd;
  // 428
  static const MessageType0 emptyEndTagBaseDtd;
  // 429
  static const MessageType0 immediateRecursion;
  // 430
  static const MessageType1 urnMissingField;
  // 431
  static const MessageType1 urnMissingPrefix;
  // 432
  static const MessageType1 urnInvalidNid;
  // 433
  static const MessageType1 urnInvalidNss;
  // 434
  static const MessageType1 urnExtraField;
  // 435
  static const MessageType0 omittedProlog;
  // 436
  static const MessageType0 impliedDocumentElement;
  // 437
  static const MessageType0 impliedDoctypeConcurLink;
  // 438
  static const MessageType0 sorryImpliedDoctype;
  // 439
  static const MessageType0 dtdDataEntityReference;
  // 440
  static const MessageType2 parameterEntityNotationUndefined;
  // 441
  static const MessageType1 dsEntityNotationUndefined;
  // 442
  static const MessageType1 specifiedAttributeRedeclared;
  // 443
  static const MessageType1 notationMustNotBeDeclared;
  // 444
  static const MessageType0 peroGrpoStartTag;
  // 445
  static const MessageType0 peroGrpoEndTag;
  // 446
  static const MessageType0 notationConref;
  // 447
  static const MessageType0 sorryAllImplicit;
  // 1000
  static const MessageFragment delimStart;
  // 1002
  static const MessageFragment digit;
  // 1003
  static const MessageFragment nameStartCharacter;
  // 1004
  static const MessageFragment sepchar;
  // 1005
  static const MessageFragment separator;
  // 1006
  static const MessageFragment nameCharacter;
  // 1007
  static const MessageFragment dataCharacter;
  // 1008
  static const MessageFragment minimumDataCharacter;
  // 1009
  static const MessageFragment significantCharacter;
  // 1010
  static const MessageFragment recordEnd;
  // 1011
  static const MessageFragment recordStart;
  // 1012
  static const MessageFragment space;
  // 1013
  static const MessageFragment listSep;
  // 1014
  static const MessageFragment rangeSep;
  // 1015
  static const MessageFragment parameterLiteral;
  // 1016
  static const MessageFragment dataTagGroup;
  // 1017
  static const MessageFragment modelGroup;
  // 1018
  static const MessageFragment dataTagTemplateGroup;
  // 1019
  static const MessageFragment name;
  // 1020
  static const MessageFragment nameToken;
  // 1021
  static const MessageFragment elementToken;
  // 1022
  static const MessageFragment inclusions;
  // 1023
  static const MessageFragment exclusions;
  // 1024
  static const MessageFragment minimumLiteral;
  // 1025
  static const MessageFragment attributeValueLiteral;
  // 1026
  static const MessageFragment systemIdentifier;
  // 1027
  static const MessageFragment number;
  // 1028
  static const MessageFragment attributeValue;
  // 1029
  static const MessageFragment capacityName;
  // 1030
  static const MessageFragment generalDelimiteRoleName;
  // 1031
  static const MessageFragment referenceReservedName;
  // 1032
  static const MessageFragment quantityName;
  // 1033
  static const MessageFragment entityEnd;
  // 1034
  static const MessageFragment shortrefDelim;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not ParserMessages_INCLUDED */
