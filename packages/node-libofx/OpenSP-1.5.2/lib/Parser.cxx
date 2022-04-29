// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"
#include "Parser.h"
#include "ParserMessages.h"
#include "constant.h"
#include "Trie.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

Parser::Parser(const SgmlParser::Params &params)
: ParserState(params.parent
	      ? params.parent->parser_->entityManagerPtr()
	      : params.entityManager,
	      params.options
	      ? *params.options
	      : params.parent->parser_->options(),
	      paramsSubdocLevel(params),
	      params.entityType == SgmlParser::Params::dtd
	      ? declSubsetPhase
	      : contentPhase),
  sysid_(params.sysid)
{
  Parser *parent = 0;
  if (params.parent)
    parent = params.parent->parser_;
  if (params.entityType == SgmlParser::Params::document) {
    Sd *sd = new Sd(entityManagerPtr());
    const ParserOptions &opt = options();
    sd->setBooleanFeature(Sd::fDATATAG, opt.datatag);
    sd->setBooleanFeature(Sd::fOMITTAG, opt.omittag);
    sd->setBooleanFeature(Sd::fRANK, opt.rank);
    sd->setShorttag(opt.shorttag);
    sd->setBooleanFeature(Sd::fEMPTYNRM, opt.emptynrm);
    sd->setNumberFeature(Sd::fSIMPLE, opt.linkSimple);
    sd->setBooleanFeature(Sd::fIMPLICIT, opt.linkImplicit);
    sd->setNumberFeature(Sd::fEXPLICIT, opt.linkExplicit);
    sd->setNumberFeature(Sd::fCONCUR, opt.concur);
    sd->setNumberFeature(Sd::fSUBDOC, opt.subdoc);
    sd->setBooleanFeature(Sd::fFORMAL, opt.formal);
    setSdOverrides(*sd);
    PublicId publicId;
    CharsetDecl docCharsetDecl;
    docCharsetDecl.addSection(publicId);
    docCharsetDecl.addRange(0, charMax > 99999999 ? 99999999 : charMax + 1, 0);
    sd->setDocCharsetDecl(docCharsetDecl);
    setSd(sd);
  }
  else if (params.sd.isNull()) {
    setSd(parent->sdPointer());
    setSyntaxes(parent->prologSyntaxPointer(),
		parent->instanceSyntaxPointer());
  }
  else {
    setSd(params.sd);
    setSyntaxes(params.prologSyntax, params.instanceSyntax);
  }

  // Make catalog
  StringC sysid(params.sysid);
  ConstPtr<EntityCatalog> catalog
    = entityManager().makeCatalog(sysid,
				  sd().docCharset(),
				  messenger());
  if (!catalog.isNull())
    setEntityCatalog(catalog);
  else if (parent)
    setEntityCatalog(parent->entityCatalogPtr());
  else {
    allDone();
    return;
  }
  
  // Set up the input stack.
  if (sysid.size() == 0) {
    allDone();
    return;
  }
  Ptr<InputSourceOrigin> origin;
  if (params.origin.isNull())
    origin = InputSourceOrigin::make();
  else
    origin = params.origin;
  pushInput(entityManager().open(sysid,
				 sd().docCharset(),
				 origin.pointer(),
				 EntityManager::mayRewind|EntityManager::maySetDocCharset,
				 messenger()));
  if (inputLevel() == 0) {
    allDone();
    return;
  }
  switch (params.entityType) {
  case SgmlParser::Params::document:
    setPhase(initPhase);
    break;
  case SgmlParser::Params::subdoc:
    if (params.subdocInheritActiveLinkTypes && parent)
      inheritActiveLinkTypes(*parent);
    if (subdocLevel() == sd().subdoc() + 1)
      message(ParserMessages::subdocLevel, NumberMessageArg(sd().subdoc()));
    if (sd().www()) 
      setPhase(initPhase);
    else { 
      setPhase(prologPhase);
      compilePrologModes();
    }
    break;
  case SgmlParser::Params::dtd:
    compilePrologModes();
    startDtd(params.doctypeName);
    setPhase(declSubsetPhase);
    break;
  }
}

void Parser::setSdOverrides(Sd &sd)
{
  // FIXME overriding behaviour when using multiple -w options
  if (options().typeValid != ParserOptions::sgmlDeclTypeValid) {
    sd.setTypeValid(options().typeValid);
    sd.setBooleanFeature(Sd::fIMPLYDEFATTLIST, !options().typeValid);
    sd.setImplydefElement(options().typeValid
                          ? Sd::implydefElementNo
                          : Sd::implydefElementYes);
    sd.setBooleanFeature(Sd::fIMPLYDEFENTITY, !options().typeValid);
    sd.setBooleanFeature(Sd::fIMPLYDEFNOTATION, !options().typeValid);
  }
  if (options().fullyDeclared) {
    sd.setBooleanFeature(Sd::fIMPLYDEFATTLIST, 0);
    sd.setImplydefElement(Sd::implydefElementNo);
    sd.setBooleanFeature(Sd::fIMPLYDEFENTITY, 0);
    sd.setBooleanFeature(Sd::fIMPLYDEFNOTATION, 0);
  }
  if (options().fullyTagged) {
    sd.setBooleanFeature(Sd::fDATATAG, 0);
    sd.setBooleanFeature(Sd::fRANK, 0);
    sd.setBooleanFeature(Sd::fOMITTAG, 0);
    sd.setBooleanFeature(Sd::fSTARTTAGEMPTY, 0);
    sd.setBooleanFeature(Sd::fATTRIBOMITNAME, 0);
  }
  if (options().amplyTagged) {
    sd.setBooleanFeature(Sd::fDATATAG, 0);
    sd.setBooleanFeature(Sd::fRANK, 0);
    sd.setBooleanFeature(Sd::fOMITTAG, 0);
    sd.setBooleanFeature(Sd::fATTRIBOMITNAME, 0);
    sd.setImplydefElement(Sd::implydefElementYes);
  }
  if (options().amplyTaggedAnyother) {
    sd.setBooleanFeature(Sd::fDATATAG, 0);
    sd.setBooleanFeature(Sd::fRANK, 0);
    sd.setBooleanFeature(Sd::fOMITTAG, 0);
    sd.setBooleanFeature(Sd::fATTRIBOMITNAME, 0);
    sd.setImplydefElement(Sd::implydefElementAnyother);
  }
  if (options().valid) {
    sd.setTypeValid(1);
  }
  if (options().entityRef) {
    sd.setEntityRef(Sd::entityRefNone);
  }
  if (options().externalEntityRef) {
    sd.setEntityRef(Sd::entityRefInternal);
  }
  if (options().integral) {
    sd.setIntegrallyStored(1);
  }
  if (options().noUnclosedTag) {
    sd.setBooleanFeature(Sd::fSTARTTAGUNCLOSED, 0);
    sd.setBooleanFeature(Sd::fENDTAGUNCLOSED, 0);
  }
  if (options().noNet)
    sd.setStartTagNetEnable(Sd::netEnableNo);
}

void Parser::giveUp()
{
  if (subdocLevel() > 0)	// FIXME might be subdoc if level == 0
    message(ParserMessages::subdocGiveUp);
  else
    message(ParserMessages::giveUp);
  allDone();
}

unsigned Parser::paramsSubdocLevel(const SgmlParser::Params &params)
{
  if (!params.parent)
    return 0;
  unsigned n = params.parent->parser_->subdocLevel();
  if (params.subdocReferenced)
    return n + 1;
  else
    return n;
}

Event *Parser::nextEvent()
{
  while (eventQueueEmpty()) {
    switch (phase()) {
    case noPhase:
      return 0;
    case initPhase:
      doInit();
      break;
    case prologPhase:
      doProlog();
      break;
    case declSubsetPhase:
      doDeclSubset();
      break;
    case instanceStartPhase:
      doInstanceStart();
      break;
    case contentPhase:
      doContent();
      break;
    }
  }
  return eventQueueGet();
}

void Parser::parseAll(EventHandler &handler,
		      const volatile sig_atomic_t *cancelPtr)
{
  while (!eventQueueEmpty())
    eventQueueGet()->handle(handler);
  // FIXME catch exceptions and reset handler.
  setHandler(&handler, cancelPtr);
  for (;;) {
    switch (phase()) {
    case noPhase:
      unsetHandler();
      return;
    case initPhase:
      doInit();
      break;
    case prologPhase:
      doProlog();
      break;
    case declSubsetPhase:
      doDeclSubset();
      break;
    case instanceStartPhase:
      doInstanceStart();
      break;
    case contentPhase:
      doContent();
      break;
    }
  }
}

#ifdef SP_NAMESPACE
}
#endif
