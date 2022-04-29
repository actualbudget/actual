// Copyright (c) 1996 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"
#include "ParserApp.h"
#include "ParserAppMessages.h"
#include "MessageArg.h"
#include "Location.h"
#include "macros.h"
#include "sptchar.h"
#include "ArcEngine.h"

#include <limits.h>
#include <errno.h>
#include <stdlib.h>

#ifndef DEFAULT_ERROR_LIMIT
#define DEFAULT_ERROR_LIMIT 200
#endif

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

ParserApp::ParserApp(const char *requiredInternalCode)
: EntityApp(requiredInternalCode),
  errorLimit_(DEFAULT_ERROR_LIMIT)
{
  registerOption('a', SP_T("activate"), ParserAppMessages::name,
                 ParserAppMessages::aHelp);
  registerOption('A', SP_T("architecture"), ParserAppMessages::name,
                 ParserAppMessages::AHelp);
  registerOption('E', SP_T("max-errors"), ParserAppMessages::number,
                 ParserAppMessages::EHelp);
  registerOption('e', SP_T("open-entities"), ParserAppMessages::eHelp);
  registerOption('g', SP_T("open-elements"), ParserAppMessages::gHelp);
  registerOption('n', SP_T("error-numbers"), ParserAppMessages::nHelp);
  registerOption('x', SP_T("references"), ParserAppMessages::xHelp);
  registerOption('i', SP_T("include"), ParserAppMessages::name,
                 ParserAppMessages::iHelp);
  registerOption('w', SP_T("warning"), ParserAppMessages::type, 
                 ParserAppMessages::wHelp);
}

void ParserApp::initParser(const StringC &sysid)
{
  SgmlParser::Params params;
  params.sysid = sysid;
  params.entityManager = entityManager().pointer();
  params.options = &options_;
  parser_.init(params);
  if (arcNames_.size() > 0)
    parser_.activateLinkType(arcNames_[0]);
  for (size_t i = 0; i < activeLinkTypes_.size(); i++) 
    parser_.activateLinkType(convertInput(activeLinkTypes_[i]));
  allLinkTypesActivated();
}

void ParserApp::allLinkTypesActivated()
{
  parser_.allLinkTypesActivated();
}

int ParserApp::processSysid(const StringC &sysid)
{
  initParser(sysid);
  ErrorCountEventHandler *eceh = makeEventHandler();
  if (errorLimit_)
    eceh->setErrorLimit(errorLimit_);	
  return generateEvents(eceh);
}

int ParserApp::generateEvents(ErrorCountEventHandler *eceh)
{
  Owner<EventHandler> eh(eceh);
  parseAll(parser_, *eh, eceh->cancelPtr());
  unsigned errorCount = eceh->errorCount();
  if (errorLimit_ != 0 && errorCount >= errorLimit_)
    message(ParserAppMessages::errorLimitExceeded,
	    NumberMessageArg(errorLimit_));
  return errorCount > 0;
}

void ParserApp::parseAll(SgmlParser &parser,
			 EventHandler &eh,
			 const volatile sig_atomic_t *cancelPtr)
{
  if (arcNames_.size() > 0) {
    SelectOneArcDirector director(arcNames_, eh);
    ArcEngine::parseAll(parser, director, director, cancelPtr);
  }
  else
    parser.parseAll(eh, cancelPtr);
}

void ParserApp::processOption(AppChar opt, const AppChar *arg)
{
  switch (opt) {
  case 'a':
    // activate link
    activeLinkTypes_.push_back(arg);
    break;
  case 'A':
    arcNames_.push_back(convertInput(arg));
    break;
  case 'E':
    {
      AppChar *end;
      unsigned long n = tcstoul((AppChar *)arg, &end, 10);
      if ((n == 0 && end == arg)
	  || *end != SP_T('\0')
	  || (n == ULONG_MAX && errno == ERANGE)
	  || n > UINT_MAX)
	message(ParserAppMessages::badErrorLimit);
      else
	errorLimit_ = unsigned(n);
    }
    break;
  case 'e':
    // describe open entities in error messages
    addOption(MessageReporter::openEntities);
    break;
  case 'g':
    // show gis of open elements in error messages
    addOption(MessageReporter::openElements);
    break;
  case 'n':
    // show message number in error messages
    addOption(MessageReporter::messageNumbers);
    break;
  case 'x':
    // show relevant clauses in error messages
    addOption(MessageReporter::clauses);
    break;
  case 'i':
    // pretend that arg is defined as INCLUDE
    options_.includes.push_back(convertInput(arg));
    break;
  case 'w':
    if (!enableWarning(arg))
      message(ParserAppMessages::unknownWarning,
	      StringMessageArg(convertInput(arg)));
    break;
  default:
    EntityApp::processOption(opt, arg);
    break;
  }
}

Boolean ParserApp::enableWarning(const AppChar *s)
{
  enum { groupAll = 01, groupMinTag = 02, groupXML = 04 };
  static struct {
    // Explicit qualifier works around CodeWarrior bug
    const CmdLineApp::AppChar *name;
    PackedBoolean ParserOptions::*ptr;
    unsigned char groups;
  } table[] = {
    { SP_T("mixed"), &ParserOptions::warnMixedContent, groupAll },
    { SP_T("should"), &ParserOptions::warnShould, groupAll },
    { SP_T("duplicate"), &ParserOptions::warnDuplicateEntity, 0 },
    { SP_T("default"), &ParserOptions::warnDefaultEntityReference, groupAll },
    { SP_T("undefined"), &ParserOptions::warnUndefinedElement, groupAll },
    { SP_T("sgmldecl"), &ParserOptions::warnSgmlDecl, groupAll },
    { SP_T("unclosed"), &ParserOptions::noUnclosedTag, groupAll|groupMinTag },
    { SP_T("net"), &ParserOptions::noNet, groupMinTag },
    { SP_T("empty"), &ParserOptions::warnEmptyTag, groupAll|groupMinTag },
    { SP_T("unused-map"), &ParserOptions::warnUnusedMap, groupAll },
    { SP_T("unused-param"), &ParserOptions::warnUnusedParam, groupAll },
    { SP_T("notation-sysid"), &ParserOptions::warnNotationSystemId, 0 },
    { SP_T("inclusion"), &ParserOptions::warnInclusion, groupXML },
    { SP_T("exclusion"), &ParserOptions::warnExclusion, groupXML },
    { SP_T("rcdata-content"), &ParserOptions::warnRcdataContent, groupXML },
    { SP_T("cdata-content"), &ParserOptions::warnCdataContent, groupXML },
    { SP_T("ps-comment"), &ParserOptions::warnPsComment, groupXML },
    { SP_T("attlist-group-decl"), &ParserOptions::warnAttlistGroupDecl, groupXML },
    { SP_T("element-group-decl"), &ParserOptions::warnElementGroupDecl, groupXML },
    { SP_T("pi-entity"), &ParserOptions::warnPiEntity, groupXML },
    { SP_T("internal-sdata-entity"), &ParserOptions::warnInternalSdataEntity, groupXML },
    { SP_T("internal-cdata-entity"), &ParserOptions::warnInternalCdataEntity, groupXML },
    { SP_T("external-sdata-entity"), &ParserOptions::warnExternalSdataEntity, groupXML },
    { SP_T("external-cdata-entity"), &ParserOptions::warnExternalCdataEntity, groupXML },
    { SP_T("bracket-entity"), &ParserOptions::warnBracketEntity, groupXML },
    { SP_T("data-atts"), &ParserOptions::warnDataAttributes, groupXML },
    { SP_T("missing-system-id"), &ParserOptions::warnMissingSystemId, groupXML },
    { SP_T("conref"), &ParserOptions::warnConref, groupXML },
    { SP_T("current"), &ParserOptions::warnCurrent, groupXML },
    { SP_T("nutoken-decl-value"), &ParserOptions::warnNutokenDeclaredValue, groupXML },
    { SP_T("number-decl-value"), &ParserOptions::warnNumberDeclaredValue, groupXML },
    { SP_T("name-decl-value"), &ParserOptions::warnNameDeclaredValue, groupXML },
    { SP_T("named-char-ref"), &ParserOptions::warnNamedCharRef, groupXML },
    { SP_T("refc"), &ParserOptions::warnRefc, groupXML },
    { SP_T("temp-ms"), &ParserOptions::warnTempMarkedSection, groupXML },
    { SP_T("rcdata-ms"), &ParserOptions::warnRcdataMarkedSection, groupXML },
    { SP_T("instance-include-ms"), &ParserOptions::warnInstanceIncludeMarkedSection, groupXML },
    { SP_T("instance-ignore-ms"), &ParserOptions::warnInstanceIgnoreMarkedSection, groupXML },
    { SP_T("and-group"), &ParserOptions::warnAndGroup, groupXML },
    { SP_T("rank"), &ParserOptions::warnRank, groupXML },
    { SP_T("empty-comment-decl"), &ParserOptions::warnEmptyCommentDecl, groupXML },
    { SP_T("att-value-not-literal"), &ParserOptions::warnAttributeValueNotLiteral, groupXML },
    { SP_T("missing-att-name"), &ParserOptions::warnMissingAttributeName, groupXML },
    { SP_T("comment-decl-s"), &ParserOptions::warnCommentDeclS, groupXML },
    { SP_T("comment-decl-multiple"), &ParserOptions::warnCommentDeclMultiple, groupXML },
    { SP_T("missing-status-keyword"), &ParserOptions::warnMissingStatusKeyword, groupXML },
    { SP_T("multiple-status-keyword"), &ParserOptions::warnMultipleStatusKeyword, groupXML },
    { SP_T("instance-param-entity"), &ParserOptions::warnInstanceParamEntityRef, groupXML },
    { SP_T("min-param"), &ParserOptions::warnMinimizationParam, groupXML },
    { SP_T("mixed-content-xml"), &ParserOptions::warnMixedContentRepOrGroup, groupXML },
    { SP_T("name-group-not-or"), &ParserOptions::warnNameGroupNotOr, groupXML },
    { SP_T("pi-missing-name"), &ParserOptions::warnPiMissingName, groupXML },
    { SP_T("instance-status-keyword-s"), &ParserOptions::warnInstanceStatusKeywordSpecS, groupXML },
    { SP_T("external-data-entity-ref"), &ParserOptions::warnExternalDataEntityRef, groupXML },
    { SP_T("att-value-external-entity-ref"), &ParserOptions::warnAttributeValueExternalEntityRef, groupXML },
    { SP_T("data-delim"), &ParserOptions::warnDataDelim, groupXML },
    { SP_T("explicit-sgml-decl"), &ParserOptions::warnExplicitSgmlDecl, groupXML },
    { SP_T("internal-subset-ms"), &ParserOptions::warnInternalSubsetMarkedSection, groupXML },
    { SP_T("default-entity"), &ParserOptions::warnDefaultEntityDecl, groupXML },
    { SP_T("non-sgml-char-ref"), &ParserOptions::warnNonSgmlCharRef, groupXML },
    { SP_T("internal-subset-ps-param-entity"), &ParserOptions::warnInternalSubsetPsParamEntityRef, groupXML },
    { SP_T("internal-subset-ts-param-entity"), &ParserOptions::warnInternalSubsetTsParamEntityRef, groupXML },
    { SP_T("internal-subset-literal-param-entity"), &ParserOptions::warnInternalSubsetLiteralParamEntityRef, groupXML },
    { SP_T("immediate-recursion"), &ParserOptions::warnImmediateRecursion, 0 },
    { SP_T("fully-declared"), &ParserOptions::fullyDeclared, 0 },
    { SP_T("fully-tagged"), &ParserOptions::fullyTagged, 0 },
    { SP_T("amply-tagged-recursive"), &ParserOptions::amplyTagged, 0 },
    { SP_T("amply-tagged"), &ParserOptions::amplyTaggedAnyother, 0 },
    { SP_T("type-valid"), &ParserOptions::valid, 0 },
    { SP_T("entity-ref"), &ParserOptions::entityRef, 0 },
    { SP_T("external-entity-ref"), &ParserOptions::externalEntityRef, 0 },
    { SP_T("integral"), &ParserOptions::integral, 0 },
    { SP_T("idref"), &ParserOptions::errorIdref, 0 },
    { SP_T("significant"), &ParserOptions::errorSignificant, 0 },
    { SP_T("afdr"), &ParserOptions::errorAfdr, 0 },
  };
  static struct {
    const CmdLineApp::AppChar *name;
    unsigned char flag;
  } groupTable[] = {
    { SP_T("all"), groupAll },
    { SP_T("min-tag"), groupMinTag },
    { SP_T("xml"), groupXML },
  };
  PackedBoolean val = 1;
  if (tcsncmp(s, SP_T("no-"), 3) == 0) {
    s += 3;
    val = 0;
  }
  for (size_t i = 0; i < SIZEOF(groupTable); i++)
    if (tcscmp(s, groupTable[i].name) == 0) {
      for (size_t j = 0; j < SIZEOF(table); j++)
	if (table[j].groups & groupTable[i].flag) {
	  // Use parentheses to work around Watcom 10.0a bug.
	  (options_.*(table[j].ptr)) = val;
	}
      return 1;
    }
  for (size_t i = 0; i < SIZEOF(table); i++)
    if (tcscmp(s, table[i].name) == 0) {
      // Use parentheses to work around Watcom 10.0a bug.
      (options_.*(table[i].ptr)) = val;
      return 1;
    }
  if (tcscmp(s, SP_T("valid")) == 0) {
    options_.typeValid = val;
    return 1;
  }
  return 0;
}

#ifdef SP_NAMESPACE
}
#endif
