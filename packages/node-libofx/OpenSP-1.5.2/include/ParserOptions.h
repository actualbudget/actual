// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef ParserOptions_INCLUDED
#define ParserOptions_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "types.h"
#include "EventsWanted.h"
#include "Vector.h"
#include "StringC.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

struct Warnings {
  Warnings();
  PackedBoolean warnSgmlDecl;
  PackedBoolean warnDuplicateEntity;
  PackedBoolean warnShould;
  PackedBoolean warnUndefinedElement;
  PackedBoolean warnDefaultEntityReference;
  PackedBoolean warnMixedContent;
  PackedBoolean warnEmptyTag;
  PackedBoolean warnUnusedMap;
  PackedBoolean warnUnusedParam;
  PackedBoolean warnNotationSystemId;
  PackedBoolean warnInclusion;
  PackedBoolean warnExclusion;
  PackedBoolean warnRcdataContent;
  PackedBoolean warnCdataContent;
  PackedBoolean warnPsComment;
  PackedBoolean warnElementGroupDecl;
  PackedBoolean warnAttlistGroupDecl;
  PackedBoolean warnPiEntity;
  PackedBoolean warnInternalSdataEntity;
  PackedBoolean warnInternalCdataEntity;
  PackedBoolean warnExternalSdataEntity;
  PackedBoolean warnExternalCdataEntity;
  PackedBoolean warnBracketEntity;
  PackedBoolean warnDataAttributes;
  PackedBoolean warnMissingSystemId;
  PackedBoolean warnConref;
  PackedBoolean warnCurrent;
  PackedBoolean warnNutokenDeclaredValue;
  PackedBoolean warnNumberDeclaredValue;
  PackedBoolean warnNameDeclaredValue;
  PackedBoolean warnNamedCharRef;
  PackedBoolean warnRefc;
  PackedBoolean warnTempMarkedSection;
  PackedBoolean warnRcdataMarkedSection;
  PackedBoolean warnInstanceIncludeMarkedSection;
  PackedBoolean warnInstanceIgnoreMarkedSection;
  PackedBoolean warnAndGroup;
  PackedBoolean warnRank;
  PackedBoolean warnEmptyCommentDecl;
  PackedBoolean warnAttributeValueNotLiteral;
  PackedBoolean warnMissingAttributeName;
  PackedBoolean warnCommentDeclS;
  PackedBoolean warnCommentDeclMultiple;
  PackedBoolean warnMissingStatusKeyword;
  PackedBoolean warnMultipleStatusKeyword;
  PackedBoolean warnInstanceParamEntityRef;
  PackedBoolean warnMinimizationParam;
  PackedBoolean warnMixedContentRepOrGroup;
  PackedBoolean warnNameGroupNotOr;
  PackedBoolean warnPiMissingName;
  PackedBoolean warnInstanceStatusKeywordSpecS;
  PackedBoolean warnExternalDataEntityRef;
  PackedBoolean warnAttributeValueExternalEntityRef;
  PackedBoolean warnDataDelim;
  PackedBoolean warnExplicitSgmlDecl;
  PackedBoolean warnInternalSubsetMarkedSection;
  PackedBoolean warnDefaultEntityDecl;
  PackedBoolean warnNonSgmlCharRef;
  PackedBoolean warnInternalSubsetPsParamEntityRef;
  PackedBoolean warnInternalSubsetTsParamEntityRef;
  PackedBoolean warnInternalSubsetLiteralParamEntityRef;
  PackedBoolean warnImmediateRecursion;
};

struct SP_API ParserOptions : public Warnings {
  ParserOptions();
  EventsWanted eventsWanted;
  PackedBoolean datatag;
  PackedBoolean omittag;
  PackedBoolean rank;
  PackedBoolean shorttag;
  PackedBoolean emptynrm;
  Number linkSimple;
  PackedBoolean linkImplicit;
  Number linkExplicit;
  Number concur;
  Number subdoc;
  PackedBoolean formal;
  PackedBoolean shortref;
  enum { sgmlDeclTypeValid = -1 };
  short typeValid;
  enum Quantity {
    ATTCNT,
    ATTSPLEN,
    BSEQLEN,
    DTAGLEN,
    DTEMPLEN,
    ENTLVL,
    GRPCNT,
    GRPGTCNT,
    GRPLVL,
    LITLEN,
    NAMELEN,
    NORMSEP,
    PILEN,
    TAGLEN,
    TAGLVL
  };
  enum { nQuantity = TAGLVL + 1 };
  Number quantity[nQuantity];
  PackedBoolean errorIdref;
  PackedBoolean errorSignificant;
  PackedBoolean errorAfdr;	// error if AFDR extensions are used
  // These override what was specified in the SGML declaration.
  PackedBoolean noUnclosedTag;
  PackedBoolean noNet;
  PackedBoolean fullyDeclared;
  PackedBoolean fullyTagged;
  PackedBoolean amplyTagged;
  PackedBoolean amplyTaggedAnyother;
  PackedBoolean valid; 
  PackedBoolean entityRef;
  PackedBoolean externalEntityRef;
  PackedBoolean integral;
  Vector<StringC> includes;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not ParserOptions_INCLUDED */
