// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "Syntax.h"
#include "Sd.h"
#include "CharsetInfo.h"
#include "ISetIter.h"
#include "macros.h"
#include "MarkupScan.h"
#include "constant.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

const int Syntax::referenceQuantity_[] = {
  40,
  960,
  960,
  16,
  16,
  16,
  32,
  96,
  16,
  240,
  8,
  2,
  240,
  960,
  24
};

Syntax::Syntax(const Sd &sd)
: generalSubst_(0),
  entitySubst_(0),
  categoryTable_(otherCategory),
  shuncharControls_(0),
  multicode_(0),
  hasMarkupScanTable_(0)
{
  static const char lcletter[] = "abcdefghijklmnopqrstuvwxyz";
  static const char ucletter[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  int i;
  for (i = 0; i < 26; i++) {
    Char lc = sd.execToInternal(lcletter[i]);
    Char uc = sd.execToInternal(ucletter[i]); 
    set_[nameStart] += lc;
    set_[nameStart] += uc;
    set_[minimumData] += lc;
    set_[minimumData] += uc;
    set_[significant] += lc;
    set_[significant] += uc;
    if (i < 6) {
      set_[hexDigit] += lc;
      set_[hexDigit] += uc;
    }
    categoryTable_.setChar(lc, nameStartCategory);
    categoryTable_.setChar(uc, nameStartCategory);
    subst(lc, uc);
  }
  static const char digits[] = "0123456789";
  for (i = 0; i < 10; i++) {
    Char c = sd.execToInternal(digits[i]);
    set_[digit] += c;
    set_[hexDigit] += c;
    set_[minimumData] += c;
    set_[significant] += c;
    categoryTable_.setChar(c, digitCategory);
  }
  static const char special[] = "'()+,-./:=?";
  for (i = 0; special[i] != '\0'; i++) {
    Char c = sd.execToInternal(special[i]);
    set_[minimumData] += c;
    set_[significant] += c;
  }

  if (sd.www()) {
    static const char wwwSpecial[] = { 33, 35, 36, 37, 42, 59, 64, 95, 0 };
    for (i = 0; wwwSpecial[i] != '\0'; i++) {
      const CharsetInfo &charset = sd.internalCharset();
      WideChar c;
      ISet<WideChar> set;
      if (charset.univToDesc(wwwSpecial[i], c, set) > 0 && c <= charMax) {
	set_[minimumData] += Char(c);
	set_[significant] += c;
      }
    }
  }

  for (i = 0; i < nQuantity; i++)
    quantity_[i] = referenceQuantity_[i];
  for (i = 0; i < 3; i++)
    standardFunctionValid_[i] = 0;
}

Syntax::~Syntax() {}

void Syntax::addNameCharacters(const ISet<Char> &set)
{
  ISetIter<Char> iter(set);
  Char min, max;
  while (iter.next(min, max)) {
    set_[nmchar].addRange(min, max);
    set_[significant].addRange(min, max);
    categoryTable_.setRange(min, max, otherNameCategory);
  }
}

void Syntax::addNameStartCharacters(const ISet<Char> &set)
{
  ISetIter<Char> iter(set);
  Char min, max;
  while (iter.next(min, max)) {
    set_[nameStart].addRange(min, max);
    set_[significant].addRange(min, max);
    categoryTable_.setRange(min, max, nameStartCategory);
  }
}

void Syntax::addSubst(Char lc, Char uc)
{
  subst(lc, uc);
}

void Syntax::setStandardFunction(StandardFunction f, Char c)
{
  standardFunction_[f] = c;
  standardFunctionValid_[f] = 1;
  set_[minimumData] += c;
  set_[s] += c;
  categoryTable_.setChar(c, sCategory);
  set_[functionChar] += c;
  set_[significant] += c;
  switch (f) {
  case fSPACE:
    set_[blank] += c;
    break;
  case fRE:
  case fRS:
    break;
  }
}

void Syntax::enterStandardFunctionNames()
{
  static Syntax::ReservedName name[3] = {
    rRE, rRS, rSPACE
  };
  for (int i = 0; i < 3; i++)
    if (standardFunctionValid_[i])
      functionTable_.insert(reservedName(name[i]), standardFunction_[i]);
}

void Syntax::setDelimGeneral(int i, const StringC &str)
{
  delimGeneral_[i] = str;
  for (size_t j = 0; j < str.size(); j++)
    set_[significant] += str[j];
}

void Syntax::addDelimShortref(const StringC &str, const CharsetInfo &charset)
{
  if (str.size() == 1 && str[0] != charset.execToDesc('B') && !isB(str[0]))
    delimShortrefSimple_.add(str[0]);
  else
    delimShortrefComplex_.push_back(str);
  for (size_t i = 0; i < str.size(); i++)
    set_[significant] += str[i];
}

void Syntax::addDelimShortrefs(const ISet<Char> &shortrefChars,
			       const CharsetInfo &charset)
{
  ISetIter<Char> blankIter(set_[blank]);
  Char min, max;
  StringC specialChars;
  while (blankIter.next(min, max)) {
    do {
      specialChars += min;
    } while (min++ != max);
  }
  specialChars += charset.execToDesc('B');
  const ISet<Char> *simpleCharsPtr = &shortrefChars;
  ISet<Char> simpleChars;
  for (size_t i = 0; i < specialChars.size(); i++)
    if (shortrefChars.contains(specialChars[i])) {
      if (simpleCharsPtr != &simpleChars) {
	simpleChars = shortrefChars;
	simpleCharsPtr = &simpleChars;
      }
      simpleChars.remove(specialChars[i]);
    }
  ISetIter<Char> iter(*simpleCharsPtr);
  while (iter.next(min, max)) {
    delimShortrefSimple_.addRange(min, max);
    set_[significant].addRange(min, max);
  }
}

void Syntax::addFunctionChar(const StringC &str, FunctionClass fun, Char c)
{
  switch (fun) {
  case cFUNCHAR:
    break;
  case cSEPCHAR:
    set_[s] += c;
    categoryTable_.setChar(c, sCategory);
    set_[blank] += c;
    set_[sepchar] += c;
    break;
  case cMSOCHAR:
    multicode_ = 1;
    if (!hasMarkupScanTable_) {
      markupScanTable_ = XcharMap<unsigned char>(MarkupScan::normal);
      hasMarkupScanTable_ = 1;
    }
    markupScanTable_.setChar(c, MarkupScan::out);
    break;
  case cMSICHAR:
    // don't need to do anything special if we just have MSICHARs
    if (!hasMarkupScanTable_) {
      markupScanTable_ = XcharMap<unsigned char>(MarkupScan::normal);
      hasMarkupScanTable_ = 1;
    }
    markupScanTable_.setChar(c, MarkupScan::in);
    break;
  case cMSSCHAR:
    multicode_ = 1;
    if (!hasMarkupScanTable_) {
      markupScanTable_ = XcharMap<unsigned char>(MarkupScan::normal);
      hasMarkupScanTable_ = 1;
    }
    markupScanTable_.setChar(c, MarkupScan::suppress);
    break;
  }
  set_[functionChar] += c;
  set_[significant] += c;
  functionTable_.insert(str, c);
}

void Syntax::setName(int i, const StringC &str)
{
  names_[i] = str;
  nameTable_.insert(str, i);
}

void Syntax::setNamecaseGeneral(Boolean b)
{
  namecaseGeneral_ = b;
  generalSubst_ = b ? &upperSubst_ : &identitySubst_;
}

void Syntax::setNamecaseEntity(Boolean b)
{
  namecaseEntity_ = b;
  entitySubst_ = b ? &upperSubst_ : &identitySubst_;
}

void Syntax::subst(Char from, Char to)
{
  upperSubst_.addSubst(from, to);
}

void Syntax::addShunchar(Char c)
{
  shunchar_.add(c);
}

Boolean Syntax::lookupReservedName(const StringC &str,
				   ReservedName *result) const
{
  const int *tem = nameTable_.lookup(str);
  if (tem) {
    *result = ReservedName(*tem);
    return 1;
  }
  else
    return 0;
}

Boolean Syntax::lookupFunctionChar(const StringC &name, Char *result) const
{
  const Char *p = functionTable_.lookup(name);
  if (p) {
    *result = *p;
    return 1;
  }
  else
    return 0;
}

#ifdef __GNUG__
typedef HashTableIter<StringC,Char> Dummy_HashTableIter_StringC_Char;
#endif

HashTableIter<StringC,Char> Syntax::functionIter() const
{
  return HashTableIter<StringC,Char>(functionTable_);
}

Boolean Syntax::charFunctionName(Char c, const StringC *&name) const
{
  HashTableIter<StringC,Char> iter(functionTable_);
  const Char *cp;
  while (iter.next(name, cp))
    if (*cp == c)
      return 1;
  return 0;
}

Boolean Syntax::isValidShortref(const StringC &str) const
{
  if (str.size() == 1 && delimShortrefSimple_.contains(str[0]))
    return 1;
  for (size_t i = 0; i < delimShortrefComplex_.size(); i++)
    if (str == delimShortrefComplex_[i])
      return 1;
  return 0;
}

void Syntax::implySgmlChar(const Sd &sd)
			   
{
  const CharsetInfo &internalCharset = sd.internalCharset();
  internalCharset.getDescSet(set_[sgmlChar]);
  ISet<WideChar> invalid;
  checkSgmlChar(sd, 0, 0, invalid);
  ISetIter<WideChar> iter(invalid);
  WideChar min, max;
  while (iter.next(min, max)) {
    do {
      if (min <= charMax)
	set_[sgmlChar].remove(Char(min));
    } while (min++ != max);
  }
}

void Syntax::checkSgmlChar(const Sd &sd,
			   const ::SP_NAMESPACE_SCOPE Syntax *otherSyntax,
			   Boolean invalidUseDocumentCharset,
			   ISet<WideChar> &invalid) const
{
  ISetIter<Char> iter(shunchar_);
  Char min, max;
  while (iter.next(min, max)) {
    if (min <= max) {
      do {
	Char c;
	if (!sd.internalCharsetIsDocCharset()) {
	  UnivChar univ;
	  WideChar tem;
	  ISet<WideChar> set;
	  if (sd.docCharset().descToUniv(min, univ)
	      && sd.internalCharset().univToDesc(univ, tem, set)
	      && tem <= charMax)
	    c = Char(tem);
	  else {
	    const PublicId *base;
	    StringC lit;
	    Number n;
	    CharsetDeclRange::Type type;
	    // If it's a declared but unknown character,
	    // then it can't be significant,
	    if (invalidUseDocumentCharset
	        && sd.docCharsetDecl().getCharInfo(min,
		                                   base,
						   type,
						   n,
						   lit)
		&& type != CharsetDeclRange::unused)
	      invalid += min;
	    continue;
	  }
	}
	else
	  c = min;
	if (!set_[significant].contains(c)
	    && (!otherSyntax || !otherSyntax->set_[significant].contains(c))
	    && set_[sgmlChar].contains(c))
	 invalid += invalidUseDocumentCharset ? min : c;
      } while (min++ != max);
    }
  }
  if (shuncharControls_) {
    UnivChar i;
    const CharsetInfo &charset = invalidUseDocumentCharset ? sd.docCharset() : sd.internalCharset();
    for (i = 0; i < 32; i++)
      checkUnivControlChar(i, charset, otherSyntax, invalid);
    for (i = 127; i < 160; i++)
      checkUnivControlChar(i, charset, otherSyntax, invalid);
  }
}

void Syntax::checkUnivControlChar(UnivChar univChar,
				  const CharsetInfo &internalCharset,
				  const ::SP_NAMESPACE_SCOPE Syntax *otherSyntax,
				  ISet<WideChar> &invalid) const
{
  WideChar c;
  ISet<WideChar> set;
  switch (internalCharset.univToDesc(univChar, c, set)) {
  case 0:
    break;
  case 1:
    set += c;
    // fall through
  default:
    {
      ISetIter<WideChar> iter(set);
      WideChar min, max;
      while (iter.next(min, max)) {
	do {
	  if (min > charMax)
	    break;
	  Char ch = Char(min);
	  if (!set_[significant].contains(ch)
	      && (!otherSyntax
		  || !otherSyntax->set_[significant].contains(ch))
	      && set_[sgmlChar].contains(ch))
	    invalid += ch;
	} while (min++ != max);
      }
    }
  }
}

StringC Syntax::rniReservedName(ReservedName i) const
{
  StringC result = delimGeneral(dRNI);
  result += reservedName(i);
  return result;
}

const SubstTable &Syntax::upperSubstTable() const
{
  return upperSubst_;
}

const StringC &Syntax::peroDelim() const
{
  return delimGeneral(dPERO);
}

Boolean Syntax::isHexDigit(Xchar c) const
{
  switch (categoryTable_[c]) {
  case digitCategory:
    return 1;
  case nameStartCategory:
    break;
  default:
    return 0;
  }
  return set_[hexDigit].contains(Char(c));
}

void Syntax::addEntity(const StringC &name, Char c)
{
  entityNames_.push_back(name);
  entityChars_ += c;
}

#ifdef SP_NAMESPACE
}
#endif
