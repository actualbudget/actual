// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#include "splib.h"
#include "Parser.h"
#include "ParserMessages.h"
#include "MessageArg.h"
#include "TokenMessageArg.h"
#include "ModeInfo.h"
#include "Partition.h"
#include "SrInfo.h"
#include "Vector.h"
#include "ISetIter.h"
#include "token.h"
#include "TrieBuilder.h"
#include "macros.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

enum {
  modeUsedInSd = 01,
  modeUsedInProlog = 02,
  modeUsedInInstance = 04,
  modeUsesSr = 010
};

static struct {
  Mode mode;
  unsigned flags;
} modeTable[] = {
  { grpMode, modeUsedInProlog|modeUsedInInstance },
  { alitMode, modeUsedInProlog|modeUsedInInstance },
  { alitaMode, modeUsedInProlog|modeUsedInInstance },
  { aliteMode, modeUsedInProlog|modeUsedInInstance },
  { talitMode, modeUsedInProlog|modeUsedInInstance },
  { talitaMode, modeUsedInProlog|modeUsedInInstance },
  { taliteMode, modeUsedInProlog|modeUsedInInstance },
  { mdMode, modeUsedInProlog|modeUsedInInstance },
  { mdMinusMode, modeUsedInProlog },
  { mdPeroMode, modeUsedInProlog },
  { sdMode, modeUsedInSd },
  { comMode, modeUsedInProlog|modeUsedInInstance },
  { sdcomMode, modeUsedInSd },
  { piMode, modeUsedInProlog|modeUsedInInstance },
  { refMode, modeUsedInProlog|modeUsedInInstance|modeUsedInSd },
  { imsMode, modeUsedInProlog|modeUsedInInstance },
  { cmsMode, modeUsedInProlog|modeUsedInInstance },
  { rcmsMode, modeUsedInProlog|modeUsedInInstance },
  { proMode, modeUsedInProlog },
  { dsMode, modeUsedInProlog },
  { dsiMode, modeUsedInProlog },
  { plitMode, modeUsedInProlog },
  { plitaMode, modeUsedInProlog },
  { pliteMode, modeUsedInProlog },
  { sdplitMode, modeUsedInSd },
  { sdplitaMode, modeUsedInSd },
  { grpsufMode, modeUsedInProlog },
  { mlitMode, modeUsedInProlog|modeUsedInSd },
  { mlitaMode, modeUsedInProlog|modeUsedInSd },
  { asMode, modeUsedInProlog },
  { piPasMode, modeUsedInProlog },
  { slitMode, modeUsedInProlog },
  { slitaMode, modeUsedInProlog },
  { sdslitMode, modeUsedInSd },
  { sdslitaMode, modeUsedInSd },
  { cconMode, modeUsedInInstance },
  { rcconMode, modeUsedInInstance },
  { cconnetMode, modeUsedInInstance },
  { rcconnetMode, modeUsedInInstance },
  { rcconeMode, modeUsedInInstance },
  { tagMode, modeUsedInInstance },
  { econMode, modeUsedInInstance|modeUsesSr },
  { mconMode, modeUsedInInstance|modeUsesSr },
  { econnetMode, modeUsedInInstance|modeUsesSr },
  { mconnetMode, modeUsedInInstance|modeUsesSr },
};

void Parser::compileSdModes()
{
  Mode modes[nModes];
  int n = 0;
  for (size_t i = 0; i < SIZEOF(modeTable); i++)
    if (modeTable[i].flags & modeUsedInSd)
      modes[n++] = modeTable[i].mode;
  compileModes(modes, n, 0);
}

void Parser::compilePrologModes()
{
  Boolean scopeInstance = sd().scopeInstance();
  Boolean haveSr = syntax().hasShortrefs();
  Mode modes[nModes];
  int n = 0;
  for (size_t i = 0; i < SIZEOF(modeTable); i++) {
    if (scopeInstance) {
      if (modeTable[i].flags & modeUsedInProlog)
	modes[n++] = modeTable[i].mode;
    }
    else if (haveSr) {
      if ((modeTable[i].flags & (modeUsedInInstance|modeUsedInProlog))
	  && !(modeTable[i].flags & modeUsesSr))
	modes[n++] = modeTable[i].mode;
    }
    else {
      if (modeTable[i].flags & (modeUsedInInstance|modeUsedInProlog))
	modes[n++] = modeTable[i].mode;
    }
  }
  compileModes(modes, n, 0);
}

void Parser::compileInstanceModes()
{
  Boolean scopeInstance = sd().scopeInstance();
  compileNormalMap();
  if (!scopeInstance && !syntax().hasShortrefs())
    return;
  Mode modes[nModes];
  int n = 0;
  for (size_t i = 0; i < SIZEOF(modeTable); i++) {
    if (scopeInstance) {
      if (modeTable[i].flags & modeUsedInInstance)
	modes[n++] = modeTable[i].mode;
    }
    else {
      if (modeTable[i].flags & modeUsesSr)
	modes[n++] = modeTable[i].mode;
    }
  }
  compileModes(modes, n, &currentDtd());
}

void Parser::compileModes(const Mode *modes,
			  int n,
			  const Dtd *dtd)
{
  PackedBoolean sets[Syntax::nSet];
  PackedBoolean delims[Syntax::nDelimGeneral];
  PackedBoolean functions[3];
  int i;
  Boolean includesShortref = 0;
  for (i = 0; i < Syntax::nSet; i++)
    sets[i] = 0;
  for (i = 0; i < Syntax::nDelimGeneral; i++)
    delims[i] = 0;
  for (i = 0; i < 3; i++)
    functions[i] = 0;
  
  for (i = 0; i < n; i++) {
    ModeInfo iter(modes[i], sd());
    TokenInfo ti;
    while (iter.nextToken(&ti)) {
      switch (ti.type) {
      case TokenInfo::delimType:
	delims[ti.delim1] = 1;
	break;
      case TokenInfo::delimDelimType:
	delims[ti.delim1] = 1;
	delims[ti.delim2] = 1;
	break;
      case TokenInfo::delimSetType:
	delims[ti.delim1] = 1;
	// fall through
      case TokenInfo::setType:
	sets[ti.set] = 1;
	break;
      case TokenInfo::functionType:
	functions[ti.function] = 1;
	break;
      }
    }
    if (!includesShortref && iter.includesShortref())
      includesShortref = 1;
  }

  ISet<Char> chars;

  for (i = 0; i < 3; i++)
    if (functions[i])
      chars.add(syntax().standardFunction(i));
  for (i = 0; i < Syntax::nDelimGeneral; i++)
    if (delims[i]) {
      const StringC &str = syntax().delimGeneral(i);
      for (size_t j = 0; j < str.size(); j++)
	chars.add(str[j]);
    }
  if (includesShortref && dtd) {
    size_t n = dtd->nShortref();
    for (size_t i = 0; i < n; i++) {
      const StringC &delim = dtd->shortref(i);
      size_t len = delim.size();
      for (size_t j = 0; j < len; j++)
	if (delim[j] == sd().execToInternal('B'))
	  sets[Syntax::blank] = 1;
	else
	  chars.add(delim[j]);
    }
  }

  const ISet<Char> *csets[Syntax::nSet];
  int usedSets = 0;
  for (i = 0; i < Syntax::nSet; i++)
    if (sets[i])
      csets[usedSets++] = syntax().charSet(i);

  Partition partition(chars, csets, usedSets, *syntax().generalSubstTable());

  String<EquivCode> setCodes[Syntax::nSet];
  
  int nCodes = 0;
  for (i = 0; i < Syntax::nSet; i++)
    if (sets[i])
      setCodes[i] = partition.setCodes(nCodes++);

  String<EquivCode> delimCodes[Syntax::nDelimGeneral];
  for (i = 0; i < Syntax::nDelimGeneral; i++)
    if (delims[i]) {
      StringC str = syntax().delimGeneral(i);
      for (size_t j = 0; j < str.size(); j++)
	delimCodes[i] += partition.charCode(str[j]);
    }

  String<EquivCode> functionCode[3];
  for (i = 0; i < 3; i++)
    if (functions[i])
      functionCode[i] += partition.charCode(syntax().standardFunction(i));

  Vector<SrInfo> srInfo;
      
  int nShortref;
  if (!includesShortref || !dtd)
    nShortref = 0;
  else {
    nShortref = dtd->nShortref();
    srInfo.resize(nShortref);

    for (i = 0; i < nShortref; i++) {
      const StringC delim = dtd->shortref(i);
      SrInfo *p = &srInfo[i];
      size_t j;
      for (j = 0; j < delim.size(); j++) {
	if (delim[j] == sd().execToInternal('B'))
	  break;
	p->chars += partition.charCode(delim[j]);
      }
      if (j < delim.size()) {
	p->bSequenceLength = 1;
	for (++j; j < delim.size(); j++) {
	  if (delim[j] != sd().execToInternal('B'))
	    break;
	  p->bSequenceLength += 1;
	}
	for (; j < delim.size(); j++)
	  p->chars2 += partition.charCode(delim[j]);
      }
      else
	p->bSequenceLength = 0;
    }
  }

  String<EquivCode> dataDelimCodes;
  if (options().warnDataDelim) {
    ModeInfo iter(mconMode, sd());
    TokenInfo ti;
    while (iter.nextToken(&ti)) {
      switch (ti.type) {
      case TokenInfo::delimType:
      case TokenInfo::delimDelimType:
      case TokenInfo::delimSetType:
	{
	  if (ti.token == tokenMscMdc)
	    break;
	  const StringC &delim = syntax().delimGeneral(ti.delim1);
	  if (!delim.size())
	    break;
	  EquivCode c = partition.charCode(delim[0]);
	  for (size_t i = 0; ; i++) {
	    if (i >= dataDelimCodes.size()) {
	      dataDelimCodes += c;
	      break;
	    }
	    if (dataDelimCodes[i] == c)
	      break;
	  }
	}
	break;
      default:
	break;
      }
    }
  }

  const String<EquivCode> emptyString;
  Boolean multicode = syntax().multicode();
  for (i = 0; i < n; i++) {
    TrieBuilder tb(partition.maxCode() + 1);
    TrieBuilder::TokenVector ambiguities;
    Vector<Token> suppressTokens;
    if (multicode) {
      suppressTokens.assign(partition.maxCode() + 1, 0);
      suppressTokens[partition.eECode()] = tokenEe;
    }
    tb.recognizeEE(partition.eECode(), tokenEe);
    ModeInfo iter(modes[i], sd());
    TokenInfo ti;
    // We try to handle the possibility that some delimiters may be empty;
    // this might happen when compiling recognizers for the SGML declaration.
    while (iter.nextToken(&ti)) {
      switch (ti.type) {
      case TokenInfo::delimType:
	if (delimCodes[ti.delim1].size() > 0)
	  tb.recognize(delimCodes[ti.delim1], ti.token,
		       ti.priority, ambiguities);
	break;
      case TokenInfo::delimDelimType:
	{
	  String<EquivCode> str(delimCodes[ti.delim1]);
	  if (str.size() > 0 && delimCodes[ti.delim2].size() > 0) {
	    str += delimCodes[ti.delim2];
	    tb.recognize(str, ti.token, ti.priority, ambiguities);
	  }
	}
	break;
      case TokenInfo::delimSetType:
	if (delimCodes[ti.delim1].size() > 0)
	  tb.recognize(delimCodes[ti.delim1], setCodes[ti.set],
		       ti.token, ti.priority, ambiguities);
	break;
      case TokenInfo::setType:
	tb.recognize(emptyString, setCodes[ti.set], ti.token,
		     ti.priority, ambiguities);
	if (multicode) {
	  const String<EquivCode> &equivCodes = setCodes[ti.set];
	  for (size_t j = 0; j < equivCodes.size(); j++)
	    suppressTokens[equivCodes[j]] = ti.token;
	}
	break;
      case TokenInfo::functionType:
	tb.recognize(functionCode[ti.function], ti.token,
		     ti.priority, ambiguities);
	if (multicode)
	  suppressTokens[functionCode[ti.function][0]] = ti.token;
	break;
      }
    }
    if (iter.includesShortref()) {
      for (int j = 0; j < nShortref; j++) {
	const SrInfo *p = &srInfo[j];
	if (p->bSequenceLength > 0)
	  tb.recognizeB(p->chars, p->bSequenceLength,
			syntax().quantity(Syntax::qBSEQLEN),
			setCodes[Syntax::blank],
			p->chars2, tokenFirstShortref + j,
			ambiguities);
	else
	  tb.recognize(p->chars, tokenFirstShortref + j,
		       Priority::delim, ambiguities);
      }
    }
    if (options().warnDataDelim) {
      switch (modes[i]) {
      default:
        if (!iter.includesShortref())
	  break;
	// fall through
      case alitMode:
      case alitaMode:
      case aliteMode:
      case talitMode:
      case talitaMode:
      case taliteMode:
	for (size_t j = 0; j < dataDelimCodes.size(); j++) {
	  String<EquivCode> code;
	  code += dataDelimCodes[j];
	  tb.recognize(code, tokenCharDelim, Priority::dataDelim, ambiguities);
	}
	break;
      case plitMode:
      case plitaMode:
      case pliteMode:
	{
	  String<EquivCode> code;
	  code += partition.charCode(syntax().delimGeneral(Syntax::dPERO)[0]);
	  tb.recognize(code, tokenCharDelim, Priority::dataDelim, ambiguities);
	}
	break;
      }
    }
    setRecognizer(modes[i],
		  (multicode
		   ? new Recognizer(tb.extractTrie(), partition.map(),
				    suppressTokens)
		   : new Recognizer(tb.extractTrie(), partition.map())));
    // FIXME give more information
    for (size_t j = 0; j < ambiguities.size(); j += 2)
      message(ParserMessages::lexicalAmbiguity,
	      TokenMessageArg(ambiguities[j], modes[i], syntaxPointer(),
			      sdPointer()),
	      TokenMessageArg(ambiguities[j + 1], modes[i], syntaxPointer(),
			      sdPointer()));
  }
}

void Parser::compileNormalMap()
{
  XcharMap<PackedBoolean> map(0);
  ISetIter<Char> sgmlCharIter(*syntax().charSet(Syntax::sgmlChar));
  Char min, max;
  while (sgmlCharIter.next(min, max))
    map.setRange(min, max, 1);
  ModeInfo iter(mconnetMode, sd());
  TokenInfo ti;
  while (iter.nextToken(&ti)) {
    switch (ti.type) {
    case TokenInfo::delimType:
    case TokenInfo::delimDelimType:
    case TokenInfo::delimSetType:
      {
	const StringC &delim = syntax().delimGeneral(ti.delim1);
	if (!delim.size())
	  break;
	Char c = delim[0];
	map.setChar(c, 0);
	StringC str(syntax().generalSubstTable()->inverse(c));
	for (size_t i = 0; i < str.size(); i++)
	  map.setChar(str[i], 0);
      }
      break;
    case TokenInfo::setType:
      if (ti.token != tokenChar) {
	ISetIter<Char> setIter(*syntax().charSet(ti.set));
	Char min, max;
	while (setIter.next(min, max))
	  map.setRange(min, max, 0);
      }
      break;
    case TokenInfo::functionType:
      if (ti.token != tokenChar)
	map.setChar(syntax().standardFunction(ti.function), 0);
      break;
    }
  }
  int nShortref = currentDtd().nShortref();
  for (int i = 0; i < nShortref; i++) {
    Char c = currentDtd().shortref(i)[0];
    if (c == sd().execToInternal('B')) {
      ISetIter<Char> setIter(*syntax().charSet(Syntax::blank));
      Char min, max;
      while (setIter.next(min, max))
	map.setRange(min, max, 0);
    }
    else {
      map.setChar(c, 0);
      StringC str(syntax().generalSubstTable()->inverse(c));
      for (size_t j = 0; j < str.size(); j++)
	map.setChar(str[j], 0);
    }
  }
  setNormalMap(map);
}

void Parser::addNeededShortrefs(Dtd &dtd, const Syntax &syntax)
{
  if (!syntax.hasShortrefs())
    return;
  PackedBoolean delimRelevant[Syntax::nDelimGeneral];
  size_t i;
  for (i = 0; i < Syntax::nDelimGeneral; i++)
    delimRelevant[i] = 0;
  ModeInfo iter(mconnetMode, sd());
  TokenInfo ti;
  while (iter.nextToken(&ti)) {
    switch (ti.type) {
    case TokenInfo::delimType:
    case TokenInfo::delimDelimType:
    case TokenInfo::delimSetType:
      delimRelevant[ti.delim1] = 1;
      break;
    default:
      break;
    }
  }

  // PIO and NET are the only delimiters that are recognized in con
  // mode without context.  If a short reference delimiter is
  // identical to one of these delimiters, then we'll have an
  // ambiguity.   We make such a short reference delimiter needed
  // to ensure that this ambiguity is reported.
  if (syntax.isValidShortref(syntax.delimGeneral(Syntax::dPIO)))
    dtd.addNeededShortref(syntax.delimGeneral(Syntax::dPIO));
  if (syntax.isValidShortref(syntax.delimGeneral(Syntax::dNET)))
    dtd.addNeededShortref(syntax.delimGeneral(Syntax::dNET));

  size_t nShortrefComplex = syntax.nDelimShortrefComplex();

  // A short reference delimiter is needed if it is used or if it can
  // contains some other shorter delimiter that is either a relevant general
  // delimiter or a shortref delimiter that is used.

  for (i = 0; i < nShortrefComplex; i++) {
    size_t j;
    for (j = 0; j < Syntax::nDelimGeneral; j++)
      if (delimRelevant[j]
	  && shortrefCanPreemptDelim(syntax.delimShortrefComplex(i),
				     syntax.delimGeneral(j),
				     0,
				     syntax)) {
	dtd.addNeededShortref(syntax.delimShortrefComplex(i));
	break;
      }
    for (j = 0; j < dtd.nShortref(); j++)
      if (shortrefCanPreemptDelim(syntax.delimShortrefComplex(i),
				  dtd.shortref(j),
				  1,
				  syntax)) {
	dtd.addNeededShortref(syntax.delimShortrefComplex(i));
	break;
      }
  }
  
}

Boolean Parser::shortrefCanPreemptDelim(const StringC &sr,
					const StringC &d,
					Boolean dIsSr,
					const Syntax &syntax)
{
  Char letterB = sd().execToInternal('B');
  for (size_t i = 0; i < sr.size(); i++) {
    size_t j = 0;
    size_t k = i;
    for (;;) {
      if (j == d.size())
	return 1;
      if (k >= sr.size())
	break;
      if (sr[k] == letterB) {
	if (dIsSr && d[j] == letterB) {
	  j++;
	  k++;
	}
	else if (syntax.isB(d[j])) {
	  j++;
	  k++;
	  if (k == sr.size() || sr[k] != letterB) {
	    // it was the last B in the sequence
	    while (j < d.size() && syntax.isB(d[j]))
	      j++;
	  }
	}
	else
	  break;
      }
      else if (dIsSr && d[j] == letterB) {
	if (syntax.isB(sr[k])) {
	  ++j;
	  ++k;
	  if (j < d.size() && d[j] != letterB) {
	    while (k < sr.size() && syntax.isB(sr[k]))
	      k++;
	  }
	}
	else
	  break;
      }
      else if (d[j] == sr[k]) {
	j++;
	k++;
      }
      else
	break;
    }
  }
  return 0;
}

#ifdef SP_NAMESPACE
}
#endif
