// Copyright (c) 1994, 1995, 1997 James Clark
// See the file COPYING for copying permission.

#include "splib.h"
#include "Parser.h"
#include "macros.h"
#include "SdFormalError.h"
#include "MessageBuilder.h"
#include "ParserMessages.h"
#include "MessageArg.h"
#include "CharsetRegistry.h"
#include "ISetIter.h"
#include "token.h"
#include "TokenMessageArg.h"
#include "constant.h"
#include "SdText.h"
#include "NumericCharRefOrigin.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class CharSwitcher {
public:
  CharSwitcher();
  void addSwitch(WideChar from, WideChar to);
  SyntaxChar subst(WideChar c);
  size_t nSwitches() const;
  Boolean switchUsed(size_t i) const;
  WideChar switchFrom(size_t i) const;
  WideChar switchTo(size_t i) const;
private:
  Vector<PackedBoolean> switchUsed_;
  Vector<WideChar> switches_;
};

// Information about the SGML declaration being built.

struct SdBuilder {
  SdBuilder();
  void addFormalError(const Location &, const MessageType1 &, const StringC &);
  Ptr<Sd> sd;
  Ptr<Syntax> syntax;
  CharsetDecl syntaxCharsetDecl;
  CharsetInfo syntaxCharset;
  CharSwitcher switcher;
  Boolean externalSyntax;
  Boolean enr;
  Boolean www;
  Boolean valid;
  Boolean external;
  IList<SdFormalError> formalErrorList;
};

class CharsetMessageArg : public MessageArg {
public:
  CharsetMessageArg(const ISet<WideChar> &set);
  MessageArg *copy() const;
  void append(MessageBuilder &) const;
private:
  ISet<WideChar> set_;
};

struct SdParam {
  typedef unsigned char Type;
  enum {
    invalid,
    eE,
    minimumLiteral,
    mdc,
    minus,
    number,
    capacityName,
    name,
    paramLiteral,
    systemIdentifier,
    generalDelimiterName,
    referenceReservedName,
    quantityName,
    reservedName		// Sd::ReservedName is added to this
  };
  Type type;
  StringC token;
  Text literalText;
  String<SyntaxChar> paramLiteralText;
  union {
    Number n;
    Sd::Capacity capacityIndex;
    Syntax::Quantity quantityIndex;
    Syntax::ReservedName reservedNameIndex;
    Syntax::DelimGeneral delimGeneralIndex;
  };
};

class AllowedSdParams {
public:
  AllowedSdParams(SdParam::Type,
		  SdParam::Type = SdParam::invalid,
		  SdParam::Type = SdParam::invalid,
		  SdParam::Type = SdParam::invalid,
		  SdParam::Type = SdParam::invalid,
		  SdParam::Type = SdParam::invalid);
  Boolean param(SdParam::Type) const;
  SdParam::Type get(int i) const;
private:
  enum { maxAllow = 6 };
  SdParam::Type allow_[maxAllow];
};

class AllowedSdParamsMessageArg : public MessageArg {
public:
  AllowedSdParamsMessageArg(const AllowedSdParams &allow,
			    const ConstPtr<Sd> &sd);
  MessageArg *copy() const;
  void append(MessageBuilder &) const;
private:
  AllowedSdParams allow_;
  ConstPtr<Sd> sd_;
};

struct StandardSyntaxSpec {
  struct AddedFunction {
    const char *name;
    Syntax::FunctionClass functionClass;
    SyntaxChar syntaxChar;
  };
  const AddedFunction *addedFunction;
  size_t nAddedFunction;
  Boolean shortref;
};

static StandardSyntaxSpec::AddedFunction coreFunctions[] = {
  { "TAB", Syntax::cSEPCHAR, 9 },
};

static StandardSyntaxSpec coreSyntax = {
  coreFunctions, SIZEOF(coreFunctions), 0
};

static StandardSyntaxSpec refSyntax = {
  coreFunctions, SIZEOF(coreFunctions), 1
};

void Parser::doInit()
{
  if (cancelled()) {
    allDone();
    return;
  }
  // When document entity doesn't exist, don't give any errors
  // other than the cannot open error.
  if (currentInput()->get(messenger()) == InputSource::eE) {
    if (currentInput()->accessError()) {
      allDone();
      return;
    }
  }
  else
    currentInput()->ungetToken();
  const CharsetInfo &initCharset = sd().internalCharset();
  ISet<WideChar> missing;
  findMissingMinimum(initCharset, missing);
  if (!missing.isEmpty()) {
    message(ParserMessages::sdMissingCharacters, CharsetMessageArg(missing));
    giveUp();
    return;
  }
  Boolean found = 0;
  StringC systemId;
  if (scanForSgmlDecl(initCharset)) {
    if (options().warnExplicitSgmlDecl)
      message(ParserMessages::explicitSgmlDecl);
    found = 1;
  }
  else {
    currentInput()->ungetToken();
    if (subdocLevel() > 0)
      return; // will use parent Sd 
    if (entityCatalog().sgmlDecl(initCharset, messenger(), sysid_, systemId)) {
      InputSource *in = entityManager().open(systemId,
					     sd().docCharset(),
					     InputSourceOrigin::make(),
					     0,
					     messenger());
      if (in) {
	pushInput(in);
	if (scanForSgmlDecl(initCharset))
	  found = 1;
	else {
	  message(ParserMessages::badDefaultSgmlDecl);
	  popInputStack();
	}
      }
    }
  }
  if (found) {
    if (startMarkup(eventsWanted().wantPrologMarkup(), currentLocation())) {
      size_t nS = currentInput()->currentTokenLength() - 6;
      for (size_t i = 0; i < nS; i++)
	currentMarkup()->addS(currentInput()->currentTokenStart()[i]);
      currentMarkup()->addDelim(Syntax::dMDO);
      currentMarkup()->addSdReservedName(Sd::rSGML,
					currentInput()->currentTokenStart()
					+ (currentInput()->currentTokenLength() - 4),
					4);
    }
    Syntax *syntaxp = new Syntax(sd());
    CharSwitcher switcher;
    if (!setStandardSyntax(*syntaxp, refSyntax, sd().internalCharset(), switcher, 1)) {
      giveUp();
      return;
    }
    syntaxp->implySgmlChar(sd());
    setSyntax(syntaxp);
    compileSdModes();
    ConstPtr<Sd> refSd(sdPointer());
    ConstPtr<Syntax> refSyntax(syntaxPointer());
    if (!parseSgmlDecl()) {
      giveUp();
      return;
    }
    // queue an SGML declaration event
    eventHandler().sgmlDecl(new (eventAllocator())
			    SgmlDeclEvent(sdPointer(),
					  syntaxPointer(),
					  instanceSyntaxPointer(),
					  refSd,
					  refSyntax,
					  currentInput()->nextIndex(),
					  systemId,
					  markupLocation(),
					  currentMarkup()));
    if (inputLevel() == 2) {
      // FIXME perhaps check for junk after SGML declaration
      popInputStack();
    }
  }
  else {
    if (!implySgmlDecl()) {
      giveUp();
      return;
    }
    currentInput()->willNotSetDocCharset();
    // queue an SGML declaration event
    eventHandler().sgmlDecl(new (eventAllocator())
			    SgmlDeclEvent(sdPointer(),
					  syntaxPointer()));
  }
						      
  // Now we have sd and syntax set up, prepare to parse the prolog.
  compilePrologModes();
  setPhase(prologPhase);
}

Boolean Parser::implySgmlDecl()
{
  Syntax *syntaxp = new Syntax(sd());
  const StandardSyntaxSpec *spec;
  if (options().shortref)
    spec = &refSyntax;
  else
    spec = &coreSyntax;
  CharSwitcher switcher;
  if (!setStandardSyntax(*syntaxp, *spec, sd().internalCharset(), switcher, 0))
    return 0;
  syntaxp->implySgmlChar(sd());
  for (int i = 0; i < Syntax::nQuantity; i++)
    syntaxp->setQuantity(i, options().quantity[i]);
  setSyntax(syntaxp);
  return 1;
}

Boolean Parser::setStandardSyntax(Syntax &syn,
				  const StandardSyntaxSpec &spec,
				  const CharsetInfo &internalCharset,
				  CharSwitcher &switcher,
				  Boolean www)
{
  static UnivCharsetDesc::Range syntaxCharsetRanges[] = {
    { 0, 128, 0 },
  };
  static UnivCharsetDesc syntaxCharsetDesc(syntaxCharsetRanges,
					   SIZEOF(syntaxCharsetRanges));
  static CharsetInfo syntaxCharset(syntaxCharsetDesc);

  Boolean valid = 1;
  if (!checkSwitches(switcher, syntaxCharset))
    valid = 0;
  size_t i;
  for (i = 0; i < switcher.nSwitches(); i++)
    if (switcher.switchTo(i) >= 128)
      message(ParserMessages::switchNotInCharset,
	      NumberMessageArg(switcher.switchTo(i)));
  static const Char shunchar[] = {
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
    127, 255
    };
  
  for (i = 0; i < SIZEOF(shunchar); i++)
    syn.addShunchar(shunchar[i]);
  syn.setShuncharControls();
  static Syntax::StandardFunction standardFunctions[3] = {
    Syntax::fRE, Syntax::fRS, Syntax::fSPACE
  };
  static SyntaxChar functionChars[3] = { 13, 10, 32 };
  for (i = 0; i < 3; i++) {
    Char docChar;
    if (translateSyntax(switcher,
			syntaxCharset,
			internalCharset,
			functionChars[i],
			docChar)
	&& checkNotFunction(syn, docChar))
      syn.setStandardFunction(standardFunctions[i], docChar);
    else
      valid = 0;
  }
  for (i = 0; i < spec.nAddedFunction; i++) {
    Char docChar;
    if (translateSyntax(switcher,
			syntaxCharset,
			internalCharset,
			spec.addedFunction[i].syntaxChar,
			docChar)
	&& checkNotFunction(syn, docChar))
      syn.addFunctionChar(internalCharset.execToDesc(spec.addedFunction[i].name),
			  spec.addedFunction[i].functionClass,
			  docChar);
    else
      valid = 0;
  }
  
  static SyntaxChar nameChars[2] = { 45, 46 }; // '-' '.'
  ISet<Char> nameCharSet;
  for (i = 0; i < 2; i++) {
    Char docChar;
    if (translateSyntax(switcher,
			syntaxCharset,
			internalCharset,
			nameChars[i],
			docChar))
	nameCharSet.add(docChar);
    else
      valid = 0;
  }
  if (!checkNmchars(nameCharSet, syn))
    valid = 0;
  else
    syn.addNameCharacters(nameCharSet);
  syn.setNamecaseGeneral(1);
  syn.setNamecaseEntity(0);
  if (!setRefDelimGeneral(syn, syntaxCharset, internalCharset, switcher))
    valid = 0;
  setRefNames(syn, internalCharset, www);
  syn.enterStandardFunctionNames();
  if (spec.shortref
      && !addRefDelimShortref(syn, syntaxCharset, internalCharset, switcher))
    valid = 0;
  return valid;
}

Boolean Parser::setRefDelimGeneral(Syntax &syntax,
				   const CharsetInfo &syntaxCharset,
				   const CharsetInfo &internalCharset,
				   CharSwitcher &switcher)
{
  // Column 3 from Figure 3
  static const char delims[][2] = {
    { 38 },
    { 45, 45 },
    { 38, 35 },
    { 93 },
    { 91 },
    { 93 },
    { 91 },
    { 38 },
    { 60, 47 },
    { 41 },
    { 40 },
    { 0 }, // HCRO
    { 34 },
    { 39 },
    { 62 },
    { 60, 33 },
    { 45 },
    { 93, 93 },
    { 47 },
    { 47 }, // NESTC
    { 63 },
    { 124 },
    { 37 },
    { 62 },
    { 60, 63 },
    { 43 },
    { 59 },
    { 42 },
    { 35 },
    { 44 },
    { 60 },
    { 62 },
    { 61 },
  };
  Boolean valid = 1;
  ISet<WideChar> missing;
  for (int i = 0; i < Syntax::nDelimGeneral; i++)
    if (syntax.delimGeneral(i).size() == 0) {
      StringC delim;
      size_t j;
      for (j = 0; j < 2 && delims[i][j] != '\0'; j++) {
	UnivChar univChar = translateUniv(delims[i][j], switcher,
					  syntaxCharset);
	Char c;
	if (univToDescCheck(internalCharset, univChar, c))
	  delim += c;
	else {
	  missing += univChar;
	  valid = 0;
	}
      }
      if (delim.size() == j) {
	if (checkGeneralDelim(syntax, delim))
	  syntax.setDelimGeneral(i, delim);
	else
	  valid = 0;
      }
    }
  if (!missing.isEmpty())
    message(ParserMessages::missingSignificant646, CharsetMessageArg(missing));
  return valid;
}

void Parser::setRefNames(Syntax &syntax, const CharsetInfo &internalCharset,
			 Boolean www)
{
  static const char *const referenceNames[] = {
    "ALL",
    "ANY",
    "ATTLIST",
    "CDATA",
    "CONREF",
    "CURRENT",
    "DATA",
    "DEFAULT",
    "DOCTYPE",
    "ELEMENT",
    "EMPTY",
    "ENDTAG",
    "ENTITIES",
    "ENTITY",
    "FIXED",
    "ID",
    "IDLINK",
    "IDREF",
    "IDREFS",
    "IGNORE",
    "IMPLICIT",
    "IMPLIED",
    "INCLUDE",
    "INITIAL",
    "LINK",
    "LINKTYPE",
    "MD",
    "MS",
    "NAME",
    "NAMES",
    "NDATA",
    "NMTOKEN",
    "NMTOKENS",
    "NOTATION",
    "NUMBER",
    "NUMBERS",
    "NUTOKEN",
    "NUTOKENS",
    "O",
    "PCDATA",
    "PI",
    "POSTLINK",
    "PUBLIC",
    "RCDATA",
    "RE",
    "REQUIRED",
    "RESTORE",
    "RS",
    "SDATA",
    "SHORTREF",
    "SIMPLE",
    "SPACE",
    "STARTTAG",
    "SUBDOC",
    "SYSTEM",
    "TEMP",
    "USELINK",
    "USEMAP"
    };
  for (int i = 0; i < Syntax::nNames; i++) {
    switch (i) {
    case Syntax::rDATA:
    case Syntax::rIMPLICIT:
      if (!www)
	break;
      // fall through
    case Syntax::rALL:
      if (!www && options().errorAfdr)
	break;
      // fall through
    default:
      {
	StringC docName(internalCharset.execToDesc(referenceNames[i]));
	Syntax::ReservedName tem;
        if (syntax.lookupReservedName(docName, &tem))
	  message(ParserMessages::nameReferenceReservedName,
	          StringMessageArg(docName));
        if (syntax.reservedName(Syntax::ReservedName(i)).size() == 0)
	  syntax.setName(i, docName);
        break;
      }
    }
  }
}

Boolean Parser::addRefDelimShortref(Syntax &syntax,
				    const CharsetInfo &syntaxCharset,
				    const CharsetInfo &internalCharset,
				    CharSwitcher &switcher)
{
  // Column 2 from Figure 4
  static const char delimShortref[][3] = {
    { 9 },
    { 13 },
    { 10 },
    { 10, 66 },
    { 10, 13 },
    { 10, 66, 13 },
    { 66, 13 },
    { 32 },
    { 66, 66 },
    { 34 },
    { 35 },
    { 37 },
    { 39 },
    { 40 },
    { 41 },
    { 42 },
    { 43 },
    { 44 },
    { 45 },
    { 45, 45 },
    { 58 },
    { 59 },
    { 61 },
    { 64 },
    { 91 },
    { 93 },
    { 94 },
    { 95 },
    { 123 },
    { 124 },
    { 125 },
    { 126 },
  };
  ISet<WideChar> missing;

  for (size_t i = 0; i < SIZEOF(delimShortref); i++) {
    StringC delim;
    
    size_t j;
    for (j = 0; j < 3 && delimShortref[i][j] != '\0'; j++) {
      Char c;
      UnivChar univChar = translateUniv(delimShortref[i][j], switcher,
					syntaxCharset);
      if (univToDescCheck(internalCharset, univChar, c))
	delim += c;
      else
	missing += univChar;
    }
    if (delim.size() == j) {
      if (switcher.nSwitches() > 0 && syntax.isValidShortref(delim))
	message(ParserMessages::duplicateDelimShortref,
		StringMessageArg(delim));
      else
	syntax.addDelimShortref(delim, internalCharset);
    }
  }
  if (!missing.isEmpty())
    message(ParserMessages::missingSignificant646, CharsetMessageArg(missing));
  return 1;
}

// Determine whether the document starts with an SGML declaration.
// There is no current syntax at this point.

Boolean Parser::scanForSgmlDecl(const CharsetInfo &initCharset)
{
  Char rs;
  if (!univToDescCheck(initCharset, UnivCharsetDesc::rs, rs))
    return 0;
  Char re;
  if (!univToDescCheck(initCharset, UnivCharsetDesc::re, re))
    return 0;
  Char space;
  if (!univToDescCheck(initCharset, UnivCharsetDesc::space, space))
    return 0;
  Char tab;
  if (!univToDescCheck(initCharset, UnivCharsetDesc::tab, tab))
    return 0;
  InputSource *in = currentInput();
  Xchar c = in->get(messenger());
  while (c == rs || c == space || c == re || c == tab)
    c = in->tokenChar(messenger());
  if (c != initCharset.execToDesc('<'))
    return 0;
  if (in->tokenChar(messenger()) != initCharset.execToDesc('!'))
    return 0;
  c = in->tokenChar(messenger());
  if (c != initCharset.execToDesc('S')
      && c != initCharset.execToDesc('s'))
    return 0;
  c = in->tokenChar(messenger());
  if (c != initCharset.execToDesc('G')
      && c != initCharset.execToDesc('g'))
    return 0;
  c = in->tokenChar(messenger());
  if (c != initCharset.execToDesc('M')
      && c != initCharset.execToDesc('m'))
    return 0;
  c = in->tokenChar(messenger());
  if (c != initCharset.execToDesc('L')
      && c != initCharset.execToDesc('l'))
    return 0;
  c = in->tokenChar(messenger());
  // Don't recognize this if SGML is followed by a name character.
  if (c == InputSource::eE)
    return 1;
  in->endToken(in->currentTokenLength() - 1);
  if (c == initCharset.execToDesc('-'))
    return 0;
  if (c == initCharset.execToDesc('.'))
    return 0;
  UnivChar univ;
  if (!initCharset.descToUniv(c, univ)) 
    return 1;
  if (UnivCharsetDesc::a <= univ && univ < UnivCharsetDesc::a + 26)
    return 0;
  if (UnivCharsetDesc::A <= univ && univ < UnivCharsetDesc::A + 26)
    return 0;
  if (UnivCharsetDesc::zero <= univ && univ < UnivCharsetDesc::zero + 10)
    return 0;
  return 1;
}
	    
void Parser::findMissingMinimum(const CharsetInfo &charset,
				ISet<WideChar> &missing)
{
  Char to;
  size_t i;
  for (i = 0; i < 26; i++) {
    if (!univToDescCheck(charset, UnivCharsetDesc::A + i, to))
      missing += UnivCharsetDesc::A + i;
    if (!univToDescCheck(charset, UnivCharsetDesc::a + i, to))
      missing += UnivCharsetDesc::a + i;
  }
  for (i = 0; i < 10; i++) {
    Char to;
    if (!univToDescCheck(charset, UnivCharsetDesc::zero + i, to))
      missing += UnivCharsetDesc::zero + i;
  }
  static const UnivChar special[] = {
    39, 40, 41, 43, 44, 45, 46, 47, 58, 61, 63
    };

  for (i = 0; i < SIZEOF(special); i++)
    if (!univToDescCheck(charset, special[i], to))
      missing += special[i];
}


Boolean Parser::parseSgmlDecl()
{
  SdParam parm;
  SdBuilder sdBuilder;

  if (!parseSdParam(AllowedSdParams(SdParam::minimumLiteral, SdParam::name), parm))
    return 0;
  if (parm.type == SdParam::name) {
    sdBuilder.external = 1;
    Location loc(currentLocation());
    StringC name;
    parm.token.swap(name);
    ExternalId externalId;
    if (!sdParseSgmlDeclRef(sdBuilder, parm, externalId))
      return 0;
    ExternalEntity *entity
      = new ExternalTextEntity(name, EntityDecl::sgml, loc, externalId);
    ConstPtr<Entity> entityPtr(entity);
    entity->generateSystemId(*this);
    if (entity->externalId().effectiveSystemId().size() == 0) {
      message(ParserMessages::cannotGenerateSystemIdSgml);
      return 0;
    }
    Ptr<EntityOrigin> origin(EntityOrigin::make(internalAllocator(), entityPtr, loc));
    if (currentMarkup())
      currentMarkup()->addEntityStart(origin);
    pushInput(entityManager().open(entity->externalId().effectiveSystemId(),
		                   sd().docCharset(),
				   origin.pointer(),
				   0,
				   messenger()));
    if (!parseSdParam(AllowedSdParams(SdParam::minimumLiteral), parm))
      return 0;
  }
  StringC version(sd().execToInternal("ISO 8879:1986"));
  StringC enrVersion(sd().execToInternal("ISO 8879:1986 (ENR)"));
  StringC wwwVersion(sd().execToInternal("ISO 8879:1986 (WWW)"));
  if (parm.literalText.string() == enrVersion)
    sdBuilder.enr = 1;
  else if (parm.literalText.string() == wwwVersion) {
    sdBuilder.enr = 1;
    sdBuilder.www = 1;
  }
  else if (parm.literalText.string() != version)
    message(ParserMessages::standardVersion,
	    StringMessageArg(parm.literalText.string()));
  if (sdBuilder.external && !sdBuilder.www)
    message(ParserMessages::sgmlDeclRefRequiresWww);
  sdBuilder.sd = new Sd(entityManagerPtr());
  if (sdBuilder.www)
    sdBuilder.sd->setWww(1);
  typedef Boolean (Parser::*SdParser)(SdBuilder &, SdParam &);
  static SdParser parsers[] = {
    &Parser::sdParseDocumentCharset,
    &Parser::sdParseCapacity,
    &Parser::sdParseScope,
    &Parser::sdParseSyntax,
    &Parser::sdParseFeatures,
    &Parser::sdParseAppinfo,
    &Parser::sdParseSeealso,
  };
  for (size_t i = 0; i < SIZEOF(parsers); i++) {
    if (!(this->*(parsers[i]))(sdBuilder, parm))
      return 0;
    if (!sdBuilder.valid)
      return 0;
  }
  setSdOverrides(*sdBuilder.sd);
  if (sdBuilder.sd->formal()) {
    while (!sdBuilder.formalErrorList.empty()) {
      SdFormalError *p = sdBuilder.formalErrorList.get();
      ParserState *state = this; // work around lcc 3.0 bug
      p->send(*state);
      delete p;
    }
  }
  setSd(sdBuilder.sd.pointer());
  currentInput()->setDocCharset(sd().docCharset(), entityManager().charset());
  if (sdBuilder.sd->scopeInstance()) {
    Syntax *proSyntax = new Syntax(sd());
    CharSwitcher switcher;
    setStandardSyntax(*proSyntax, refSyntax, sd().internalCharset(), switcher, sdBuilder.www);
    proSyntax->setSgmlChar(*sdBuilder.syntax->charSet(Syntax::sgmlChar));
    ISet<WideChar> invalidSgmlChar;
    proSyntax->checkSgmlChar(*sdBuilder.sd,
			     sdBuilder.syntax.pointer(),
			     1,  // get results in document character set
			     invalidSgmlChar);
    sdBuilder.syntax->checkSgmlChar(*sdBuilder.sd,
				    proSyntax,
				    1, // get results in document character set
				    invalidSgmlChar);
    if (!invalidSgmlChar.isEmpty())
      message(ParserMessages::invalidSgmlChar, CharsetMessageArg(invalidSgmlChar));
    setSyntaxes(proSyntax, sdBuilder.syntax.pointer());
  }
  else
    setSyntax(sdBuilder.syntax.pointer());
  if (syntax().multicode())
    currentInput()->setMarkupScanTable(syntax().markupScanTable());
  return 1;
}

Boolean Parser::sdParseSgmlDeclRef(SdBuilder &sdBuilder, SdParam &parm,
				   ExternalId &id)
{
  id.setLocation(currentLocation());
  if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rSYSTEM,
                                    SdParam::reservedName + Sd::rPUBLIC,
				    SdParam::mdc),
		    parm))
    return 0;
  if (parm.type == SdParam::mdc)
    return 1;
  if (parm.type == SdParam::reservedName + Sd::rPUBLIC) {
    if (!parseSdParam(AllowedSdParams(SdParam::minimumLiteral), parm))
      return 0;
    const MessageType1 *err;
    const MessageType1 *err1;
    PublicId::TextClass textClass;
    if (id.setPublic(parm.literalText, sd().internalCharset(), syntax().space(), err, err1) != PublicId::fpi)
      sdBuilder.addFormalError(currentLocation(), *err, id.publicId()->string());
    else if (id.publicId()->getTextClass(textClass)
	     && textClass != PublicId::SD)
      sdBuilder.addFormalError(currentLocation(),
			       ParserMessages::sdTextClass,
			       id.publicId()->string());
  }
  if (!parseSdParam(AllowedSdParams(SdParam::systemIdentifier, SdParam::mdc), parm))
    return 0;
  if (parm.type == SdParam::mdc)
    return 1;
  id.setSystem(parm.literalText);
  return parseSdParam(AllowedSdParams(SdParam::mdc), parm);
}

Boolean Parser::sdParseDocumentCharset(SdBuilder &sdBuilder, SdParam &parm)
{
  if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rCHARSET),
		    parm))
    return 0;
  if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rBASESET),
		    parm))
    return 0;
  CharsetDecl decl;
  UnivCharsetDesc desc;
  if (!sdParseCharset(sdBuilder, parm, 1, decl, desc))
    return 0;
  ISet<WideChar> missing;
  findMissingMinimum(desc, missing);
  if (!missing.isEmpty()) {
    message(ParserMessages::missingMinimumChars,
	    CharsetMessageArg(missing));
    return 0;
  }
  ISet<Char> sgmlChar;
  decl.usedSet(sgmlChar);
  sdBuilder.sd->setDocCharsetDesc(desc);
  sdBuilder.sd->setDocCharsetDecl(decl);
  sdBuilder.syntax = new Syntax(*sdBuilder.sd);
  if (sd().internalCharsetIsDocCharset())
    sdBuilder.syntax->setSgmlChar(sgmlChar);
  else {
    ISet<Char> internalSgmlChar;
    translateDocSet(sdBuilder.sd->docCharset(), sdBuilder.sd->internalCharset(),
                    sgmlChar, internalSgmlChar);
    sdBuilder.syntax->setSgmlChar(internalSgmlChar);
  }
  return 1;
}

void Parser::translateDocSet(const CharsetInfo &fromCharset,
			     const CharsetInfo &toCharset,
			     const ISet<Char> &fromSet,
			     ISet<Char> &toSet)
{
  ISetIter<Char> iter(fromSet);
  Char min, max;
  while (iter.next(min, max)) {
    do {
      UnivChar univChar;
      Char internalChar;
      WideChar count2, alsoMax;
      if (!fromCharset.descToUniv(min, univChar, alsoMax)) {
	if (alsoMax >= max)
	  break;
	min = alsoMax;
      }
      else {
	  // FIXME better not to use univToDescCheck here
	  // Maybe OK if multiple internal chars corresponding to doc char
	int nMap = univToDescCheck(toCharset, univChar, internalChar, count2);
	if (alsoMax > max)
	  alsoMax = max;
	if (alsoMax - min > count2 - 1)
	  alsoMax = min + (count2 - 1);
	if (nMap)
	  toSet.addRange(internalChar, internalChar + (alsoMax - min));
	min = alsoMax;
      }
    } while (min++ != max);
  }
}

Boolean Parser::sdParseCharset(SdBuilder &sdBuilder,
			       SdParam &parm,
			       Boolean isDocument,
			       CharsetDecl &decl,
			       UnivCharsetDesc &desc)
{
  decl.clear();
  ISet<WideChar> multiplyDeclared;
  // This is for checking whether the syntax reference character set
  // is ISO 646 when SCOPE is INSTANCE.
  Boolean maybeISO646 = 1;
  do {
    if (!parseSdParam(AllowedSdParams(SdParam::minimumLiteral), parm))
      return 0;
    UnivCharsetDesc baseDesc;
    PublicId id;
    Boolean found;
    PublicId::TextClass textClass;
    const MessageType1 *err;
    const MessageType1 *err1;
    if (id.init(parm.literalText, sd().internalCharset(), syntax().space(), err, err1) != PublicId::fpi)
      sdBuilder.addFormalError(currentLocation(),
			       *err,
			       id.string());
    else if (id.getTextClass(textClass)
	     && textClass != PublicId::CHARSET)
      sdBuilder.addFormalError(currentLocation(),
			       ParserMessages::basesetTextClass,
			       id.string());
    Boolean givenError;
    if (referencePublic(id, PublicId::CHARSET, givenError))
      found = sdParseExternalCharset(*sdBuilder.sd, baseDesc);
    else if (!givenError) {
      found = 0;
      PublicId::OwnerType ownerType;
      if (id.getOwnerType(ownerType) && ownerType == PublicId::ISO) {
	StringC sequence;
	if (id.getDesignatingSequence(sequence)) {
	  CharsetRegistry::ISORegistrationNumber number
	   = CharsetRegistry::getRegistrationNumber(sequence, sd().internalCharset());
	  if (number != CharsetRegistry::UNREGISTERED) {
	    Owner<CharsetRegistry::Iter> iter(CharsetRegistry::makeIter(number));
	    if (iter) {
	      found = 1;
	      WideChar min;
	      WideChar max;
	      UnivChar univ;
	      while (iter->next(min, max, univ))
		baseDesc.addRange(min, max, univ);
	    }
	  }
	}
      }
      if (!found)
	message(ParserMessages::unknownBaseset, StringMessageArg(id.string()));
    }
    else
      found = 0;
    if (!found)
      maybeISO646 = 0;
    decl.addSection(id);
    if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rDESCSET),
		      parm))
      return 0;
    if (!parseSdParam(AllowedSdParams(SdParam::number), parm))
      return 0;
    do {
      WideChar min = parm.n;
      if (!parseSdParam(AllowedSdParams(SdParam::number), parm))
	return 0;
      Number count = parm.n;
      Number adjCount;
      if (options().warnSgmlDecl && count == 0)
	message(ParserMessages::zeroNumberOfCharacters);
      decl.rangeDeclared(min, count, multiplyDeclared);
      if (isDocument
	  && count > 0
	  && (min > charMax || count - 1 > charMax - min)) {
	message(ParserMessages::documentCharMax, NumberMessageArg(charMax));
	adjCount = min > charMax ? 0 : 1 + (charMax - min);
	maybeISO646 = 0;
      }
      else
	adjCount = count;
      if (!parseSdParam(AllowedSdParams(SdParam::number,
					SdParam::minimumLiteral,
					SdParam::reservedName + Sd::rUNUSED),
			parm))
	return 0;
      switch (parm.type) {
      case SdParam::number:
	decl.addRange(min, count, parm.n);
	if (found && adjCount > 0) {
	  ISet<WideChar> baseMissing;
	  desc.addBaseRange(baseDesc, min, min + (adjCount - 1), parm.n,
			    baseMissing);
	  if (!baseMissing.isEmpty() && options().warnSgmlDecl)
	    message(ParserMessages::basesetCharsMissing,
		    CharsetMessageArg(baseMissing));
	}
	break;
      case SdParam::reservedName + Sd::rUNUSED:
	decl.addRange(min, count);
	break;
      case SdParam::minimumLiteral:
	{
	  UnivChar c = charNameToUniv(*sdBuilder.sd, parm.literalText.string());
	  if (adjCount > 256) {
	    message(ParserMessages::tooManyCharsMinimumLiteral);
	    adjCount = 256;
	  }
	  for (Number i = 0; i < adjCount; i++)
	    desc.addRange(min + i, min + i, c);
	}
	maybeISO646 = 0;
        decl.addRange(min, count, parm.literalText.string());
        break;
      default:
        CANNOT_HAPPEN();			 
      }
      SdParam::Type follow = (isDocument
			      ? SdParam::reservedName + Sd::rCAPACITY
			      : SdParam::reservedName + Sd::rFUNCTION);
      if (!parseSdParam(AllowedSdParams(SdParam::number,
					SdParam::reservedName + Sd::rBASESET,
					follow),
			parm))
	return 0;
	
    } while (parm.type == SdParam::number);
  } while (parm.type == SdParam::reservedName + Sd::rBASESET);
  if (!multiplyDeclared.isEmpty())
    message(ParserMessages::duplicateCharNumbers,
	    CharsetMessageArg(multiplyDeclared));
  ISet<WideChar> declaredSet;
  decl.declaredSet(declaredSet);
  ISetIter<WideChar> iter(declaredSet);
  WideChar min, max, lastMax;
  if (iter.next(min, max)) {
    ISet<WideChar> holes;
    lastMax = max;
    while (iter.next(min, max)) {
      if (min - lastMax > 1)
	holes.addRange(lastMax + 1, min - 1);
      lastMax = max;
    }
    if (!holes.isEmpty())
      message(ParserMessages::codeSetHoles, CharsetMessageArg(holes));
  }
  if (!isDocument && sdBuilder.sd->scopeInstance()) {
    // If scope is INSTANCE, syntax reference character set
    // must be same as reference.
    UnivCharsetDescIter iter(desc);
    WideChar descMin, descMax;
    UnivChar univMin;
    Char nextDescMin = 0;
    while (maybeISO646) {
      if (!iter.next(descMin, descMax, univMin)) {
	if (nextDescMin != 128)
	  maybeISO646 = 0;
	break;
      }
      if (descMin != nextDescMin || univMin != descMin)
	maybeISO646 = 0;
      nextDescMin = descMax + 1;
    }
    if (!maybeISO646)
      message(ParserMessages::scopeInstanceSyntaxCharset);
  }
  return 1;
}

Boolean Parser::sdParseExternalCharset(Sd &sd, UnivCharsetDesc &desc)
{
  SdParam parm;
  for (;;) {
    if (!parseSdParam(AllowedSdParams(SdParam::number, SdParam::eE),
		     parm))
      break;
    if (parm.type == SdParam::eE)
      return 1;
    WideChar min = parm.n;
    if (!parseSdParam(AllowedSdParams(SdParam::number), parm))
      break;
    Number count = parm.n;
    if (!parseSdParam(AllowedSdParams(SdParam::number,
				      SdParam::minimumLiteral,
				      SdParam::reservedName + Sd::rUNUSED),
		     parm))
      break;
    if (parm.type == SdParam::number) {
      if (count > 0)
	desc.addRange(min, min + (count - 1), parm.n);
    }
    else if (parm.type == SdParam::minimumLiteral) {
      UnivChar c = charNameToUniv(sd, parm.literalText.string());
      if (count > 256) {
	message(ParserMessages::tooManyCharsMinimumLiteral);
	count = 256;
      }
      for (Number i = 0; i < count; i++)
	desc.addRange(min + i, min + i, c);
    }
  }
  popInputStack();
  return 0;
}

UnivChar Parser::charNameToUniv(Sd &sd, const StringC &name)
{
  UnivChar univ;
  if (entityCatalog().lookupChar(name, sd.internalCharset(), messenger(), univ))
    return univ;
  else
    return sd.nameToUniv(name);
}

Boolean Parser::sdParseCapacity(SdBuilder &sdBuilder, SdParam &parm)
{
  if (!parseSdParam(sdBuilder.www
                    ? AllowedSdParams(SdParam::reservedName + Sd::rNONE,
				      SdParam::reservedName + Sd::rPUBLIC,
                                      SdParam::reservedName + Sd::rSGMLREF)
		    : AllowedSdParams(SdParam::reservedName + Sd::rPUBLIC,
				      SdParam::reservedName + Sd::rSGMLREF),
		    parm))
    return 0;
#if _MSC_VER == 1100
  // Workaround for Visual C++ 5.0 bug
  int
#else
  Boolean
#endif
    pushed = 0;
  if (parm.type == SdParam::reservedName + Sd::rNONE)
    return parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rSCOPE),
			parm);
  if (parm.type == SdParam::reservedName + Sd::rPUBLIC) {
    if (!parseSdParam(AllowedSdParams(SdParam::minimumLiteral), parm))
      return 0;
    PublicId id;
    PublicId::TextClass textClass;
    const MessageType1 *err;
    const MessageType1 *err1;
    if (id.init(parm.literalText, sd().internalCharset(), syntax().space(), err, err1) != PublicId::fpi)
      sdBuilder.addFormalError(currentLocation(),
			       *err,
			       id.string());
    else if (id.getTextClass(textClass)
	     && textClass != PublicId::CAPACITY)
      sdBuilder.addFormalError(currentLocation(),
			       ParserMessages::capacityTextClass,
			       id.string());
    const StringC &str = id.string();
    if (str != sd().execToInternal("ISO 8879-1986//CAPACITY Reference//EN")
	&& str != sd().execToInternal("ISO 8879:1986//CAPACITY Reference//EN")) {
      Boolean givenError;
      if (referencePublic(id, PublicId::CAPACITY, givenError))
	pushed = 1;
      else if (!givenError)
	message(ParserMessages::unknownCapacitySet, StringMessageArg(str));
    }
    if (!pushed)
      return parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rSCOPE),
			  parm);
  }

  PackedBoolean capacitySpecified[Sd::nCapacity];
  int i;
  for (i = 0; i < Sd::nCapacity; i++)
    capacitySpecified[i] = 0;
  int final = pushed ? int(SdParam::eE) : SdParam::reservedName + Sd::rSCOPE;
  if (!parseSdParam(sdBuilder.www 
                    ? AllowedSdParams(SdParam::capacityName, final)
                    : AllowedSdParams(SdParam::capacityName), parm))
    return 0;
   while (parm.type == SdParam::capacityName) {
    Sd::Capacity capacityIndex = parm.capacityIndex;
    if (!parseSdParam(AllowedSdParams(SdParam::number), parm))
      return 0;
    
    if (!capacitySpecified[capacityIndex]) {
      sdBuilder.sd->setCapacity(capacityIndex, parm.n);
      capacitySpecified[capacityIndex] = 1;
    }
    else if (options().warnSgmlDecl)
      message(ParserMessages::duplicateCapacity,
	      StringMessageArg(sd().capacityName(i)));
    if (!parseSdParam(AllowedSdParams(SdParam::capacityName, final),
		      parm))
      return 0;
  } 
  Number totalcap = sdBuilder.sd->capacity(0);
  for (i = 1; i < Sd::nCapacity; i++)
    if (sdBuilder.sd->capacity(i) > totalcap)
      message(ParserMessages::capacityExceedsTotalcap,
	      StringMessageArg(sd().capacityName(i)));
  if (pushed)
    return parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rSCOPE),
			parm);
  return 1;
}

Boolean Parser::referencePublic(const PublicId &id,
				PublicId::TextClass entityType,
				Boolean &givenError)
{
  givenError = 0;
  StringC sysid;
  if (entityCatalog().lookupPublic(id.string(),
				   sd().internalCharset(),
				   messenger(),
				   sysid)) {
    Location loc = currentLocation();
    eventHandler().sgmlDeclEntity(new (eventAllocator())
				  SgmlDeclEntityEvent(id,
						      entityType,
						      sysid,
						      loc));
    Ptr<EntityOrigin> origin(EntityOrigin::make(internalAllocator(),
						ConstPtr<Entity>(0),
						loc));
    if (currentMarkup())
      currentMarkup()->addEntityStart(origin);
    InputSource *in = entityManager().open(sysid,
					   sd().docCharset(),
					   origin.pointer(),
					   0,
					   messenger());
    if (!in) {
      givenError = 1;
      return 0;
    }
    pushInput(in);
    return 1;
  }
  return 0;
}

Boolean Parser::sdParseScope(SdBuilder &sdBuilder, SdParam &parm)
{
  if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rINSTANCE,
				    SdParam::reservedName + Sd::rDOCUMENT),
		    parm))
    return 0;
  if (parm.type == SdParam::reservedName + Sd::rINSTANCE)
    sdBuilder.sd->setScopeInstance();
  return 1;
}

Boolean Parser::sdParseSyntax(SdBuilder &sdBuilder, SdParam &parm)
{
  if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rSYNTAX),
		    parm))
    return 0;
  if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rSHUNCHAR,
				    SdParam::reservedName + Sd::rPUBLIC),
		    parm))
    return 0;

  if (parm.type == SdParam::reservedName + Sd::rPUBLIC) {
    if (!parseSdParam(AllowedSdParams(SdParam::minimumLiteral), parm))
      return 0;
    PublicId id;
    const MessageType1 *err;
    const MessageType1 *err1;
    PublicId::TextClass textClass;
    if (id.init(parm.literalText, sd().internalCharset(), syntax().space(), err, err1) != PublicId::fpi)
      sdBuilder.addFormalError(currentLocation(),
			       *err,
			       id.string());
    else if (id.getTextClass(textClass)
	     && textClass != PublicId::SYNTAX)
      sdBuilder.addFormalError(currentLocation(),
			       ParserMessages::syntaxTextClass,
			       id.string());
    if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rFEATURES,
				      SdParam::reservedName + Sd::rSWITCHES),
		      parm))
      return 0;
    Vector<UnivChar> charSwitches;
    if (parm.type == SdParam::reservedName + Sd::rSWITCHES) {
      if (!parseSdParam(AllowedSdParams(SdParam::number), parm))
	return 0;
      for (;;) {
	SyntaxChar c = parm.n;
	if (!parseSdParam(AllowedSdParams(SdParam::number), parm))
	  return 0;
	sdBuilder.switcher.addSwitch(c, parm.n);
	if (!parseSdParam(AllowedSdParams(SdParam::number,
					  SdParam::reservedName
					  + Sd::rFEATURES),
			  parm))
	  return 0;
	if (parm.type != SdParam::number)
	  break;
      }
    }
    const StandardSyntaxSpec *spec = lookupSyntax(id);
    if (spec) {
      if (!setStandardSyntax(*sdBuilder.syntax,
			     *spec,
			     sdBuilder.sd->internalCharset(),
			     sdBuilder.switcher,
			     sdBuilder.www))
	sdBuilder.valid = 0;
    }
    else {
      Boolean givenError;
      if (referencePublic(id, PublicId::SYNTAX, givenError)) {
	sdBuilder.externalSyntax = 1;
	SdParam parm2;
	if (!parseSdParam(AllowedSdParams(SdParam::reservedName
					  + Sd::rSHUNCHAR),
			  parm2))
	  return 0;
	if (!sdParseExplicitSyntax(sdBuilder, parm2))
	  return 0;
      }
      else {
	if (!givenError)
	  message(ParserMessages::unknownPublicSyntax,
		  StringMessageArg(id.string()));
	sdBuilder.valid = 0;
      }
    }
  }
  else {
    if (!sdParseExplicitSyntax(sdBuilder, parm))
      return 0;
  }
  if (!sdBuilder.sd->scopeInstance()) {
    // we know the significant chars now
    ISet<WideChar> invalidSgmlChar;
    sdBuilder.syntax->checkSgmlChar(*sdBuilder.sd,
				    0,
				    1,
				    invalidSgmlChar);
    if (!invalidSgmlChar.isEmpty())
      message(ParserMessages::invalidSgmlChar, CharsetMessageArg(invalidSgmlChar));
  }
  checkSyntaxNames(*sdBuilder.syntax);
  checkSyntaxNamelen(*sdBuilder.syntax);
  checkSwitchesMarkup(sdBuilder.switcher);
  return 1;
}

Boolean Parser::sdParseExplicitSyntax(SdBuilder &sdBuilder,
				      SdParam &parm)
{
  typedef Boolean (Parser::*SdParser)(SdBuilder &, SdParam &);
  static SdParser parsers[] = {
    &Parser::sdParseShunchar,
    &Parser::sdParseSyntaxCharset,
    &Parser::sdParseFunction,
    &Parser::sdParseNaming,
    &Parser::sdParseDelim,
    &Parser::sdParseNames,
    &Parser::sdParseQuantity
    };
  for (size_t i = 0; i < SIZEOF(parsers); i++)
    if (!(this->*(parsers[i]))(sdBuilder, parm))
      return 0;
  return 1;
}

const StandardSyntaxSpec *Parser::lookupSyntax(const PublicId &id)
{
  PublicId::OwnerType ownerType;
  if (!id.getOwnerType(ownerType) || ownerType != PublicId::ISO)
    return 0;
  StringC str;
  if (!id.getOwner(str))
    return 0;
  if (str != sd().execToInternal("ISO 8879:1986")
      && str != sd().execToInternal("ISO 8879-1986"))
    return 0;
  PublicId::TextClass textClass;
  if (!id.getTextClass(textClass) || textClass != PublicId::SYNTAX)
    return 0;
  if (!id.getDescription(str))
    return 0;
  if (str == sd().execToInternal("Reference"))
    return &refSyntax;
  if (str == sd().execToInternal("Core"))
    return &coreSyntax;
  return 0;
}

Boolean Parser::sdParseSyntaxCharset(SdBuilder &sdBuilder, SdParam &parm)
{
  UnivCharsetDesc desc;
  if (!sdParseCharset(sdBuilder, parm, 0, sdBuilder.syntaxCharsetDecl, desc))
    return 0;
  sdBuilder.syntaxCharset.set(desc);
  checkSwitches(sdBuilder.switcher, sdBuilder.syntaxCharset);
  for (size_t i = 0; i < sdBuilder.switcher.nSwitches(); i++)
    if (!sdBuilder.syntaxCharsetDecl.charDeclared(sdBuilder.switcher.switchTo(i)))
      message(ParserMessages::switchNotInCharset,
	      NumberMessageArg(sdBuilder.switcher.switchTo(i)));
  ISet<WideChar> missing;
  findMissingMinimum(sdBuilder.syntaxCharset, missing);
  if (!missing.isEmpty())
    message(ParserMessages::missingMinimumChars,
	    CharsetMessageArg(missing));
  return 1;
}

Boolean Parser::sdParseShunchar(SdBuilder &sdBuilder, SdParam &parm)
{
  if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rNONE,
				    SdParam::reservedName + Sd::rCONTROLS,
				    SdParam::number), parm))
    return 0;
  if (parm.type == SdParam::reservedName + Sd::rNONE) {
    if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rBASESET),
		      parm))
      return 0;
    return 1;
  }
  if (parm.type == SdParam::reservedName + Sd::rCONTROLS)
    sdBuilder.syntax->setShuncharControls();
  else {
    if (parm.n <= charMax)
      sdBuilder.syntax->addShunchar(Char(parm.n));
  }
  for (;;) {
    if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rBASESET,
				      SdParam::number), parm))
      return 0;
    if (parm.type != SdParam::number)
      break;
    if (parm.n <= charMax)
      sdBuilder.syntax->addShunchar(Char(parm.n));
  }
  return 1;
}

Boolean Parser::sdParseFunction(SdBuilder &sdBuilder, SdParam &parm)
{
  static Sd::ReservedName standardNames[3] = {
    Sd::rRE, Sd::rRS, Sd::rSPACE
  };
  for (int i = 0; i < 3; i++) {
    if (!parseSdParam(AllowedSdParams(SdParam::reservedName
				      + standardNames[i]),
		      parm))
      return 0;
    if (!parseSdParam(AllowedSdParams(SdParam::number), parm))
      return 0;
    Char c;
    if (translateSyntax(sdBuilder, parm.n, c)) {
      if (checkNotFunction(*sdBuilder.syntax, c))
	sdBuilder.syntax->setStandardFunction(Syntax::StandardFunction(i), c);
      else
	sdBuilder.valid = 0;
    }
  }
  Boolean haveMsichar = 0;
  Boolean haveMsochar = 0;
  for (;;) {
    if (!parseSdParam(sdBuilder.externalSyntax
		      ? AllowedSdParams(SdParam::name, SdParam::paramLiteral)
		      : AllowedSdParams(SdParam::name),
		      parm))
      return 0;
    Boolean nameWasLiteral;
    size_t nameMarkupIndex;
    if (currentMarkup())
      nameMarkupIndex = currentMarkup()->size() - 1;
    Boolean invalidName = 0;
    StringC name;
    if (parm.type == SdParam::paramLiteral) {
      nameWasLiteral = 1;
      if (!translateSyntax(sdBuilder, parm.paramLiteralText, name))
	invalidName = 1;
    }
    else {
      parm.token.swap(name);
      nameWasLiteral = 0;
    }
    if (!parseSdParam(nameWasLiteral
		      ? AllowedSdParams(SdParam::reservedName + Sd::rFUNCHAR,
					SdParam::reservedName + Sd::rMSICHAR,
					SdParam::reservedName + Sd::rMSOCHAR,
					SdParam::reservedName + Sd::rMSSCHAR,
					SdParam::reservedName + Sd::rSEPCHAR)
		      : AllowedSdParams(SdParam::reservedName + Sd::rFUNCHAR,
					SdParam::reservedName + Sd::rMSICHAR,
					SdParam::reservedName + Sd::rMSOCHAR,
					SdParam::reservedName + Sd::rMSSCHAR,
					SdParam::reservedName + Sd::rSEPCHAR,
					SdParam::reservedName + Sd::rLCNMSTRT),
		      parm))
      return 0;
    if (parm.type == SdParam::reservedName + Sd::rLCNMSTRT) {
      if (name != sd().reservedName(Sd::rNAMING))
	message(ParserMessages::namingBeforeLcnmstrt,
		StringMessageArg(name));
      else if (currentMarkup())
	currentMarkup()->changeToSdReservedName(nameMarkupIndex, Sd::rNAMING);
      break;
    }
    if (!nameWasLiteral) {
      StringC tem;
      name.swap(tem);
      if (!translateName(sdBuilder, tem, name))
	invalidName = 1;
    }
    Syntax::FunctionClass functionClass;
    switch (parm.type) {
    case SdParam::reservedName + Sd::rFUNCHAR:
      functionClass = Syntax::cFUNCHAR;
      break;
    case SdParam::reservedName + Sd::rMSICHAR:
      haveMsichar = 1;
      functionClass = Syntax::cMSICHAR;
      break;
    case SdParam::reservedName + Sd::rMSOCHAR:
      haveMsochar = 1;
      functionClass = Syntax::cMSOCHAR;
      break;
    case SdParam::reservedName + Sd::rMSSCHAR:
      functionClass = Syntax::cMSSCHAR;
      break;
    case SdParam::reservedName + Sd::rSEPCHAR:
      functionClass = Syntax::cSEPCHAR;
      break;
    default:
      CANNOT_HAPPEN();
    }
    if (!parseSdParam(AllowedSdParams(SdParam::number), parm))
      return 0;
    Char c;
    if (translateSyntax(sdBuilder, parm.n, c)
        && checkNotFunction(*sdBuilder.syntax, c)
	&& !invalidName) {
      Char tem;
      if (sdBuilder.syntax->lookupFunctionChar(name, &tem))
	message(ParserMessages::duplicateFunctionName, StringMessageArg(name));
      else
	sdBuilder.syntax->addFunctionChar(name, functionClass, c);
    }
  }
  if (haveMsochar && !haveMsichar)
    message(ParserMessages::msocharRequiresMsichar);
  return 1;
}

Boolean Parser::sdParseNaming(SdBuilder &sdBuilder, SdParam &parm)
{
  static Sd::ReservedName keys[6] = {
    Sd::rUCNMSTRT, Sd::rNAMESTRT, Sd::rLCNMCHAR, Sd::rUCNMCHAR, Sd::rNAMECHAR,
    Sd::rNAMECASE
  };
  int isNamechar = 0;
  ISet<Char> nameStartChar;
  ISet<Char> nameChar;
  do {
    String<SyntaxChar> lc;
    Vector<size_t> rangeIndex;
    enum PrevParam {
      paramNone,
      paramNumber,
      paramOther
    } prevParam = paramNone;
      
    for (;;) {
      switch (prevParam) {
      case paramNone:
	if (!parseSdParam(AllowedSdParams(SdParam::paramLiteral, SdParam::number),
	                  parm))
	  return 0;
	break;
      case paramNumber:
	if (!parseSdParam(AllowedSdParams(SdParam::reservedName
					  + keys[isNamechar * 3],
					  SdParam::paramLiteral,
					  SdParam::number,
					  SdParam::minus),
			  parm))
	  return 0;
	break;
      case paramOther:
	if (!parseSdParam(AllowedSdParams(SdParam::reservedName
					  + keys[isNamechar * 3],
					  SdParam::paramLiteral,
					  SdParam::number),
			  parm))
	  return 0;
	break;
      }
      switch (parm.type) {
      case SdParam::paramLiteral:
	if (prevParam == paramNone)
	  break;
	// fall through
      case SdParam::number:
	if (!sdBuilder.externalSyntax && !sdBuilder.enr) {
	  message(ParserMessages::enrRequired);
	  sdBuilder.enr = 1;
	}
	break;
      default:
	break;
      }
      prevParam = (parm.type == SdParam::number ? paramNumber : paramOther);
      if (parm.type == SdParam::minus) {
	if (!parseSdParam(AllowedSdParams(SdParam::number),
			  parm))
	  return 0;
	if (parm.n < lc[lc.size() - 1])
	  message(ParserMessages::sdInvalidRange);
	else {
	  if (parm.n > lc[lc.size() - 1] + 1)
	    rangeIndex.push_back(lc.size() - 1);
	  lc += SyntaxChar(parm.n);
	}
      }
      else {
	sdParamConvertToLiteral(parm);
	if (parm.type != SdParam::paramLiteral)
	  break;
	lc += parm.paramLiteralText;
      }
    }
    size_t lcPos = 0;
    size_t rangeIndexPos = 0;
    unsigned long rangeLeft = 0;
    SyntaxChar nextRangeChar;
    ISet<Char> &set = isNamechar ? nameChar : nameStartChar;
    String<SyntaxChar> chars;
    Boolean runOut = 0;
    prevParam = paramNone;
    for (;;) {
      switch (prevParam) {
      case paramNone:
	if (!parseSdParam(AllowedSdParams(SdParam::paramLiteral, SdParam::number),
	                  parm))
	  return 0;
	break;
      case paramNumber:
	if (!parseSdParam(AllowedSdParams(SdParam::reservedName
					  + keys[isNamechar * 3 + 1],
					  SdParam::reservedName
					  + keys[isNamechar * 3 + 2],
					  SdParam::paramLiteral,
					  SdParam::number,
					  SdParam::minus),
			  parm))
	  return 0;
	break;
      case paramOther:
	if (!parseSdParam(AllowedSdParams(SdParam::reservedName
					  + keys[isNamechar * 3 + 1],
					  SdParam::reservedName
					  + keys[isNamechar * 3 + 2],
					  SdParam::paramLiteral,
					  SdParam::number),
			  parm))
	  return 0;
	break;
      }
      switch (parm.type) {
      case SdParam::paramLiteral:
	if (prevParam == paramNone)
	  break;
	// fall through
      case SdParam::number:
	if (!sdBuilder.externalSyntax && !sdBuilder.enr) {
	  message(ParserMessages::enrRequired);
	  sdBuilder.enr = 1;
	}
	break;
      default:
	break;
      }
      prevParam = (parm.type == SdParam::number ? paramNumber : paramOther);
      if (parm.type == SdParam::minus) {
	if (!parseSdParam(AllowedSdParams(SdParam::number),
			  parm))
	  return 0;
	ASSERT(chars.size() == 1);
	SyntaxChar start = chars[0];
  	SyntaxChar end = parm.n;
	if (start > end)
	  message(ParserMessages::sdInvalidRange);
	else {
	  size_t count = end + 1 - start;
	  while (count > 0) {
	    if (rangeLeft == 0
		&& rangeIndexPos < rangeIndex.size()
		&& rangeIndex[rangeIndexPos] == lcPos) {
	      rangeLeft = 1 + lc[lcPos + 1] - lc[lcPos];
	      nextRangeChar = lc[lcPos];
	      lcPos += 2;
	      rangeIndexPos += 1;
	    }
	    Char c;
	    if (rangeLeft > 0) {
	      rangeLeft--;
	      c = nextRangeChar++;
	    }
	    else if (lcPos < lc.size())
	      c = lc[lcPos++];
	    else {
	      c = start;
	      runOut = 1;
	    }
	    if (c == start && count > 1 && (runOut || rangeLeft > 0)) {
	      size_t n;
	      if (runOut)
		n = count;
	      else if (rangeLeft < count) {
		// rangeLeft + 1 <= count
		n = rangeLeft + 1;
		rangeLeft = 0;
	      }
	      else {
		// count < rangeLeft + 1
		n = count;
		rangeLeft -= n - 1;
		nextRangeChar += n - 1;
	      }
	      translateRange(sdBuilder, start, start + (n - 1), set);
	      count -= n;
	      start += n;
	    }
	    else {
	      Char transLc, transUc;
	      if (translateSyntax(sdBuilder, c, transLc)
		  && translateSyntax(sdBuilder, start, transUc)) {
		set.add(transLc);
		if (transLc != transUc) {
		  set.add(transUc);
		  sdBuilder.syntax->addSubst(transLc, transUc);
		}
	      }
	      count--;
	      start++;
	    }
	  } 
	}
	chars.resize(0);
      }
      else {
	for (size_t i = 0; i < chars.size(); i++) {
	  if (rangeLeft == 0
	      && rangeIndexPos < rangeIndex.size()
	      && rangeIndex[rangeIndexPos] == lcPos) {
	    rangeLeft = 1 + lc[lcPos + 1] - lc[lcPos];
	    nextRangeChar = lc[lcPos];
	    lcPos += 2;
	    rangeIndexPos += 1;
	  }
	  Char c;
	  if (rangeLeft > 0) {
	    rangeLeft--;
	    c = nextRangeChar++;
	  }
	  else if (lcPos < lc.size())
	    c = lc[lcPos++];
	  else {
	    runOut = 1;
	    c = chars[i];
	  }
	  // map from c to chars[i]
	  Char transLc, transUc;
	  if (translateSyntax(sdBuilder, c, transLc)
	      && translateSyntax(sdBuilder, chars[i], transUc)) {
	    set.add(transLc);
	    if (transLc != transUc) {
	      set.add(transUc);
	      sdBuilder.syntax->addSubst(transLc, transUc);
	    }
	  }
	}
	sdParamConvertToLiteral(parm);
	if (parm.type != SdParam::paramLiteral)
	  break;
	parm.paramLiteralText.swap(chars);
      }
    }
    if ((runOut && !sdBuilder.externalSyntax)
	|| rangeLeft > 0 || lcPos < lc.size())
      message(isNamechar
	      ? ParserMessages::nmcharLength
	      : ParserMessages::nmstrtLength);
    if (parm.type == SdParam::reservedName + keys[isNamechar * 3 + 1]) {
      if (!sdBuilder.externalSyntax && !sdBuilder.enr) {
	message(ParserMessages::enrRequired);
	sdBuilder.enr = 1;
      }
      prevParam = paramNone;
      for (;;) {
	switch (prevParam) {
	case paramNone:
	  if (!parseSdParam(AllowedSdParams(SdParam::paramLiteral, SdParam::number),
			    parm))
	    return 0;
	  break;
	case paramNumber:
	  if (!parseSdParam(AllowedSdParams(SdParam::reservedName
					    + keys[isNamechar * 3 + 2],
					    SdParam::paramLiteral,
					    SdParam::number,
					    SdParam::minus),
			    parm))
	    return 0;
	  break;
	case paramOther:
	  if (!parseSdParam(AllowedSdParams(SdParam::reservedName
					    + keys[isNamechar * 3 + 2],
					    SdParam::paramLiteral,
					    SdParam::number),
			    parm))
	    return 0;
	  break;
	}
	prevParam = (parm.type == SdParam::number ? paramNumber : paramOther);
	if (parm.type == SdParam::minus) {
	  SyntaxChar prevNumber = parm.n;
	  if (!parseSdParam(AllowedSdParams(SdParam::number),
			    parm))
	    return 0;
	  if (parm.n < prevNumber)
	    message(ParserMessages::sdInvalidRange);
	  else if (parm.n > prevNumber)
	    translateRange(sdBuilder, prevNumber + 1, parm.n, set);
	}
	else {
	  sdParamConvertToLiteral(parm);
	  if (parm.type != SdParam::paramLiteral)
	    break;
	  for (size_t i = 0; i < parm.paramLiteralText.size(); i++) {
	    Char trans;
	    if (translateSyntax(sdBuilder, parm.paramLiteralText[i], trans))
	      set.add(trans);
	  }
	}
      }
    }
    if (!checkNmchars(set, *sdBuilder.syntax))
      sdBuilder.valid = 0;
  } while (!isNamechar++);
  ISet<WideChar> bad;
  intersectCharSets(nameStartChar, nameChar, bad);
  if (!bad.isEmpty()) {
    sdBuilder.valid = 0;
    message(ParserMessages::nmcharNmstrt, CharsetMessageArg(bad));
  }
  sdBuilder.syntax->addNameStartCharacters(nameStartChar);
  sdBuilder.syntax->addNameCharacters(nameChar);
  if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rGENERAL),
		    parm))
    return 0;
  if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rNO,
				    SdParam::reservedName + Sd::rYES),
		    parm))
    return 0;
  sdBuilder.syntax->setNamecaseGeneral(parm.type
				       == SdParam::reservedName + Sd::rYES);

  if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rENTITY),
		    parm))
    return 0;
  if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rNO,
				    SdParam::reservedName + Sd::rYES),
		    parm))
    return 0;
  sdBuilder.syntax->setNamecaseEntity(parm.type
				      == SdParam::reservedName + Sd::rYES);
  return 1;
}

Boolean Parser::checkNmchars(const ISet<Char> &set, const Syntax &syntax)
{
  Boolean valid = 1;
  ISet<WideChar> bad;
  intersectCharSets(set, *syntax.charSet(Syntax::nameStart), bad);
  if (!bad.isEmpty()) {
    message(ParserMessages::nmcharLetter, CharsetMessageArg(bad));
    valid = 0;
    bad.clear();
  }
  intersectCharSets(set, *syntax.charSet(Syntax::digit), bad);
  if (!bad.isEmpty()) {
    message(ParserMessages::nmcharDigit, CharsetMessageArg(bad));
    valid = 0;
    bad.clear();
  }
  Char funChar;
  if (syntax.getStandardFunction(Syntax::fRE, funChar)
      && set.contains(funChar)) {
    message(ParserMessages::nmcharRe, NumberMessageArg(funChar));
    valid = 0;
  }
  if (syntax.getStandardFunction(Syntax::fRS, funChar)
      && set.contains(funChar)) {
    message(ParserMessages::nmcharRs, NumberMessageArg(funChar));
    valid = 0;
  }
  if (syntax.getStandardFunction(Syntax::fSPACE, funChar)
      && set.contains(funChar)) {
    message(ParserMessages::nmcharSpace, NumberMessageArg(funChar));
    valid = 0;
  }
  intersectCharSets(set, *syntax.charSet(Syntax::sepchar), bad);
  if (!bad.isEmpty()) {
    message(ParserMessages::nmcharSepchar, CharsetMessageArg(bad));
    valid = 0;
  }
  return valid;
}

// Result is a ISet<WideChar>, so it can be used with CharsetMessageArg.

void Parser::intersectCharSets(const ISet<Char> &s1, const ISet<Char> &s2,
			       ISet<WideChar> &inter)
{
  ISetIter<Char> i1(s1);
  ISetIter<Char> i2(s2);
  Char min1, max1, min2, max2;
  if (!i1.next(min1, max1))
    return;
  if (!i2.next(min2, max2))
    return;
  for (;;) {
    if (max1 < min2) {
      if (!i1.next(min1, max1))
	break;
    }
    else if (max2 < min1) {
      if (!i2.next(min2, max2))
	break;
    }
    else {
      // min2 <= max1
      // min1 <= max2
      Char min = min1 > min2 ? min1 : min2;
      Char max = max1 < max2 ? max1 : max2;
      inter.addRange(min, max);
      if (max2 > max) {
	if (!i1.next(min1, max1))
	  break;
      }
      else {
	if (!i2.next(min2, max2))
	  break;
      }
    }
  }
}

Boolean Parser::sdParseDelim(SdBuilder &sdBuilder, SdParam &parm)
{
  if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rDELIM),
		    parm))
    return 0;
  if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rGENERAL),
		    parm))
    return 0;
  if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rSGMLREF),
		    parm))
    return 0;
  PackedBoolean delimGeneralSpecified[Syntax::nDelimGeneral];
  for (int i = 0; i < Syntax::nDelimGeneral; i++)
    delimGeneralSpecified[i] = 0;
  for (;;) {
    if (!parseSdParam(AllowedSdParams(SdParam::generalDelimiterName,
				      SdParam::reservedName + Sd::rSHORTREF),
		      parm))
      return 0;
    if (parm.type == SdParam::reservedName + Sd::rSHORTREF)
      break;
    Syntax::DelimGeneral delimGeneral = parm.delimGeneralIndex;
    if (delimGeneralSpecified[delimGeneral])
      message(ParserMessages::duplicateDelimGeneral,
	      StringMessageArg(sd().generalDelimiterName(delimGeneral)));
    switch (delimGeneral) {
    case Syntax::dHCRO:
    case Syntax::dNESTC:
      requireWWW(sdBuilder);
      break;
    default:
      break;
    }
    if (!parseSdParam(sdBuilder.externalSyntax
		      ? AllowedSdParams(SdParam::paramLiteral,
					SdParam::number)
		      : AllowedSdParams(SdParam::paramLiteral),
		      parm))
      return 0;
    sdParamConvertToLiteral(parm);
    StringC str;
    if (parm.paramLiteralText.size() == 0)
	message(ParserMessages::sdEmptyDelimiter);
    else if (translateSyntax(sdBuilder, parm.paramLiteralText, str)) {
      sdBuilder.syntax->generalSubstTable()->subst(str);
      if (checkGeneralDelim(*sdBuilder.syntax, str)
	  && !delimGeneralSpecified[delimGeneral])
	sdBuilder.syntax->setDelimGeneral(delimGeneral, str);
      else
	sdBuilder.valid = 0;
    }
    delimGeneralSpecified[delimGeneral] = 1;
  }
  if (sdBuilder.syntax->delimGeneral(Syntax::dNET).size()
      && !sdBuilder.syntax->delimGeneral(Syntax::dNESTC).size())
    sdBuilder.syntax->setDelimGeneral(Syntax::dNESTC,
				      sdBuilder.syntax->delimGeneral(Syntax::dNET));
  if (!setRefDelimGeneral(*sdBuilder.syntax,
			  sdBuilder.syntaxCharset,
			  sdBuilder.sd->internalCharset(),
			  sdBuilder.switcher))
    sdBuilder.valid = 0;
  if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rSGMLREF,
				    SdParam::reservedName + Sd::rNONE),
		    parm))
    return 0;
  if (parm.type == SdParam::reservedName + Sd::rSGMLREF) {
    if (!addRefDelimShortref(*sdBuilder.syntax,
			     sdBuilder.syntaxCharset,
			     sdBuilder.sd->internalCharset(),
			     sdBuilder.switcher))
      sdBuilder.valid = 0;
  }
  String<SyntaxChar> lastLiteral;
  for (;;) {
    if (!parseSdParam(sdBuilder.externalSyntax
		      ? AllowedSdParams(SdParam::paramLiteral,
					SdParam::number,
					SdParam::minus,
					SdParam::reservedName + Sd::rNAMES)
		      : AllowedSdParams(SdParam::paramLiteral,
					SdParam::reservedName + Sd::rNAMES),
		      parm))
      return 0;
    sdParamConvertToLiteral(parm);
    if (parm.type == SdParam::minus) {
      if (!parseSdParam(AllowedSdParams(SdParam::paramLiteral,
					SdParam::number),
			parm))
	return 0;
      sdParamConvertToLiteral(parm);
      if (parm.paramLiteralText.size() == 0)
	message(ParserMessages::sdEmptyDelimiter);
      else if (lastLiteral.size() != 1
	       || parm.paramLiteralText.size() != 1)
	message(ParserMessages::sdRangeNotSingleChar);
      else if (parm.paramLiteralText[0] < lastLiteral[0])
	message(ParserMessages::sdInvalidRange);
      else if (parm.paramLiteralText[0] != lastLiteral[0]) {
	ISet<Char> shortrefChars;
	translateRange(sdBuilder,
		       lastLiteral[0] + 1,
		       parm.paramLiteralText[0],
		       shortrefChars);
	ISet<WideChar> duplicates;
	intersectCharSets(shortrefChars,
			  sdBuilder.syntax->delimShortrefSimple(),
			  duplicates);
	int nComplexShortrefs = sdBuilder.syntax->nDelimShortrefComplex();
	for (int i = 0; i < nComplexShortrefs; i++) {
	  const StringC &delim = sdBuilder.syntax->delimShortrefComplex(i);
	  if (delim.size() == 1 && shortrefChars.contains(delim[0]))
	    duplicates.add(delim[0]);
	}
	if (!duplicates.isEmpty())
	  message(ParserMessages::duplicateDelimShortrefSet,
		  CharsetMessageArg(duplicates));
	sdBuilder.syntax->addDelimShortrefs(shortrefChars,
					    sdBuilder.sd->internalCharset());
      }
      lastLiteral.resize(0);
    }
    else if (parm.type == SdParam::paramLiteral) {
      parm.paramLiteralText.swap(lastLiteral);
      StringC str;
      if (lastLiteral.size() == 0)
	message(ParserMessages::sdEmptyDelimiter);
      else if (translateSyntax(sdBuilder, lastLiteral, str)) {
	sdBuilder.syntax->generalSubstTable()->subst(str);
	if (str.size() == 1
	    || checkShortrefDelim(*sdBuilder.syntax,
				  sdBuilder.sd->internalCharset(),
				  str)) {
	  if (sdBuilder.syntax->isValidShortref(str))
	    message(ParserMessages::duplicateDelimShortref,
		    StringMessageArg(str));
	  else
	    sdBuilder.syntax->addDelimShortref(str,
					       sdBuilder.sd->internalCharset());
	}
      }
    }
    else
      break;
  }
  return 1;
}

Boolean Parser::sdParseNames(SdBuilder &sdBuilder, SdParam &parm)
{
  if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rSGMLREF),
		    parm))
    return 0;
  for (;;) {
    if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rQUANTITY,
				      SdParam::referenceReservedName),
		      parm))
      return 0;
    if (parm.type == SdParam::reservedName + Sd::rQUANTITY)
      break;
    Syntax::ReservedName reservedName = parm.reservedNameIndex;
    switch (reservedName) {
    case Syntax::rALL:
    case Syntax::rDATA:
    case Syntax::rIMPLICIT:
      requireWWW(sdBuilder);
      break;
    default:
      break;
    }
    if (!parseSdParam(sdBuilder.externalSyntax
		      ? AllowedSdParams(SdParam::name, SdParam::paramLiteral)
		      : AllowedSdParams(SdParam::name),
		      parm))
      return 0;
    StringC transName;
    if (parm.type == SdParam::name
	? translateName(sdBuilder, parm.token, transName)
	: translateSyntax(sdBuilder, parm.paramLiteralText, transName)) {
      Syntax::ReservedName tem;
      if (sdBuilder.syntax->lookupReservedName(transName, &tem))
	message(ParserMessages::ambiguousReservedName,
		StringMessageArg(transName));
      else {
	if (transName.size() == 0
	    || !sdBuilder.syntax->isNameStartCharacter(transName[0])) {
	  message(ParserMessages::reservedNameSyntax,
		  StringMessageArg(transName));
	  transName.resize(0);
	}
	size_t i;
	// Check that its a valid name in the declared syntax
	// (- and . might not be name characters).
	for (i = 1; i < transName.size(); i++)
	  if (!sdBuilder.syntax->isNameCharacter(transName[i])) {
	    message(ParserMessages::reservedNameSyntax,
		    StringMessageArg(transName));
	    transName.resize(0);
	    break;
	  }	
	sdBuilder.syntax->generalSubstTable()->subst(transName);
	if (sdBuilder.syntax->reservedName(reservedName).size() > 0)
	  message(ParserMessages::duplicateReservedName,
		  StringMessageArg(syntax().reservedName(reservedName)));
	else if (transName.size() > 0)
	  sdBuilder.syntax->setName(reservedName, transName);
	else
	  sdBuilder.valid = 0;
      }
    }
  }
  setRefNames(*sdBuilder.syntax, sdBuilder.sd->internalCharset(), sdBuilder.www);
  static Syntax::ReservedName functionNameIndex[3] = {
    Syntax::rRE, Syntax::rRS, Syntax::rSPACE
  };
  for (int i = 0; i < 3; i++) {
    const StringC &functionName
      = sdBuilder.syntax->reservedName(functionNameIndex[i]);
    Char tem;
    if (sdBuilder.syntax->lookupFunctionChar(functionName, &tem))
      message(ParserMessages::duplicateFunctionName, StringMessageArg(functionName));
  }
  sdBuilder.syntax->enterStandardFunctionNames();
  return 1;
}

Boolean Parser::sdParseQuantity(SdBuilder &sdBuilder, SdParam &parm)
{
  if (!parseSdParam(sdBuilder.www
                    ? AllowedSdParams(SdParam::reservedName + Sd::rNONE,
                                      SdParam::reservedName + Sd::rSGMLREF)
		    : AllowedSdParams(SdParam::reservedName + Sd::rSGMLREF),
		    parm))
    return 0;
  int final = (sdBuilder.externalSyntax
	       ? int(SdParam::eE)
	       : SdParam::reservedName + Sd::rFEATURES);
  if (parm.type == SdParam::reservedName + Sd::rNONE) {
    for (int i = 0; i < Syntax::nQuantity; i++) {
      if (i != Syntax::qNORMSEP)
        sdBuilder.syntax->setQuantity(Syntax::Quantity(i), Syntax::unlimited);
    }
    if (!parseSdParam(AllowedSdParams(final, SdParam::reservedName + Sd::rENTITIES), parm))
      return 0;
  }
  else {
    for (;;) {
      if (!parseSdParam(sdBuilder.www
  		        ? AllowedSdParams(SdParam::quantityName,
					  final,
					  SdParam::reservedName + Sd::rENTITIES)
		        : AllowedSdParams(SdParam::quantityName, final),
		        parm))
        return 0;
      if (parm.type != SdParam::quantityName)
        break;
      Syntax::Quantity quantity = parm.quantityIndex;
      if (!parseSdParam(AllowedSdParams(SdParam::number), parm))
	return 0;
      sdBuilder.syntax->setQuantity(quantity, parm.n);
    }
    if (sdBuilder.sd->scopeInstance()) {
      for (int i = 0; i < Syntax::nQuantity; i++)
        if (sdBuilder.syntax->quantity(Syntax::Quantity(i))
	    < syntax().quantity(Syntax::Quantity(i)))
	   message(ParserMessages::scopeInstanceQuantity,
		   StringMessageArg(sd().quantityName(Syntax::Quantity(i))));
    }
  }
  if (parm.type == SdParam::reservedName + Sd::rENTITIES)
    return sdParseEntities(sdBuilder, parm);
  else
    return 1;
}

Boolean Parser::sdParseEntities(SdBuilder &sdBuilder, SdParam &parm)
{
  int final = (sdBuilder.externalSyntax
	       ? int(SdParam::eE)
	       : SdParam::reservedName + Sd::rFEATURES);
  for (;;) {
    if (!parseSdParam(AllowedSdParams(final, SdParam::paramLiteral), parm))
      return 0;
    if (parm.type != SdParam::paramLiteral)
      break;
    StringC name;
    if (!translateSyntax(sdBuilder, parm.paramLiteralText, name))
      name.resize(0);
    else if (name.size() == 0
	     || !sdBuilder.syntax->isNameStartCharacter(name[0])) {
      message(ParserMessages::entityNameSyntax, StringMessageArg(name));
      name.resize(0);
    }
    else {
      // Check that its a valid name in the declared syntax
      for (size_t i = 1; i < name.size(); i++)
	if (!sdBuilder.syntax->isNameCharacter(name[i])) {
	  message(ParserMessages::entityNameSyntax, StringMessageArg(name));
	  name.resize(0);
	  break;
	}
    }
    if (!parseSdParam(AllowedSdParams(SdParam::number), parm))
      return 0;
    Char c;
    if (translateSyntax(sdBuilder, parm.n, c) && name.size())
      sdBuilder.syntax->addEntity(name, c);
  }
  return 1;
}

Boolean Parser::sdParseFeatures(SdBuilder &sdBuilder, SdParam &parm)
{
  struct FeatureInfo {
    Sd::ReservedName name;
    enum {
      none,
      boolean,
      number,
      netenabl,
      implyelt
    } arg;
  };
  static FeatureInfo features[] = {
    { Sd::rMINIMIZE, FeatureInfo::none },
    { Sd::rDATATAG, FeatureInfo::boolean },
    { Sd::rOMITTAG, FeatureInfo::boolean },
    { Sd::rRANK, FeatureInfo::boolean },
    { Sd::rSHORTTAG, FeatureInfo::none },
    { Sd::rSTARTTAG, FeatureInfo::none },
    { Sd::rEMPTY, FeatureInfo::boolean },
    { Sd::rUNCLOSED, FeatureInfo::boolean },
    { Sd::rNETENABL, FeatureInfo::netenabl },
    { Sd::rENDTAG, FeatureInfo::none },
    { Sd::rEMPTY, FeatureInfo::boolean },
    { Sd::rUNCLOSED, FeatureInfo::boolean },
    { Sd::rATTRIB, FeatureInfo::none },
    { Sd::rDEFAULT, FeatureInfo::boolean },
    { Sd::rOMITNAME, FeatureInfo::boolean },
    { Sd::rVALUE, FeatureInfo::boolean },
    { Sd::rEMPTYNRM, FeatureInfo::boolean },
    { Sd::rIMPLYDEF, FeatureInfo::none },
    { Sd::rATTLIST, FeatureInfo::boolean },
    { Sd::rDOCTYPE, FeatureInfo::boolean },
    { Sd::rELEMENT, FeatureInfo::implyelt },
    { Sd::rENTITY, FeatureInfo::boolean },
    { Sd::rNOTATION, FeatureInfo::boolean },
    { Sd::rLINK, FeatureInfo::none },
    { Sd::rSIMPLE, FeatureInfo::number },
    { Sd::rIMPLICIT, FeatureInfo::boolean },
    { Sd::rEXPLICIT, FeatureInfo::number },
    { Sd::rOTHER, FeatureInfo::none },
    { Sd::rCONCUR, FeatureInfo::number },
    { Sd::rSUBDOC, FeatureInfo::number },
    { Sd::rFORMAL, FeatureInfo::boolean },
    { Sd::rURN, FeatureInfo::boolean },
    { Sd::rKEEPRSRE, FeatureInfo::boolean },
    { Sd::rVALIDITY, FeatureInfo::none },
  };
  int booleanFeature = 0;
  int numberFeature = 0;
  for (size_t i = 0; i < SIZEOF(features); i++) {
    switch (features[i].name) {
    case Sd::rSTARTTAG:
      // SHORTTAG
      if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rSTARTTAG,
					SdParam::reservedName + Sd::rNO,
					SdParam::reservedName + Sd::rYES),
			parm))
	return 0;
      if (parm.type == SdParam::reservedName + Sd::rSTARTTAG)
	break;
      sdBuilder.sd->setShorttag(parm.type == SdParam::reservedName + Sd::rYES);
      while (features[++i].name != Sd::rEMPTYNRM)
	if (features[i].arg == FeatureInfo::boolean)
	  booleanFeature++;
      // fall through
    case Sd::rEMPTYNRM:
      if (!parseSdParam(AllowedSdParams(SdParam::reservedName
				        + features[i].name,
				        SdParam::reservedName
				        + features[i + 7].name), parm))
	return 0;
      if (parm.type == SdParam::reservedName + features[i].name)
	requireWWW(sdBuilder);
      else {
	booleanFeature += 5;
	i += 7;
      }
      break;
    case Sd::rURN:
      if (!parseSdParam(AllowedSdParams(SdParam::reservedName + features[i].name,
	                                SdParam::reservedName + Sd::rAPPINFO), parm))
	return 0;
      if (parm.type == SdParam::reservedName + Sd::rAPPINFO)
	return 1;
      requireWWW(sdBuilder);
      break;
    default:
      if (!parseSdParam(AllowedSdParams(SdParam::reservedName
				        + features[i].name), parm))
	return 0;
      break;
    }
    switch (features[i].arg) {      
    case FeatureInfo::number:
      if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rNO,
					SdParam::reservedName + Sd::rYES),
			parm))
	return 0;
      if (parm.type == SdParam::reservedName + Sd::rYES) {
	if (!parseSdParam(AllowedSdParams(SdParam::number), parm))
	  return 0;
	sdBuilder.sd->setNumberFeature(Sd::NumberFeature(numberFeature++),
				       parm.n);
      }
      else
	sdBuilder.sd->setNumberFeature(Sd::NumberFeature(numberFeature++),
				       0);
      break;
    case FeatureInfo::netenabl:
      if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rNO,
					SdParam::reservedName + Sd::rIMMEDNET,
					SdParam::reservedName + Sd::rALL),
			parm))
	return 0;
      switch (parm.type) {
      case SdParam::reservedName + Sd::rNO:
	sdBuilder.sd->setStartTagNetEnable(Sd::netEnableNo);
	break;
      case SdParam::reservedName + Sd::rIMMEDNET:
	sdBuilder.sd->setStartTagNetEnable(Sd::netEnableImmednet);
	break;
      case SdParam::reservedName + Sd::rALL:
	sdBuilder.sd->setStartTagNetEnable(Sd::netEnableAll);
	break;
      }
      break;
    case FeatureInfo::implyelt:
      if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rNO,
					SdParam::reservedName + Sd::rYES,
					SdParam::reservedName + Sd::rANYOTHER),
			parm))
	return 0;
      switch (parm.type) {
      case SdParam::reservedName + Sd::rNO:
	sdBuilder.sd->setImplydefElement(Sd::implydefElementNo);
	break;
      case SdParam::reservedName + Sd::rYES:
	sdBuilder.sd->setImplydefElement(Sd::implydefElementYes);
	break;
      case SdParam::reservedName + Sd::rANYOTHER:
	sdBuilder.sd->setImplydefElement(Sd::implydefElementAnyother);
	break;
      }
      break;
    case FeatureInfo::boolean:
      if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rNO,
					SdParam::reservedName + Sd::rYES),
			parm))
	return 0;
      switch (features[i].name) {
#if 0
      case Sd::rDATATAG:
	if (parm.type == SdParam::reservedName + Sd::rYES)
	  message(ParserMessages::datatagNotImplemented);
	break;
#endif
      case Sd::rEMPTYNRM:
	if (parm.type == SdParam::reservedName + Sd::rNO
	    && sdBuilder.sd->startTagNetEnable() == Sd::netEnableImmednet) {
	  message(ParserMessages::immednetRequiresEmptynrm);
	  sdBuilder.valid = 0;
	}
	break;
      }
      sdBuilder.sd->setBooleanFeature(Sd::BooleanFeature(booleanFeature++),
				      parm.type == (SdParam::reservedName
						    + Sd::rYES));
      break;
    }
  }
  if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rNOASSERT,
                                    SdParam::reservedName + Sd::rTYPE),
		    parm))
    return 0;
  switch (parm.type) {
  case SdParam::reservedName + Sd::rNOASSERT:
    sdBuilder.sd->setTypeValid(0);
    break;
  case SdParam::reservedName + Sd::rTYPE:
    sdBuilder.sd->setTypeValid(1);
    break;
  }
  if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rENTITIES), parm))
    return 0;
  if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rNOASSERT,
                                    SdParam::reservedName + Sd::rREF),
		    parm))
    return 0;
  if (parm.type == SdParam::reservedName + Sd::rNOASSERT) {
    sdBuilder.sd->setIntegrallyStored(0);
    sdBuilder.sd->setEntityRef(Sd::entityRefAny);
  }
  else {
    if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rNONE,
                                      SdParam::reservedName + Sd::rINTERNAL,
                                      SdParam::reservedName + Sd::rANY),
		      parm))
      return 0;
    switch (parm.type) {
    case SdParam::reservedName + Sd::rNONE:
      sdBuilder.sd->setEntityRef(Sd::entityRefNone);
      break;
    case SdParam::reservedName + Sd::rINTERNAL:
      sdBuilder.sd->setEntityRef(Sd::entityRefInternal);
      break;
    case SdParam::reservedName + Sd::rANY:
      sdBuilder.sd->setEntityRef(Sd::entityRefAny);
      break;
    }
    if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rINTEGRAL), parm))
      return 0;
    if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rNO,
	                              SdParam::reservedName + Sd::rYES),
		      parm))
      return 0;
    sdBuilder.sd->setIntegrallyStored(parm.type == (SdParam::reservedName + Sd::rYES));
  }
  return parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rAPPINFO),
		      parm);
}

Boolean Parser::sdParseAppinfo(SdBuilder &, SdParam &parm)
{
  Location location(currentLocation());
  if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rNONE,
				    SdParam::minimumLiteral),
		    parm))
    return 0;
  AppinfoEvent *event;
  if (parm.type == SdParam::minimumLiteral)
    event = new (eventAllocator()) AppinfoEvent(parm.literalText, location);
  else
    event = new (eventAllocator()) AppinfoEvent(location);
  eventHandler().appinfo(event);
  return 1;
}

Boolean Parser::sdParseSeealso(SdBuilder &sdBuilder, SdParam &parm)
{
  SdParam::Type final = sdBuilder.external ? SdParam::eE : SdParam::mdc;
  if (!parseSdParam(AllowedSdParams(SdParam::reservedName + Sd::rSEEALSO, final), parm))
    return 0;
  if (parm.type == final)
    return 1;
  requireWWW(sdBuilder);
  if (!parseSdParam(AllowedSdParams(SdParam::minimumLiteral,
				    SdParam::reservedName + Sd::rNONE), parm))
    return 0;
  if (parm.type == SdParam::reservedName + Sd::rNONE)
    return parseSdParam(AllowedSdParams(final), parm);
  do {
    if (!parseSdParam(AllowedSdParams(SdParam::minimumLiteral, final), parm))
      return 0;
  } while (parm.type != final);
  return 1;
}

Boolean Parser::translateSyntax(CharSwitcher &switcher,
				const CharsetInfo &syntaxCharset,
				const CharsetInfo &internalCharset,
				WideChar syntaxChar,
				Char &docChar)
{
  syntaxChar = switcher.subst(syntaxChar);
  UnivChar univChar;
  if (syntaxCharset.descToUniv(syntaxChar, univChar)
      && univToDescCheck(internalCharset, univChar, docChar))
    return 1;
  message(sd().internalCharsetIsDocCharset()
          ? ParserMessages::translateSyntaxCharDoc
	  : ParserMessages::translateSyntaxCharInternal,
	  NumberMessageArg(syntaxChar));
  return 0;
}

void Parser::translateRange(SdBuilder &sdBuilder, SyntaxChar start,
			    SyntaxChar end, ISet<Char> &chars)
{
#if 0
  do {
    Char docChar;
    if (!translateSyntax(sdBuilder, start, docChar))
      break;
    chars.add(docChar);
  } while (start++ != end);
#endif
  for (;;) {
    SyntaxChar doneUpTo = end;
    Boolean gotSwitch = 0;
    WideChar firstSwitch;
    for (size_t i = 0; i < sdBuilder.switcher.nSwitches(); i++) {
      WideChar c = sdBuilder.switcher.switchFrom(i);
      if (start <= c && c <= end) {
	if (!gotSwitch) {
	  gotSwitch = 1;
	  firstSwitch = c;
	}
	else if (c < firstSwitch)
	  firstSwitch = c;
      }
    }
    if (gotSwitch && firstSwitch == start) {
      doneUpTo = start;
      Char docChar;
      if (translateSyntax(sdBuilder, start, docChar))
	chars.add(docChar);
    }
    else {
      if (gotSwitch)
	doneUpTo = firstSwitch - 1;
      Char docChar;
      Number count;
      if (translateSyntaxNoSwitch(sdBuilder, start, docChar, count)) {
	if (count - 1 < doneUpTo - start)
	  doneUpTo = start + (count - 1);
	chars.addRange(docChar, docChar + (doneUpTo - start));
      }
    }
    if (doneUpTo == end)
      break;
    start = doneUpTo + 1;
  }
}

Boolean Parser::translateSyntax(SdBuilder &sdBuilder,
				WideChar syntaxChar, Char &docChar)
{
  Number count;
  return translateSyntaxNoSwitch(sdBuilder,
				 sdBuilder.switcher.subst(syntaxChar),
				 docChar,
				 count);
}

Boolean Parser::translateSyntaxNoSwitch(SdBuilder &sdBuilder,
					WideChar syntaxChar, Char &docChar,
					Number &count)
{
  Number n;
  StringC str;
  CharsetDeclRange::Type type;
  const PublicId *id;
  if (sdBuilder.sd->internalCharsetIsDocCharset()
      && sdBuilder.syntaxCharsetDecl.getCharInfo(syntaxChar,
					         id,
					         type,
					         n,
					         str,
					         count)) {
    ISet<WideChar> docChars;
    switch (type) {
    case CharsetDeclRange::unused:
      break;
    case CharsetDeclRange::string:
      sdBuilder.sd->docCharsetDecl().stringToChar(str, docChars);
      break;
    case CharsetDeclRange::number:
      {
	Number count2;
	sdBuilder.sd->docCharsetDecl().numberToChar(id, n, docChars, count2);
	if (!docChars.isEmpty() && count2 < count)
	  count = count2;
      }
      break;
    default:
      CANNOT_HAPPEN();
    }
    if (!docChars.isEmpty()) {
      if (!docChars.isSingleton() && options().warnSgmlDecl)
	message(ParserMessages::ambiguousDocCharacter,
		CharsetMessageArg(docChars));
      ISetIter<WideChar> iter(docChars);
      WideChar min, max;
      if (iter.next(min, max) && min <= charMax) {
	docChar = Char(min);
	return 1;
      }
    }
  }
  UnivChar univChar;
  WideChar alsoMax, count2;
  if (sdBuilder.syntaxCharset.descToUniv(syntaxChar, univChar, alsoMax)
      && univToDescCheck(sdBuilder.sd->internalCharset(), univChar, docChar,
			 count2)) {
    count = (alsoMax - syntaxChar) + 1;
    if (count2 < count)
      count = count2;
    return 1;
  }
  sdBuilder.valid = 0;
  message(sd().internalCharsetIsDocCharset()
          ? ParserMessages::translateSyntaxCharDoc
	  : ParserMessages::translateSyntaxCharInternal,
	  NumberMessageArg(syntaxChar));
  return 0;
}


Boolean Parser::translateSyntax(SdBuilder &sdBuilder,
				const String<SyntaxChar> &syntaxString,
				StringC &docString)
{
  docString.resize(0);
  int ret = 1;
  for (size_t i = 0; i < syntaxString.size(); i++) {
    Char c;
    if (translateSyntax(sdBuilder, syntaxString[i], c))
      docString += c;
    else
      ret = 0;
  }
  return ret;
}

Boolean Parser::translateName(SdBuilder &sdBuilder,
			      const StringC &name,
			      StringC &str)
{
  str.resize(name.size());
  for (size_t i = 0; i < name.size(); i++) {
    UnivChar univChar;
    Boolean ret = sd().internalCharset().descToUniv(name[i], univChar);
    // Might switch hyphen or period.
    univChar = translateUniv(univChar, sdBuilder.switcher,
			     sdBuilder.syntaxCharset);
    ASSERT(ret != 0);
    if (!univToDescCheck(sdBuilder.sd->internalCharset(), univChar, str[i])) {
      message(ParserMessages::translateDocChar, NumberMessageArg(univChar));
      sdBuilder.valid = 0;
      return 0;
    }
  }
  return 1;
}

UnivChar Parser::translateUniv(UnivChar univChar,
			       CharSwitcher &switcher,
			       const CharsetInfo &syntaxCharset)
{
  WideChar syntaxChar;
  ISet<WideChar> syntaxChars;
  if (syntaxCharset.univToDesc(univChar, syntaxChar, syntaxChars) != 1) {
    message(ParserMessages::missingSyntaxChar,
	    NumberMessageArg(univChar));
    return univChar;
  }
  SyntaxChar tem = switcher.subst(syntaxChar);
  if (tem != syntaxChar && !syntaxCharset.descToUniv(tem, univChar))
    message(sd().internalCharsetIsDocCharset()
            ? ParserMessages::translateSyntaxCharDoc
            : ParserMessages::translateSyntaxCharInternal,
	    NumberMessageArg(tem));
  return univChar;
}

Boolean Parser::checkNotFunction(const Syntax &syn, Char c)
{
  if (syn.charSet(Syntax::functionChar)->contains(c)) {
    message(ParserMessages::oneFunction, NumberMessageArg(c));
    return 0;
  }
  else
    return 1;
}


// Check that it has at most one B sequence and that it
// is not adjacent to a blank sequence.

Boolean Parser::checkShortrefDelim(const Syntax &syn,
				   const CharsetInfo &charset,
				   const StringC &delim)
{
  Boolean hadB = 0;
  Char letterB = charset.execToDesc('B');
  const ISet<Char> *bSet = syn.charSet(Syntax::blank);
  for (size_t i = 0; i < delim.size(); i++)
    if (delim[i] == letterB) {
      if (hadB) {
	message(ParserMessages::multipleBSequence, StringMessageArg(delim));
	return 0;
      }
      hadB = 1;
      if (i > 0 && bSet->contains(delim[i - 1])) {
	message(ParserMessages::blankAdjacentBSequence,
		StringMessageArg(delim));
	return 0;
      }
      while (i + 1 < delim.size() && delim[i + 1] == letterB)
	i++;
      if (i < delim.size() - 1 && bSet->contains(delim[i + 1])) {
	message(ParserMessages::blankAdjacentBSequence,
		StringMessageArg(delim));
	return 0;
      }
    }
  return 1;
}

Boolean Parser::checkGeneralDelim(const Syntax &syn, const StringC &delim)
{
  const ISet<Char> *functionSet = syn.charSet(Syntax::functionChar);
  if (delim.size() > 0) {
    Boolean allFunction = 1;
    for (size_t i = 0; i < delim.size(); i++)
      if (!functionSet->contains(delim[i]))
	allFunction = 0;
    if (allFunction) {
      message(ParserMessages::generalDelimAllFunction,
	      StringMessageArg(delim));
      return 0;
    }
  }
  return 1;
}

Boolean Parser::checkSwitches(CharSwitcher &switcher,
			      const CharsetInfo &syntaxCharset)
{
  Boolean valid = 1;
  for (size_t i = 0; i < switcher.nSwitches(); i++) {
    WideChar c[2];
    c[0] = switcher.switchFrom(i);
    c[1] = switcher.switchTo(i);
    for (int j = 0; j < 2; j++) {
      UnivChar univChar;
      if (syntaxCharset.descToUniv(c[j], univChar)) {
	// Check that it is not Digit Lcletter or Ucletter
	if ((UnivCharsetDesc::a <= univChar
	     && univChar < UnivCharsetDesc::a + 26)
	    || (UnivCharsetDesc::A <= univChar
		&& univChar < UnivCharsetDesc::A + 26)
	    || (UnivCharsetDesc::zero <= univChar
		&& univChar < UnivCharsetDesc::zero + 10)) {
	  message(ParserMessages::switchLetterDigit,
		  NumberMessageArg(univChar));
	  valid = 0;
	}
      }
    }
  }
  return valid;
}

Boolean Parser::checkSwitchesMarkup(CharSwitcher &switcher)
{
  Boolean valid = 1;
  size_t nSwitches = switcher.nSwitches();
  for (size_t i = 0; i < nSwitches; i++)
    if (!switcher.switchUsed(i)) {
      // If the switch wasn't used,
      // then the character wasn't a markup character.
      message(ParserMessages::switchNotMarkup,
	      NumberMessageArg(switcher.switchFrom(i)));
      valid = 0;
    }
  return valid;
}

void Parser::checkSyntaxNames(const Syntax &syn)
{
  HashTableIter<StringC,Char> iter(syn.functionIter());
  const StringC *name;
  const Char *c;
  while (iter.next(name, c)) {
    for (size_t i = 1; i < name->size(); i++)
      if (!syn.isNameCharacter((*name)[i])) {
	message(ParserMessages::reservedNameSyntax,
		StringMessageArg(*name));
	break;
      }	
  }  
}

void Parser::checkSyntaxNamelen(const Syntax &syn)
{
  size_t namelen = syn.namelen();
  int i;
  for (i = 0; i < Syntax::nDelimGeneral; i++)
    if (syn.delimGeneral(i).size() > namelen)
      message(ParserMessages::delimiterLength,
	      StringMessageArg(syn.delimGeneral(i)),
	      NumberMessageArg(namelen));
  for (i = 0; i < syn.nDelimShortrefComplex(); i++)
    if (syn.delimShortrefComplex(i).size() > namelen)
      message(ParserMessages::delimiterLength,
	      StringMessageArg(syn.delimShortrefComplex(i)),
	      NumberMessageArg(namelen));
  for (i = 0; i < Syntax::nNames; i++)
    if (syn.reservedName(Syntax::ReservedName(i)).size() > namelen
	&& options().warnSgmlDecl)
      message(ParserMessages::reservedNameLength,
	      StringMessageArg(syn.reservedName(Syntax::ReservedName(i))),
	      NumberMessageArg(namelen));
}

Boolean Parser::univToDescCheck(const CharsetInfo &charset, UnivChar from,
				Char &to)
{
  WideChar c;
  ISet<WideChar> descSet;
  unsigned ret = charset.univToDesc(from, c, descSet);
  if (ret > 1) {
    if (options().warnSgmlDecl)
      message(ParserMessages::ambiguousDocCharacter,
	      CharsetMessageArg(descSet));
    ret = 1;
  }
  if (ret && c <= charMax) {
    to = Char(c);
    return 1;
  }
  return 0;
}

Boolean Parser::univToDescCheck(const CharsetInfo &charset, UnivChar from,
				Char &to, WideChar &count)
{
  WideChar c;
  ISet<WideChar> descSet;
  unsigned ret = charset.univToDesc(from, c, descSet, count);
  if (ret > 1) {
    if (options().warnSgmlDecl)
      message(ParserMessages::ambiguousDocCharacter,
	      CharsetMessageArg(descSet));
    ret = 1;
  }
  if (ret && c <= charMax) {
    to = Char(c);
    return 1;
  }
  return 0;
}

Boolean Parser::parseSdParam(const AllowedSdParams &allow,
			     SdParam &parm)
{
  for (;;) {
    Token token = getToken(sdMode);
    switch (token) {
    case tokenUnrecognized:
      if (reportNonSgmlCharacter())
	break;
      {
	message(ParserMessages::markupDeclarationCharacter,
		StringMessageArg(currentToken()),
		AllowedSdParamsMessageArg(allow, sdPointer()));
      }
      return 0;
    case tokenEe:
      if (allow.param(SdParam::eE)) {
	parm.type = SdParam::eE;
	if (currentMarkup())
	  currentMarkup()->addEntityEnd();
	popInputStack();
	return 1;
      }
      message(ParserMessages::sdEntityEnd,
	      AllowedSdParamsMessageArg(allow, sdPointer()));
      return 0;
    case tokenS:
      if (currentMarkup())
	currentMarkup()->addS(currentChar());
      break;
    case tokenCom:
      if (!parseComment(sdcomMode))
	return 0;
      break;
    case tokenDso:
    case tokenGrpo:
    case tokenMinusGrpo:
    case tokenPlusGrpo:
    case tokenRni:
    case tokenPeroNameStart:
    case tokenPeroGrpo:
      sdParamInvalidToken(token, allow);
      return 0;
    case tokenMinus:
      if (allow.param(SdParam::minus)) {
	parm.type = SdParam::minus;
	return 1;
      }
      sdParamInvalidToken(tokenMinus, allow);
      return 0;
    case tokenLita:
    case tokenLit:
      {
	Boolean lita = (token == tokenLita);
	if (allow.param(SdParam::minimumLiteral)) {
	  if (!parseMinimumLiteral(lita, parm.literalText))
	    return 0;
	  parm.type = SdParam::minimumLiteral;
	  if (currentMarkup())
	    currentMarkup()->addLiteral(parm.literalText);
	}
	else if (allow.param(SdParam::paramLiteral)) {
	  if (!parseSdParamLiteral(lita, parm.paramLiteralText))
	    return 0;
	  parm.type = SdParam::paramLiteral;
	}
	else if (allow.param(SdParam::systemIdentifier)) {
	  if (!parseSdSystemIdentifier(lita, parm.literalText))
	    return 0;
	  parm.type = SdParam::systemIdentifier;
	}
	else {
	  sdParamInvalidToken(token, allow);
	  return 0;
	}
	return 1;
      }
    case tokenMdc:
      if (allow.param(SdParam::mdc)) {
	parm.type = SdParam::mdc;
	if (currentMarkup())
	  currentMarkup()->addDelim(Syntax::dMDC);
	return 1;
      }
      sdParamInvalidToken(tokenMdc, allow);
      return 0;
    case tokenNameStart:
      {
	extendNameToken(syntax().namelen(), ParserMessages::nameLength);
	getCurrentToken(syntax().generalSubstTable(), parm.token);
	if (allow.param(SdParam::capacityName)) {
	  if (sd().lookupCapacityName(parm.token, parm.capacityIndex)) {
	    parm.type = SdParam::capacityName;
	    if (currentMarkup())
	      currentMarkup()->addName(currentInput());
	    return 1;
	  }
	}
	if (allow.param(SdParam::referenceReservedName)) {
	  if (syntax().lookupReservedName(parm.token,
					  &parm.reservedNameIndex)) {
	    parm.type = SdParam::referenceReservedName;
	    if (currentMarkup())
	      currentMarkup()->addName(currentInput());
	    return 1;
	  }
	}
	if (allow.param(SdParam::generalDelimiterName)) {
	  if (sd().lookupGeneralDelimiterName(parm.token,
					      parm.delimGeneralIndex)) {
	    parm.type = SdParam::generalDelimiterName;
	    if (currentMarkup())
	      currentMarkup()->addName(currentInput());
	    return 1;
	  }
	}
	if (allow.param(SdParam::quantityName)) {
	  if (sd().lookupQuantityName(parm.token, parm.quantityIndex)) {
	    parm.type = SdParam::quantityName;
	    if (currentMarkup())
	      currentMarkup()->addName(currentInput());
	    return 1;
	  }
	}
	for (int i = 0;; i++) {
	  SdParam::Type t = allow.get(i);
	  if (t == SdParam::invalid)
	    break;
	  if (t >= SdParam::reservedName) {
	    Sd::ReservedName sdReservedName
	      = Sd::ReservedName(t - SdParam::reservedName);
	    if (parm.token == sd().reservedName(sdReservedName)) {
	      parm.type = t;
	      if (currentMarkup())
		currentMarkup()->addSdReservedName(sdReservedName,
						  currentInput());
	      return 1;
	    }
	  }
	}
	if (allow.param(SdParam::name)) {
	  parm.type = SdParam::name;
	  if (currentMarkup())
	    currentMarkup()->addName(currentInput());
	  return 1;
	}
	{
	  message(ParserMessages::sdInvalidNameToken,
		  StringMessageArg(parm.token),
		  AllowedSdParamsMessageArg(allow, sdPointer()));
	}
	return 0;
      }
    case tokenDigit:
      if (allow.param(SdParam::number)) {
	extendNumber(syntax().namelen(), ParserMessages::numberLength);
	parm.type = SdParam::number;
	unsigned long n;
	if (!stringToNumber(currentInput()->currentTokenStart(),
			    currentInput()->currentTokenLength(),
			    n)
	    || n > Number(-1)) {
	  message(ParserMessages::numberTooBig,
		  StringMessageArg(currentToken()));
	  parm.n = Number(-1);
	}
	else {
	  if (currentMarkup())
	    currentMarkup()->addNumber(currentInput());
	  parm.n = Number(n);
	}
	Token token = getToken(sdMode);
	if (token == tokenNameStart)
	  message(ParserMessages::psRequired);
	currentInput()->ungetToken();
	return 1;
      }
      sdParamInvalidToken(tokenDigit, allow);
      return 0;
    default:
      CANNOT_HAPPEN();
    }
  }
}

// This is a separate function, because we might want SyntaxChar
// to be bigger than Char.

Boolean Parser::parseSdParamLiteral(Boolean lita, String<SyntaxChar> &str)
{
  Location loc(currentLocation());
  loc += 1;
  SdText text(loc, lita);	// first character of content
  str.resize(0);
  const unsigned refLitlen = Syntax::referenceQuantity(Syntax::qLITLEN);

  Mode mode = lita ? sdplitaMode : sdplitMode;
  for (;;) {
    Token token = getToken(mode);
    switch (token) {
    case tokenEe:
      message(ParserMessages::literalLevel);
      return 0;
    case tokenUnrecognized:
      if (reportNonSgmlCharacter())
	break;
      if (options().errorSignificant)
	message(ParserMessages::sdLiteralSignificant,
		StringMessageArg(currentToken()));
      text.addChar(currentChar(), currentLocation());
      break;
    case tokenCroDigit:
      {
	InputSource *in = currentInput();
	Location startLocation = currentLocation();
	in->discardInitial();
	extendNumber(syntax().namelen(), ParserMessages::numberLength);
	unsigned long n;
	Boolean valid;
	if (!stringToNumber(in->currentTokenStart(),
			    in->currentTokenLength(),
			    n)
	    || n > syntaxCharMax) {
	  message(ParserMessages::syntaxCharacterNumber,
		  StringMessageArg(currentToken()));
	  valid = 0;
	}
	else
	  valid = 1;
	Owner<Markup> markupPtr;
	if (eventsWanted().wantPrologMarkup()) {
	  markupPtr = new Markup;
	  markupPtr->addDelim(Syntax::dCRO);
	  markupPtr->addNumber(in);
	  switch (getToken(refMode)) {
	  case tokenRefc:
	    markupPtr->addDelim(Syntax::dREFC);
	    break;
	  case tokenRe:
	    markupPtr->addRefEndRe();
	    if (options().warnRefc)
	      message(ParserMessages::refc);
	    break;
	  default:
	    if (options().warnRefc)
	      message(ParserMessages::refc);
	    break;
	  }
	}
	else if (options().warnRefc) {
	  if (getToken(refMode) != tokenRefc)
	    message(ParserMessages::refc);
	}
	else
	  (void)getToken(refMode);
	if (valid)
	  text.addChar(SyntaxChar(n),
		       Location(new NumericCharRefOrigin(startLocation,
							 currentLocation().index()
							 + currentInput()->currentTokenLength()
							 - startLocation.index(),
							 markupPtr),
				0));
      }
      break;
    case tokenCroNameStart:
      if (!parseNamedCharRef())
	return 0;
      break;
    case tokenLit:
    case tokenLita:
      goto done;
    case tokenPeroNameStart:
    case tokenPeroGrpo:
      message(ParserMessages::sdParameterEntity);
      {
	Location loc(currentLocation());
	const Char *p = currentInput()->currentTokenStart();
	for (size_t count = currentInput()->currentTokenLength();
	     count > 0;
	     count--) {
	  text.addChar(*p++, loc);
	  loc += 1;
	}
      }
      break;
    case tokenChar:
      if (text.string().size() > refLitlen
	  && currentChar() == syntax().standardFunction(Syntax::fRE)) {
	message(ParserMessages::parameterLiteralLength, NumberMessageArg(refLitlen));
	// guess that the closing delimiter has been omitted
	message(ParserMessages::literalClosingDelimiter);
	return 0;
      }
      text.addChar(currentChar(), currentLocation());
      break;
    }
  }
 done:
  if (text.string().size() > refLitlen)
    message(ParserMessages::parameterLiteralLength,
	    NumberMessageArg(refLitlen));
  
  str = text.string();
  if (currentMarkup())
    currentMarkup()->addSdLiteral(text);
  return 1;
}

Boolean Parser::parseSdSystemIdentifier(Boolean lita, Text &text)
{
  text.addStartDelim(currentLocation());

  const unsigned refLitlen = Syntax::referenceQuantity(Syntax::qLITLEN);

  Mode mode = lita ? sdslitaMode : sdslitMode;
  for (;;) {
    Token token = getToken(mode);
    switch (token) {
    case tokenEe:
      message(ParserMessages::literalLevel);
      return 0;
    case tokenUnrecognized:
      if (reportNonSgmlCharacter())
	break;
      if (options().errorSignificant)
	message(ParserMessages::sdLiteralSignificant,
		StringMessageArg(currentToken()));
      text.addChar(currentChar(), currentLocation());
      break;
    case tokenLit:
    case tokenLita:
      text.addEndDelim(currentLocation(), token == tokenLita);
      goto done;
    case tokenChar:
      text.addChar(currentChar(), currentLocation());
      break;
    default:
      CANNOT_HAPPEN();
    }
  }
done:
  if (text.string().size() > refLitlen)
    message(ParserMessages::systemIdentifierLength,
	    NumberMessageArg(refLitlen));
  if (currentMarkup())
    currentMarkup()->addLiteral(text);
  return 1;
}

Boolean Parser::stringToNumber(const Char *s, size_t length,
			       unsigned long &result)
{
  unsigned long n = 0;
  if (length < 10) 
    for (; length > 0; length--, s++) 
      n = 10*n + sd().digitWeight(*s);
  else 
    for (; length > 0; length--, s++) {
      int val = sd().digitWeight(*s);
      if (n <= ULONG_MAX/10 && (n *= 10) <= ULONG_MAX - val)
        n += val;
      else
        return 0;
    }
  result = n;
  return 1;
}

void Parser::sdParamInvalidToken(Token token,
				 const AllowedSdParams &allow)
{
  message(ParserMessages::sdParamInvalidToken,
	  TokenMessageArg(token, sdMode, syntaxPointer(), sdPointer()),
	  AllowedSdParamsMessageArg(allow, sdPointer()));
}

void Parser::sdParamConvertToLiteral(SdParam &parm)
{
  if (parm.type == SdParam::number) {
    parm.type = SdParam::paramLiteral;
    parm.paramLiteralText.resize(1);
    parm.paramLiteralText[0] = parm.n;
  }
}

void Parser::requireWWW(SdBuilder &sdBuilder)
{
  if (!sdBuilder.www) {
    message(ParserMessages::wwwRequired);
    sdBuilder.www = 1;
  }
}

AllowedSdParams::AllowedSdParams(SdParam::Type arg1, SdParam::Type arg2,
				 SdParam::Type arg3, SdParam::Type arg4,
				 SdParam::Type arg5, SdParam::Type arg6)
{
  allow_[0] = arg1;
  allow_[1] = arg2;
  allow_[2] = arg3;
  allow_[3] = arg4;
  allow_[4] = arg5;
  allow_[5] = arg6;
}

Boolean AllowedSdParams::param(SdParam::Type t) const
{
  for (int i = 0; i < maxAllow && allow_[i] != SdParam::invalid; i++)
    if (t == allow_[i])
      return 1;
  return 0;
}

SdParam::Type AllowedSdParams::get(int i) const
{
  return i < 0 || i >= maxAllow ? SdParam::Type(SdParam::invalid) : allow_[i];
}

AllowedSdParamsMessageArg::AllowedSdParamsMessageArg(
  const AllowedSdParams &allow,
  const ConstPtr<Sd> &sd)
: allow_(allow), sd_(sd)
{
}

MessageArg *AllowedSdParamsMessageArg::copy() const
{
  return new AllowedSdParamsMessageArg(*this);
}

void AllowedSdParamsMessageArg::append(MessageBuilder &builder) const
{
  for (int i = 0;; i++) {
    SdParam::Type type = allow_.get(i);
    if (type == SdParam::invalid)
      break;
    if (i != 0)
      builder.appendFragment(ParserMessages::listSep);
    switch (type) {
    case SdParam::eE:
      builder.appendFragment(ParserMessages::entityEnd);
      break;
    case SdParam::minimumLiteral:
      builder.appendFragment(ParserMessages::minimumLiteral);
      break;
    case SdParam::mdc:
      {
	builder.appendFragment(ParserMessages::delimStart);
	Char c = sd_->execToInternal('>');
	builder.appendChars(&c, 1);
#if 0
	builder.appendFragment(ParserMessages::delimEnd);
#endif
      }
      break;
    case SdParam::number:
      builder.appendFragment(ParserMessages::number);
      break;
    case SdParam::name:
      builder.appendFragment(ParserMessages::name);
      break;
    case SdParam::paramLiteral:
      builder.appendFragment(ParserMessages::parameterLiteral);
      break;
    case SdParam::systemIdentifier:
      builder.appendFragment(ParserMessages::systemIdentifier);
      break;
    case SdParam::capacityName:
      builder.appendFragment(ParserMessages::capacityName);
      break;
    case SdParam::generalDelimiterName:
      builder.appendFragment(ParserMessages::generalDelimiteRoleName);
      break;
    case SdParam::referenceReservedName:
      builder.appendFragment(ParserMessages::referenceReservedName);
      break;
    case SdParam::quantityName:
      builder.appendFragment(ParserMessages::quantityName);
      break;
    case SdParam::minus:
      {
	StringC str(sd_->execToInternal("..."));
	builder.appendChars(str.data(), str.size());
	break;
      }
    default:
      {
	StringC str(sd_->reservedName(type - SdParam::reservedName));
	builder.appendChars(str.data(), str.size());
	break;
      }
    }
  }
}

SdBuilder::SdBuilder()
: valid(1), externalSyntax(0), enr(0), www(0), external(0)
{
}

void SdBuilder::addFormalError(const Location &location,
			       const MessageType1 &message,
			       const StringC &id)
{
  formalErrorList.insert(new SdFormalError(location, message, id));
}

SdFormalError::SdFormalError(const Location &location,
			     const MessageType1 &message,
			     const StringC &id)
: location_(location),
  message_(&message),
  id_(id)
{
}

void SdFormalError::send(ParserState &parser)
{
  parser.Messenger::setNextLocation(location_);
  parser.message(*message_, StringMessageArg(id_));
}

CharSwitcher::CharSwitcher()
{
}

void CharSwitcher::addSwitch(WideChar from, WideChar to)
{
  switches_.push_back(from);
  switches_.push_back(to);
  switchUsed_.push_back(0);
}

SyntaxChar CharSwitcher::subst(WideChar c)
{
  for (size_t i = 0; i < switches_.size(); i += 2)
    if (switches_[i] == c) {
      switchUsed_[i/2] = 1;
      return switches_[i + 1];
    }
  return c;
}

size_t CharSwitcher::nSwitches() const
{
  return switchUsed_.size();
}

Boolean CharSwitcher::switchUsed(size_t i) const
{
  return switchUsed_[i];
}

WideChar CharSwitcher::switchFrom(size_t i) const
{
  return switches_[i*2];
}

WideChar CharSwitcher::switchTo(size_t i) const
{
  return switches_[i*2 + 1];
}

CharsetMessageArg::CharsetMessageArg(const ISet<WideChar> &set)
: set_(set)
{
}

MessageArg *CharsetMessageArg::copy() const
{
  return new CharsetMessageArg(*this);
}

void CharsetMessageArg::append(MessageBuilder &builder) const
{
  ISetIter<WideChar> iter(set_);
  WideChar min, max;
  Boolean first = 1;
  while (iter.next(min, max)) {
    if (first)
      first = 0;
    else
      builder.appendFragment(ParserMessages::listSep);
    builder.appendNumber(min);
    if (max != min) {
      builder.appendFragment(max == min + 1
			     ? ParserMessages::listSep
			     : ParserMessages::rangeSep);
      builder.appendNumber(max);
    }
  }
}

#ifdef SP_NAMESPACE
}
#endif
