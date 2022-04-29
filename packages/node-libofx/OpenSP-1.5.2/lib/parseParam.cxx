// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#include "splib.h"
#include "Parser.h"
#include "Param.h"
#include "Group.h"
#include "Markup.h"
#include "ParserMessages.h"
#include "MessageArg.h"
#include "TokenMessageArg.h"
#include "token.h"
#include "macros.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

Boolean Parser::parseParam(const AllowedParams &allow,
			   unsigned declInputLevel,
			   Param &parm)
{
  for (;;) {
    Token token = getToken(allow.mainMode());
    switch (token) {
    case tokenUnrecognized:
      if (reportNonSgmlCharacter())
	break;
      {
	message(ParserMessages::markupDeclarationCharacter,
		StringMessageArg(currentToken()),
		AllowedParamsMessageArg(allow, syntaxPointer()));
      }
      return 0;
    case tokenEe:
      if (inputLevel() <= declInputLevel) {
	message(ParserMessages::declarationLevel);
	return 0;
      }
      if (currentMarkup())
	currentMarkup()->addEntityEnd();
      popInputStack();
      break;
    case tokenCom:
      if (!parseComment(comMode))
	return 0;
      if (options().warnPsComment)
	message(ParserMessages::psComment);
      break;
    case tokenDso:
      if (!allow.dso()) {
	paramInvalidToken(tokenDso, allow);
	return 0;
      }
      if (currentMarkup())
	currentMarkup()->addDelim(Syntax::dDSO);
      parm.type = Param::dso;
      return 1;
    case tokenGrpo:
      if (currentMarkup())
	currentMarkup()->addDelim(Syntax::dGRPO);
      switch (allow.group()) {
      case Param::invalid:
	paramInvalidToken(tokenGrpo, allow);
	return 0;
      case Param::modelGroup:
	{
	  ModelGroup *group;
	  if (!parseModelGroup(1, declInputLevel, group, grpsufMode))
	    return 0;
	  parm.type = Param::modelGroup;
	  parm.modelGroupPtr = group;
	}
	break;
      case Param::nameGroup:
	if (!parseNameGroup(declInputLevel, parm))
	  return 0;
	break;
      case Param::nameTokenGroup:
	if (!parseNameTokenGroup(declInputLevel, parm))
	  return 0;
	break;
      default:
	CANNOT_HAPPEN();
      }
      parm.type = allow.group();
      return 1;
    case tokenLita:
    case tokenLit:
      parm.type = allow.literal();
      parm.lita = token == tokenLita;
      switch (allow.literal()) {
      case Param::invalid:
	paramInvalidToken(token, allow);
	return 0;
      case Param::minimumLiteral:
	if (!parseMinimumLiteral(parm.lita, parm.literalText))
	  return 0;
	break;
      case Param::attributeValueLiteral:
	if (!parseAttributeValueLiteral(parm.lita, parm.literalText))
	  return 0;
	break;
      case Param::tokenizedAttributeValueLiteral:
	if (!parseTokenizedAttributeValueLiteral(parm.lita, parm.literalText))
	  return 0;
	break;
      case Param::systemIdentifier:
	if (!parseSystemIdentifier(parm.lita, parm.literalText))
	  return 0;
	break;
      case Param::paramLiteral:
	if (!parseParameterLiteral(parm.lita, parm.literalText))
	  return 0;
	break;
      }
      if (currentMarkup())
	currentMarkup()->addLiteral(parm.literalText);
      return 1;
    case tokenMdc:
      if (!allow.mdc()) {
	paramInvalidToken(tokenMdc, allow);
	return 0;
      }
      if (inputLevel() > declInputLevel)
	message(ParserMessages::parameterEntityNotEnded);
      if (currentMarkup())
	currentMarkup()->addDelim(Syntax::dMDC);
      parm.type = Param::mdc;
      return 1;
    case tokenMinus:
      parm.type = Param::minus;
      if (currentMarkup())
	currentMarkup()->addDelim(Syntax::dMINUS);
      return 1;
    case tokenMinusGrpo:
      if (!allow.exclusions()) {
	paramInvalidToken(tokenMinusGrpo, allow);
	return 0;
      }
      if (currentMarkup()) {
	currentMarkup()->addDelim(Syntax::dMINUS);
	currentMarkup()->addDelim(Syntax::dGRPO);
      }
      parm.type = Param::exclusions;
      return parseElementNameGroup(declInputLevel, parm);
    case tokenPero:
      parm.type = Param::pero;
      if (currentMarkup())
	currentMarkup()->addDelim(Syntax::dPERO);
      return 1;
    case tokenPeroGrpo:
      if (!inInstance())
	message(ParserMessages::peroGrpoProlog);
      // fall through
    case tokenPeroNameStart:
      {
	if (inInstance()) {
	  if (options().warnInstanceParamEntityRef)
	    message(ParserMessages::instanceParamEntityRef);
	}
	else {
	  if (options().warnInternalSubsetPsParamEntityRef && inputLevel() == 1)
	    message(ParserMessages::internalSubsetPsParamEntityRef);
	}
	ConstPtr<Entity> entity;
	Ptr<EntityOrigin> origin;
	if (!parseEntityReference(1, token == tokenPeroGrpo, entity, origin))
	  return 0;
	if (!entity.isNull())
	  entity->declReference(*this, origin);
      }
      break;
    case tokenPlusGrpo:
      if (!allow.inclusions()) {
	paramInvalidToken(tokenPlusGrpo, allow);
	return 0;
      }
      if (currentMarkup()) {
	currentMarkup()->addDelim(Syntax::dPLUS);
	currentMarkup()->addDelim(Syntax::dGRPO);
      }
      parm.type = Param::inclusions;
      return parseElementNameGroup(declInputLevel, parm);
    case tokenRni:
      if (!allow.rni()) {
	paramInvalidToken(tokenRni, allow);
	return 0;
      }
      return parseIndicatedReservedName(allow, parm);
    case tokenS:
      if (currentMarkup())
	currentMarkup()->addS(currentChar());
      break;
    case tokenNameStart:
      switch (allow.nameStart()) {
      case Param::invalid:
	paramInvalidToken(tokenNameStart, allow);
	return 0;
      case Param::reservedName:
	return parseReservedName(allow, parm);
      case Param::name:
        {
	extendNameToken(syntax().namelen(), ParserMessages::nameLength);
	parm.type = Param::name;
        getCurrentToken(parm.origToken);
        parm.token = StringC(parm.origToken);
        const SubstTable *subst = syntax().generalSubstTable();
        StringC::iterator s = parm.token.begin();
        size_t count = parm.token.size();
        const Char *tokenData = parm.token.data();
        for (; count > 0; --count)
          *s++ = (*subst)[*tokenData++];
	if (currentMarkup())
	  currentMarkup()->addName(currentInput());
	return 1;
        }
      case Param::entityName:
	extendNameToken(syntax().namelen(), ParserMessages::nameLength);
	parm.type = Param::entityName;
	getCurrentToken(syntax().entitySubstTable(), parm.token);
	if (currentMarkup())
	  currentMarkup()->addName(currentInput());
	return 1;
      case Param::paramEntityName:
	extendNameToken(syntax().penamelen(),
			ParserMessages::parameterEntityNameLength);
	parm.type = Param::paramEntityName;
	getCurrentToken(syntax().entitySubstTable(), parm.token);
	if (currentMarkup())
	  currentMarkup()->addName(currentInput());
	return 1;
      case Param::attributeValue:
	return parseAttributeValueParam(parm);
      }
      break;
    case tokenDigit:
      switch (allow.digit()) {
      case Param::invalid:
	paramInvalidToken(tokenDigit, allow);
	return 0;
      case Param::number:
	extendNumber(syntax().namelen(), ParserMessages::numberLength);
	parm.type = Param::number;
	getCurrentToken(parm.token);
	if (currentMarkup())
	  currentMarkup()->addNumber(currentInput());
	return 1;
      case Param::attributeValue:
	return parseAttributeValueParam(parm);
      }
      break;
    case tokenLcUcNmchar:
      switch (allow.nmchar()) {
      case Param::invalid:
	paramInvalidToken(tokenLcUcNmchar, allow);
	return 0;
      case Param::attributeValue:
	return parseAttributeValueParam(parm);
      }
      break;
    default:
      CANNOT_HAPPEN();
    }
  }
}

void Parser::paramInvalidToken(Token token, const AllowedParams &allow)
{
  if (!allow.silent())
    message(ParserMessages::paramInvalidToken,
	    TokenMessageArg(token, allow.mainMode(),
			    syntaxPointer(), sdPointer()),
	    AllowedParamsMessageArg(allow, syntaxPointer()));
}

Boolean Parser::parseGroupToken(const AllowedGroupTokens &allow,
				unsigned nestingLevel,
				unsigned declInputLevel,
				unsigned groupInputLevel,
				GroupToken &gt)
{
  for (;;) {
    Token token = getToken(grpMode);
    switch (token) {
    case tokenEe:
      if (inputLevel() <= groupInputLevel) {
	message(ParserMessages::groupLevel);
	if (inputLevel() <= declInputLevel)
	  return 0;
      }
      else if (!sd().www())
	message(ParserMessages::groupEntityEnd);
      if (currentMarkup())
	currentMarkup()->addEntityEnd();
      popInputStack();
      break;
    case tokenPeroGrpo:
      {
	if (!inInstance())
	  message(ParserMessages::peroGrpoProlog);
	Boolean start;
	if (inTag(start))
	    message(start
		    ? ParserMessages::peroGrpoStartTag
		    : ParserMessages::peroGrpoEndTag);
	// fall through
      }
    case tokenPeroNameStart:
      {
	if (options().warnInternalSubsetTsParamEntityRef && inputLevel() == 1)
	  message(ParserMessages::internalSubsetTsParamEntityRef);
	ConstPtr<Entity> entity;
	Ptr<EntityOrigin> origin;
	if (!parseEntityReference(1, token == tokenPeroGrpo, entity, origin))
	  return 0;
	if (!entity.isNull())
	  entity->declReference(*this, origin);
      }
      break;
    case tokenUnrecognized:
      if (reportNonSgmlCharacter())
	break;
      {
	message(ParserMessages::groupCharacter,
		StringMessageArg(currentToken()),
		AllowedGroupTokensMessageArg(allow, syntaxPointer()));
      }
      return 0;
    case tokenDtgo:
      if (!allow.groupToken(GroupToken::dataTagGroup)) {
	groupTokenInvalidToken(tokenDtgo, allow);
	return 0;
      }
      if (sd().datatag())
	message(ParserMessages::datatagNotImplemented);
      if (!defDtd().isBase())
	message(ParserMessages::datatagBaseDtd);
      if (currentMarkup())
	currentMarkup()->addDelim(Syntax::dDTGO);
      return parseDataTagGroup(nestingLevel + 1, declInputLevel, gt);
    case tokenGrpo:
      if (currentMarkup())
	currentMarkup()->addDelim(Syntax::dGRPO);
      switch (allow.group()) {
      case GroupToken::modelGroup:
	{
	  ModelGroup *modelGroup;
	  if (!parseModelGroup(nestingLevel + 1, declInputLevel, modelGroup,
			       grpMode))
	    return 0;
	  gt.model = modelGroup;
	  gt.type = GroupToken::modelGroup;
	  return 1;
	}
      case GroupToken::dataTagTemplateGroup:
	return parseDataTagTemplateGroup(nestingLevel + 1, declInputLevel, gt);
      default:
	groupTokenInvalidToken(tokenGrpo, allow);
	return 0;
      }
      break;
    case tokenRni:
      if (!allow.groupToken(GroupToken::pcdata)
          && !allow.groupToken(GroupToken::all)
          && !allow.groupToken(GroupToken::implicit)) {
	groupTokenInvalidToken(tokenRni, allow);
	return 0;
      }
      Syntax::ReservedName rn;
      if (!getIndicatedReservedName(&rn))
	return 0;
      if (rn == Syntax::rPCDATA && allow.groupToken(GroupToken::pcdata)) {
        gt.type = GroupToken::pcdata;
        gt.contentToken = new PcdataToken;
        return 1;
      }
      else if (rn == Syntax::rALL && allow.groupToken(GroupToken::all)) {
        message(ParserMessages::sorryAllImplicit);
        return 0;
      }
      else if (rn == Syntax::rIMPLICIT && allow.groupToken(GroupToken::implicit)) {
        message(ParserMessages::sorryAllImplicit);
        return 0;
      }
      else {
        StringC token(syntax().delimGeneral(Syntax::dRNI));
        token += syntax().reservedName(rn);
        message(ParserMessages::invalidToken, StringMessageArg(token));
        return 0;
      }
    case tokenS:
      if (currentMarkup()) {
	extendS();
	currentMarkup()->addS(currentInput());
      }
      break;
    case tokenNameStart:
      switch (allow.nameStart()) {
      case GroupToken::elementToken:
	{
	  extendNameToken(syntax().namelen(), ParserMessages::nameLength);
	  gt.type = GroupToken::elementToken;
	  StringC &buffer = nameBuffer();
	  getCurrentToken(syntax().generalSubstTable(), buffer);
	  if (currentMarkup())
	    currentMarkup()->addName(currentInput());
	  const ElementType *e = lookupCreateElement(buffer);
	  ContentToken::OccurrenceIndicator oi
	    = getOccurrenceIndicator(grpMode);
	  gt.contentToken = new ElementToken(e, oi);
	  return 1;
	}
      case GroupToken::name:
      case GroupToken::nameToken:
	extendNameToken(syntax().namelen(),
			token == GroupToken::name
			? ParserMessages::nameLength
			: ParserMessages::nameTokenLength);
	getCurrentToken(syntax().generalSubstTable(), gt.token);
	gt.type = allow.nameStart();
	if (currentMarkup()) {
	  if (gt.type == GroupToken::nameToken)
	    currentMarkup()->addNameToken(currentInput());
	  else
	    currentMarkup()->addName(currentInput());
	}
	return 1;
      default:
	groupTokenInvalidToken(tokenNameStart, allow);
	return 0;
      }
    case tokenDigit:
    case tokenLcUcNmchar:
      if (!allow.groupToken(GroupToken::nameToken)) {
	groupTokenInvalidToken(token, allow);
	return 0;
      }
      extendNameToken(syntax().namelen(), ParserMessages::nameTokenLength);
      getCurrentToken(syntax().generalSubstTable(), gt.token);
      gt.type = GroupToken::nameToken;
      if (currentMarkup())
	currentMarkup()->addNameToken(currentInput());
      return 1;
    case tokenLit:
    case tokenLita:
      // parameter literal in data tag pattern
      if (!allow.groupToken(GroupToken::dataTagLiteral)) {
	groupTokenInvalidToken(token, allow);
	return 0;
      }
      if (!parseDataTagParameterLiteral(token == tokenLita, gt.text))
	return 0;
      gt.type = GroupToken::dataTagLiteral;
      if (currentMarkup())
	currentMarkup()->addLiteral(gt.text);
      return 1;
    case tokenAnd:
    case tokenSeq:
    case tokenOr:
    case tokenDtgc:
    case tokenGrpc:
    case tokenOpt:
    case tokenPlus:
    case tokenRep:
      groupTokenInvalidToken(token, allow);
      return 0;
    }
  }
}


void Parser::groupTokenInvalidToken(Token token, const AllowedGroupTokens &allow)
{
  message(ParserMessages::groupTokenInvalidToken,
	  TokenMessageArg(token, grpMode, syntaxPointer(), sdPointer()),
	  AllowedGroupTokensMessageArg(allow, syntaxPointer()));
}


Boolean Parser::parseGroupConnector(const AllowedGroupConnectors &allow,
				    unsigned declInputLevel,
				    unsigned groupInputLevel,
				    GroupConnector &gc)
{
  for (;;) {
    Token token = getToken(grpMode);
    switch (token) {
    case tokenEe:
      if (inputLevel() <= groupInputLevel) {
	message(ParserMessages::groupLevel);
	if (inputLevel() <= declInputLevel)
	  return 0;
      }
      if (currentMarkup())
	currentMarkup()->addEntityEnd();
      popInputStack();
      break;
    case tokenS:
      if (currentMarkup()) {
	extendS();
	currentMarkup()->addS(currentInput());
      }
      break;
    case tokenPeroGrpo:
      if (inInstance()) {
	message(ParserMessages::peroGrpoProlog);
	break;
      }
      // fall through
    case tokenPeroNameStart:
      if (!sd().www())
	message(ParserMessages::groupEntityReference);
      else {
	ConstPtr<Entity> entity;
	Ptr<EntityOrigin> origin;
	if (!parseEntityReference(1, token == tokenPeroGrpo, entity, origin))
	  return 0;
	if (!entity.isNull())
	  entity->declReference(*this, origin);
      }
      break;
    case tokenUnrecognized:
      if (reportNonSgmlCharacter())
	break;
      {
	message(ParserMessages::groupCharacter,
		StringMessageArg(currentToken()),
		AllowedGroupConnectorsMessageArg(allow, syntaxPointer()));
      }
      return 0;
    case tokenAnd:
      if (!allow.groupConnector(GroupConnector::andGC)) {
	groupConnectorInvalidToken(tokenAnd, allow);
	return 0;
      }
      gc.type = GroupConnector::andGC;
      if (currentMarkup())
	currentMarkup()->addDelim(Syntax::dAND);
      return 1;
    case tokenSeq:
      if (!allow.groupConnector(GroupConnector::seqGC)) {
	groupConnectorInvalidToken(tokenSeq, allow);
	return 0;
      }
      gc.type = GroupConnector::seqGC;
      if (currentMarkup())
	currentMarkup()->addDelim(Syntax::dSEQ);
      return 1;
    case tokenOr:
      if (!allow.groupConnector(GroupConnector::orGC)) {
	groupConnectorInvalidToken(tokenOr, allow);
	return 0;
      }
      gc.type = GroupConnector::orGC;
      if (currentMarkup())
	currentMarkup()->addDelim(Syntax::dOR);
      return 1;
    case tokenDtgc:
      if (!allow.groupConnector(GroupConnector::dtgcGC)) {
	groupConnectorInvalidToken(tokenDtgc, allow);
	return 0;
      }
      gc.type = GroupConnector::dtgcGC;
      if (inputLevel() > groupInputLevel)
	message(ParserMessages::groupParameterEntityNotEnded);
      if (currentMarkup())
	currentMarkup()->addDelim(Syntax::dDTGC);
      return 1;
    case tokenGrpc:
      if (!allow.groupConnector(GroupConnector::grpcGC)) {
	groupConnectorInvalidToken(tokenGrpc, allow);
	return 0;
      }
      gc.type = GroupConnector::grpcGC;
      if (inputLevel() > groupInputLevel)
	message(ParserMessages::groupParameterEntityNotEnded);
      if (currentMarkup())
	currentMarkup()->addDelim(Syntax::dGRPC);
      return 1;
    default:
      groupConnectorInvalidToken(token, allow);
      return 0;
    }
  }
}

void Parser::groupConnectorInvalidToken(Token token,
					const AllowedGroupConnectors &allow)
{
  message(ParserMessages::connectorInvalidToken,
	  TokenMessageArg(token, grpMode, syntaxPointer(), sdPointer()),
	  AllowedGroupConnectorsMessageArg(allow, syntaxPointer()));
}

static AllowedGroupTokens allowName(GroupToken::name);

Boolean Parser::parseElementNameGroup(unsigned declInputLevel, Param &parm)
{
  static AllowedGroupTokens allowCommonName(GroupToken::name,
                                             GroupToken::all,
                                             GroupToken::implicit);
  if (!parseGroup(sd().www() ? allowCommonName : allowName, declInputLevel, parm))
    return 0;
  parm.elementVector.resize(parm.nameTokenVector.size());
  for (size_t i = 0; i < parm.nameTokenVector.size(); i++)
    parm.elementVector[i] = lookupCreateElement(parm.nameTokenVector[i].name);
  return 1;
}

Boolean Parser::parseEntityReferenceNameGroup(Boolean &ignore)
{
  Param parm;
  if (!parseNameGroup(inputLevel(), parm))
    return 0;
  if (inInstance()) {
    for (size_t i = 0; i < parm.nameTokenVector.size(); i++) {
      const Lpd *lpd = lookupLpd(parm.nameTokenVector[i].name).pointer();
      if (lpd && lpd->active()) {
	ignore = 0;
	return 1;
      }
      Ptr<Dtd> dtd = lookupDtd(parm.nameTokenVector[i].name).pointer();
      if (!dtd.isNull()) {
	instantiateDtd(dtd);
	if (currentDtdPointer() == dtd) {
	  ignore = 0;
	  return 1;
	}
      }
    }
  }
  ignore = 1;
  return 1;
}

Boolean Parser::parseTagNameGroup(Boolean &active, Boolean start)
{
  Param parm;
  enterTag(start);
  Boolean ret = parseNameGroup(inputLevel(), parm);
  leaveTag();
  if (!ret)
    return 0;
  active = 0;
  for (size_t i = 0; i < parm.nameTokenVector.size(); i++) {
    Ptr<Dtd> dtd = lookupDtd(parm.nameTokenVector[i].name).pointer();
    if (!dtd.isNull()) {
      instantiateDtd(dtd);
      if (currentDtdPointer() == dtd)
	active = 1;
    }
  }
  return 1;
}

Boolean Parser::parseNameGroup(unsigned declInputLevel, Param &parm)
{
  return parseGroup(allowName, declInputLevel, parm);
}

Boolean Parser::parseNameTokenGroup(unsigned declInputLevel, Param &parm)
{
  static AllowedGroupTokens allowNameToken(GroupToken::nameToken);
  return parseGroup(allowNameToken, declInputLevel, parm);
}

static
Boolean groupContains(const Vector<NameToken> &vec, const StringC &str)
{
  for (size_t i = 0; i < vec.size(); i++)
    if (vec[i].name == str)
      return 1;
  return 0;
}

Boolean Parser::parseGroup(const AllowedGroupTokens &allowToken,
			   unsigned declInputLevel,
			   Param &parm)
{
  unsigned groupInputLevel = inputLevel();
  int nDuplicates = 0;
  Vector<NameToken> &vec = parm.nameTokenVector;
  vec.clear();
  GroupConnector::Type connector = GroupConnector::grpcGC;
  GroupToken gt;
  for (;;) {
    if (!parseGroupToken(allowToken, 0, declInputLevel, groupInputLevel, gt))
      return 0;
    if (groupContains(vec, gt.token)) {
      nDuplicates++;
      message(ParserMessages::duplicateGroupToken,
	      StringMessageArg(gt.token));
    }
    else {
      vec.resize(vec.size() + 1);
      gt.token.swap(vec.back().name);
      getCurrentToken(vec.back().origName);
      vec.back().loc = currentLocation();
    }
    GroupConnector gc;
    static AllowedGroupConnectors allowAnyConnectorGrpc(GroupConnector::orGC,
							GroupConnector::andGC,
							GroupConnector::seqGC,
							GroupConnector::grpcGC);

    if (!parseGroupConnector(allowAnyConnectorGrpc, declInputLevel,
			     groupInputLevel, gc))
      return 0;
    if (gc.type == GroupConnector::grpcGC)
      break;
    if (options().warnNameGroupNotOr) {
      if (gc.type != GroupConnector::orGC)
	message(ParserMessages::nameGroupNotOr);
    }
    else if (options().warnShould) {
      if (connector == GroupConnector::grpcGC)
	connector = gc.type;
      else if (gc.type != connector) {
	message(ParserMessages::mixedConnectors);
	connector = gc.type;
      }
    }
  }
  if (nDuplicates + vec.size() > syntax().grpcnt())
    message(ParserMessages::groupCount, NumberMessageArg(syntax().grpcnt()));
  return 1;
}

Boolean Parser::parseDataTagGroup(unsigned nestingLevel,
				  unsigned declInputLevel, GroupToken &result)
{
  if (nestingLevel - 1 == syntax().grplvl())
    message(ParserMessages::grplvl, NumberMessageArg(syntax().grplvl()));
  unsigned groupInputLevel = inputLevel();
  GroupToken gt;
  static AllowedGroupTokens allowName(GroupToken::name);
  if (!parseGroupToken(allowName, nestingLevel, declInputLevel,
		       groupInputLevel, gt))
    return 0;
  const ElementType *element = lookupCreateElement(gt.token);
  GroupConnector gc;
  static AllowedGroupConnectors allowSeq(GroupConnector::seqGC);
  if (!parseGroupConnector(allowSeq, declInputLevel, groupInputLevel, gc))
    return 0;
  static AllowedGroupTokens
    allowDataTagLiteralDataTagTemplateGroup(GroupToken::dataTagLiteral,
					    GroupToken::dataTagTemplateGroup);
  if (!parseGroupToken(allowDataTagLiteralDataTagTemplateGroup,
		       nestingLevel,
		       declInputLevel,
		       groupInputLevel,
		       gt))
    return 0;
  Vector<Text> templates;
  if (gt.type == GroupToken::dataTagTemplateGroup)
    gt.textVector.swap(templates);
  else {
    templates.resize(1);
    gt.text.swap(templates[0]);
  }
  static AllowedGroupConnectors allowSeqDtgc(GroupConnector::seqGC,
					     GroupConnector::dtgcGC);
  if (!parseGroupConnector(allowSeqDtgc, declInputLevel, groupInputLevel, gc))
    return 0;
  NCVector<Owner<ContentToken> > vec(2);
  vec[1] = new PcdataToken;
  if (gc.type != GroupConnector::dtgcGC) {
    static AllowedGroupTokens allowDataTagLiteral(GroupToken::dataTagLiteral);
    if (!parseGroupToken(allowDataTagLiteral,
			 nestingLevel,
			 declInputLevel,
			 groupInputLevel,
			 gt))
      return 0;
    vec[0] = new DataTagElementToken(element, templates, gt.text);
    static AllowedGroupConnectors allowDtgc(GroupConnector::dtgcGC);
    if (!parseGroupConnector(allowDtgc, declInputLevel, groupInputLevel, gc))
      return 0;
  }
  else
    vec[0] = new DataTagElementToken(element, templates);
  ContentToken::OccurrenceIndicator oi = getOccurrenceIndicator(grpMode);
  result.contentToken = new DataTagGroup(vec, oi);
  result.type = GroupToken::dataTagGroup;
  return 1;
}

Boolean Parser::parseDataTagTemplateGroup(unsigned nestingLevel,
					  unsigned declInputLevel,
					  GroupToken &result)
{
  if (nestingLevel - 1 == syntax().grplvl())
    message(ParserMessages::grplvl, NumberMessageArg(syntax().grplvl()));
  unsigned groupInputLevel = inputLevel();
  Vector<Text> &vec = result.textVector;
  for (;;) {
    GroupToken gt;
    static AllowedGroupTokens allowDataTagLiteral(GroupToken::dataTagLiteral);
    if (!parseGroupToken(allowDataTagLiteral,
			 nestingLevel,
			 declInputLevel,
			 groupInputLevel,
			 gt))
      return 0;
    if (vec.size() == syntax().grpcnt())
      message(ParserMessages::groupCount, NumberMessageArg(syntax().grpcnt()));
    vec.resize(vec.size() + 1);
    gt.text.swap(vec.back());
    static AllowedGroupConnectors allowOrGrpc(GroupConnector::orGC,
					      GroupConnector::grpcGC);
    GroupConnector gc;
    if (!parseGroupConnector(allowOrGrpc, declInputLevel, groupInputLevel, gc))
      return 0;
    if (gc.type == GroupConnector::grpcGC)
      break;
  }
  return 1;
}

Boolean Parser::parseModelGroup(unsigned nestingLevel, unsigned declInputLevel,
				ModelGroup *&group, Mode oiMode)
{
  if (nestingLevel - 1 == syntax().grplvl())
    message(ParserMessages::grplvl, NumberMessageArg(syntax().grplvl()));
  unsigned groupInputLevel = inputLevel();
  GroupToken gt;
  NCVector<Owner<ContentToken> > tokenVector;
  GroupConnector::Type connector = GroupConnector::grpcGC;
  
  static AllowedGroupTokens allowContentToken(GroupToken::pcdata,
					      GroupToken::dataTagGroup,
					      GroupToken::elementToken,
					      GroupToken::modelGroup);
  static AllowedGroupTokens allowCommonContentToken(GroupToken::pcdata,
                                                    GroupToken::all,
                                                    GroupToken::implicit,
					            GroupToken::dataTagGroup,
					            GroupToken::elementToken,
					            GroupToken::modelGroup);
  static AllowedGroupConnectors allowAnyConnectorGrpc(GroupConnector::orGC,
						      GroupConnector::andGC,
						      GroupConnector::seqGC,
						      GroupConnector::grpcGC);
			    
  static AllowedGroupConnectors allowOrGrpc(GroupConnector::orGC,
					    GroupConnector::grpcGC);
  static AllowedGroupConnectors allowAndGrpc(GroupConnector::andGC,
					     GroupConnector::grpcGC);
  static AllowedGroupConnectors allowSeqGrpc(GroupConnector::seqGC,
					     GroupConnector::grpcGC);
  const AllowedGroupConnectors *connectorp = &allowAnyConnectorGrpc;

  GroupConnector gc;
  Boolean pcdataCheck = 0;
  do {
    if (!parseGroupToken(sd().www() ? allowCommonContentToken 
                                    : allowContentToken, 
                         nestingLevel, declInputLevel, groupInputLevel, gt))
      return 0;
    ContentToken *contentToken;
    if (gt.type == GroupToken::modelGroup)
      contentToken = gt.model.extract();
    else
      contentToken = gt.contentToken.extract();
    if (tokenVector.size() == syntax().grpcnt())
      message(ParserMessages::groupCount, NumberMessageArg(syntax().grpcnt()));
    tokenVector.resize(tokenVector.size() + 1);
    tokenVector.back() = contentToken;
    if (!parseGroupConnector(*connectorp, declInputLevel, groupInputLevel, gc))
      return 0;
    if (options().warnMixedContentRepOrGroup && gt.type == GroupToken::pcdata) {
      if (tokenVector.size() != 1)
	message(ParserMessages::pcdataNotFirstInGroup);
      else if (gc.type == GroupConnector::seqGC)
	message(ParserMessages::pcdataInSeqGroup);
      else
	pcdataCheck = 1;
      if (nestingLevel != 1)
	message(ParserMessages::pcdataInNestedModelGroup);
    }
    else if (pcdataCheck) {
      if (gt.type == GroupToken::modelGroup)
	message(ParserMessages::pcdataGroupMemberModelGroup);
      if (contentToken->occurrenceIndicator() != ContentToken::none)
	message(ParserMessages::pcdataGroupMemberOccurrenceIndicator);
    }
    if (tokenVector.size() == 1) {
      connector = gc.type;
      switch (gc.type) {
      case GroupConnector::orGC:
	connectorp = &allowOrGrpc;
	break;
      case GroupConnector::seqGC:
	connectorp = &allowSeqGrpc;
	break;
      case GroupConnector::andGC:
	connectorp = &allowAndGrpc;
	if (options().warnAndGroup)
	  message(ParserMessages::andGroup);
	break;
      default:
	break;
      }
    }
  } while (gc.type != GroupConnector::grpcGC);
  ContentToken::OccurrenceIndicator oi
    = getOccurrenceIndicator(oiMode);
  switch (connector) {
  case GroupConnector::orGC:
    group = new OrModelGroup(tokenVector, oi);
    if (pcdataCheck && oi != ContentToken::rep)
      message(ParserMessages::pcdataGroupNotRep);
    break;
  case GroupConnector::grpcGC:
    if (pcdataCheck && oi != ContentToken::rep && oi != ContentToken::none)
      message(ParserMessages::pcdataGroupNotRep);
    // fall through
  case GroupConnector::seqGC:
    group = new SeqModelGroup(tokenVector, oi);
    break;
  case GroupConnector::andGC:
    group = new AndModelGroup(tokenVector, oi);
    break;
  default:
    break;
  }
  return 1;
}

ContentToken::OccurrenceIndicator
Parser::getOccurrenceIndicator(Mode oiMode)
{
  Token token = getToken(oiMode);
  switch (token) {
  case tokenPlus:
    if (currentMarkup())
      currentMarkup()->addDelim(Syntax::dPLUS);
    return ContentToken::plus;
  case tokenOpt: 
    if (currentMarkup())
      currentMarkup()->addDelim(Syntax::dOPT);
   return ContentToken::opt;
  case tokenRep:
    if (currentMarkup())
      currentMarkup()->addDelim(Syntax::dREP);
    return ContentToken::rep;
  default:
    currentInput()->ungetToken();
    return ContentToken::none;
  }
}

Boolean Parser::parseMinimumLiteral(Boolean lita, Text &text)
{
  return parseLiteral(lita ? mlitaMode : mlitMode, mlitMode,
		      Syntax::referenceQuantity(Syntax::qLITLEN),
		      ParserMessages::minimumLiteralLength,
		      literalSingleSpace|literalMinimumData
		      |(eventsWanted().wantPrologMarkup()
			? literalDelimInfo
			: 0),
		      text);
}

Boolean Parser::parseSystemIdentifier(Boolean lita, Text &text)
{
  return parseLiteral(lita ? slitaMode : slitMode, slitMode, syntax().litlen(),
		      ParserMessages::systemIdentifierLength,
		      (eventsWanted().wantPrologMarkup()
			? literalDelimInfo
			: 0), text);
}

Boolean Parser::parseParameterLiteral(Boolean lita, Text &text)
{
  return parseLiteral(lita ? plitaMode : plitMode, pliteMode, syntax().litlen(), 
		      ParserMessages::parameterLiteralLength,
		      (eventsWanted().wantPrologMarkup()
		       ? literalDelimInfo
		       : 0),
		      text);
}

Boolean Parser::parseDataTagParameterLiteral(Boolean lita, Text &text)
{
  return parseLiteral(lita ? plitaMode : plitMode, pliteMode,
		      syntax().dtemplen(), 
		      ParserMessages::dataTagPatternLiteralLength,
		      literalDataTag
		      | (eventsWanted().wantPrologMarkup()
			 ? literalDelimInfo
			 : 0),
		      text);
}

Boolean Parser::parseIndicatedReservedName(const AllowedParams &allow,
					   Param &parm)
{
  Syntax::ReservedName rn;
  if (!getIndicatedReservedName(&rn))
    return 0;
  if (!allow.reservedName(rn)) {
    message(ParserMessages::invalidReservedName,
	    StringMessageArg(currentToken()));
    return 0;
  }
  parm.type = Param::indicatedReservedName + rn;
  return 1;
}

Boolean Parser::parseReservedName(const AllowedParams &allow,
				  Param &parm)
{
  Syntax::ReservedName rn;
  if (!getReservedName(&rn))
    return 0;
  if (!allow.reservedName(rn)) {
    message(ParserMessages::invalidReservedName,
	    StringMessageArg(syntax().reservedName(rn)));
    return 0;
  }
  parm.type = Param::reservedName + rn;
  return 1;
}


Boolean Parser::parseAttributeValueParam(Param &parm)
{
  extendNameToken(syntax().litlen() > syntax().normsep()
		  ? syntax().litlen() - syntax().normsep()
		  : 0,
		  ParserMessages::attributeValueLength);
  parm.type = Param::attributeValue;
  Text text;
  text.addChars(currentInput()->currentTokenStart(),
		currentInput()->currentTokenLength(),
		currentLocation());
  text.swap(parm.literalText);
  if (currentMarkup())
    currentMarkup()->addAttributeValue(currentInput());
  return 1;
}

Boolean Parser::getIndicatedReservedName(Syntax::ReservedName *result)
{
  if (currentMarkup())
    currentMarkup()->addDelim(Syntax::dRNI);
  InputSource *in = currentInput();
  in->startToken();
  if (!syntax().isNameStartCharacter(in->tokenChar(messenger()))) {
    message(ParserMessages::rniNameStart);
    return 0;
  }
  extendNameToken(syntax().namelen(), ParserMessages::nameLength);
  StringC &buffer = nameBuffer();
  getCurrentToken(syntax().generalSubstTable(), buffer);
  if (!syntax().lookupReservedName(buffer, result)) {
    message(ParserMessages::noSuchReservedName, StringMessageArg(buffer));
    return 0;
  }
  if (currentMarkup())
    currentMarkup()->addReservedName(*result, currentInput());
  return 1;
}

Boolean Parser::getReservedName(Syntax::ReservedName *result)
{
  extendNameToken(syntax().namelen(), ParserMessages::nameLength);
  StringC &buffer = nameBuffer();
  getCurrentToken(syntax().generalSubstTable(), buffer);
  if (!syntax().lookupReservedName(buffer, result)) {
    message(ParserMessages::noSuchReservedName, StringMessageArg(buffer));
    return 0;
  }
  if (currentMarkup())
    currentMarkup()->addReservedName(*result, currentInput());
  return 1;
}


#ifdef SP_NAMESPACE
}
#endif
