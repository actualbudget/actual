// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef Syntax_INCLUDED
#define Syntax_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "types.h"
#include "Boolean.h"
#include "ISet.h"
#include "StringC.h"
#include "SubstTable.h"
#include "HashTable.h"
#include "Vector.h"
#include "Resource.h"
#include "XcharMap.h"
#include "EntityCatalog.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class Sd;
class CharsetInfo;

class SP_API Syntax : public Resource, public EntityCatalog::Syntax {
public:
  enum ReservedName {
    rALL,
    rANY,
    rATTLIST,
    rCDATA,
    rCONREF,
    rCURRENT,
    rDATA,
    rDEFAULT,
    rDOCTYPE,
    rELEMENT,
    rEMPTY,
    rENDTAG,
    rENTITIES,
    rENTITY,
    rFIXED,
    rID,
    rIDLINK,
    rIDREF,
    rIDREFS,
    rIGNORE,
    rIMPLICIT,
    rIMPLIED,
    rINCLUDE,
    rINITIAL,
    rLINK,
    rLINKTYPE,
    rMD,
    rMS,
    rNAME,
    rNAMES,
    rNDATA,
    rNMTOKEN,
    rNMTOKENS,
    rNOTATION,
    rNUMBER,
    rNUMBERS,
    rNUTOKEN,
    rNUTOKENS,
    rO,
    rPCDATA,
    rPI,
    rPOSTLINK,
    rPUBLIC,
    rRCDATA,
    rRE,
    rREQUIRED,
    rRESTORE,
    rRS,
    rSDATA,
    rSHORTREF,
    rSIMPLE,
    rSPACE,
    rSTARTTAG,
    rSUBDOC,
    rSYSTEM,
    rTEMP,
    rUSELINK,
    rUSEMAP
  };
  enum { nNames = rUSEMAP + 1 };
  enum Quantity {
    qATTCNT,
    qATTSPLEN,
    qBSEQLEN,
    qDTAGLEN,
    qDTEMPLEN,
    qENTLVL,
    qGRPCNT,
    qGRPGTCNT,
    qGRPLVL,
    qLITLEN,
    qNAMELEN,
    qNORMSEP,
    qPILEN,
    qTAGLEN,
    qTAGLVL
  };
  enum { nQuantity = qTAGLVL + 1 };
  enum { unlimited = 100000000 };
  enum DelimGeneral {
    dAND,
    dCOM,
    dCRO,
    dDSC,
    dDSO,
    dDTGC,
    dDTGO,
    dERO,
    dETAGO,
    dGRPC,
    dGRPO,
    dHCRO, // WWW TC addition
    dLIT,
    dLITA,
    dMDC,
    dMDO,
    dMINUS,
    dMSC,
    dNET,
    dNESTC, // WWW TC addition
    dOPT,
    dOR,
    dPERO,
    dPIC,
    dPIO,
    dPLUS,
    dREFC,
    dREP,
    dRNI,
    dSEQ,
    dSTAGO,
    dTAGC,
    dVI
  };
  enum { nDelimGeneral = dVI + 1 };
  enum StandardFunction {
    fRE,
    fRS,
    fSPACE
  };
  enum FunctionClass {
    cFUNCHAR,
    cSEPCHAR,
    cMSOCHAR,
    cMSICHAR,
    cMSSCHAR
  };
  enum Set {
    nameStart,
    digit,
    hexDigit,
    nmchar,			// LCNMCHAR or UCNMCHAR
    s,
    blank,
    sepchar,
    minimumData,
    significant,
    functionChar,		// function character
    sgmlChar
  };
  enum { nSet = sgmlChar + 1 };
  enum Category {
    otherCategory = 0,
    sCategory = 01,
    nameStartCategory = 02,
    digitCategory = 04,
    otherNameCategory = 010
    };

  Syntax(const Sd &);
  virtual ~Syntax();
  Boolean lookupFunctionChar(const StringC &, Char *) const;
  HashTableIter<StringC,Char> functionIter() const;
  Boolean charFunctionName(Char c, const StringC *&name) const;
  Boolean lookupReservedName(const StringC &, ReservedName *) const;
  const StringC &reservedName(ReservedName) const;
  StringC rniReservedName(ReservedName) const;
  Number quantity(Quantity) const;
  Char standardFunction(int) const;
  Boolean getStandardFunction(int, Char &) const;
  const StringC &delim() const;
  const ISet<Char> *charSet(int i) const;
  const SubstTable *generalSubstTable() const;
  const SubstTable *entitySubstTable() const;
  const SubstTable &upperSubstTable() const;
  Boolean namecaseGeneral() const;
  Boolean namecaseEntity() const;
  const StringC &peroDelim() const;
  const StringC &delimGeneral(int) const;
  const StringC &delimShortrefComplex(size_t) const;
  const ISet<Char> &delimShortrefSimple() const;
  int nDelimShortrefComplex() const;
  Boolean isValidShortref(const StringC &) const;
  Boolean hasShortrefs() const;
  Boolean isNameCharacter(Xchar) const;
  Boolean isNameStartCharacter(Xchar) const;
  Boolean isDigit(Xchar) const;
  Boolean isHexDigit(Xchar) const;
  Boolean isS(Xchar) const;
  Boolean isB(Xchar c) const;
  Category charCategory(Xchar) const;
  Boolean isSgmlChar(Xchar) const;
  size_t attcnt() const;
  size_t attsplen() const;
  size_t namelen() const;
  size_t penamelen() const;
  size_t litlen() const;
  size_t normsep() const;
  size_t dtemplen() const;
  size_t grpcnt() const;
  size_t grpgtcnt() const;
  size_t grplvl() const;
  size_t taglvl() const;
  size_t taglen() const;
  size_t entlvl() const;
  size_t pilen() const;
  Char space() const;
  
  void setStandardFunction(StandardFunction, Char);
  void enterStandardFunctionNames();
  void addFunctionChar(const StringC &, FunctionClass, Char);
  void setNamecaseGeneral(Boolean);
  void setNamecaseEntity(Boolean);
  void setDelimGeneral(int, const StringC &);
  void addDelimShortref(const StringC &, const CharsetInfo &);
  void addDelimShortrefs(const ISet<Char> &shortrefChars,
			 const CharsetInfo &charset);
  void addNameCharacters(const ISet<Char> &);
  void addNameStartCharacters(const ISet<Char> &);
  void addSubst(Char lc, Char uc);
  void addShunchar(Char);
  void setShuncharControls();
  void setQuantity(int, Number);
  void setName(int, const StringC &);
  void setSgmlChar(const ISet<Char> &);
  void implySgmlChar(const Sd &);
  // :: is for Watcom 10.0a
  void checkSgmlChar(const Sd &,
		     const ::SP_NAMESPACE_SCOPE Syntax *otherSyntax,
		     Boolean invalidUseDocumentCharset,
		     ISet<WideChar> &invalid)
       const;
  static int referenceQuantity(Quantity);
  const XcharMap<unsigned char> &markupScanTable() const;
  Boolean multicode() const;
  void addEntity(const StringC &, Char);
  size_t nEntities() const;
  const StringC &entityName(size_t) const;
  Char entityChar(size_t) const;
private:
  void subst(Char, Char);
  void checkUnivControlChar(UnivChar univChar,
			    const CharsetInfo &docCharset,
			    const ::SP_NAMESPACE_SCOPE Syntax *otherSyntax,
			    ISet<WideChar> &invalid) const;

  ISet<Char> shunchar_;
  PackedBoolean shuncharControls_;
  ISet<Char> set_[nSet];
  Char standardFunction_[3];
  PackedBoolean standardFunctionValid_[3];
  Boolean namecaseGeneral_;
  Boolean namecaseEntity_;
  StringC delimGeneral_[nDelimGeneral];
  Vector<StringC> delimShortrefComplex_;
  ISet<Char> delimShortrefSimple_;
  StringC names_[nNames];
  Number quantity_[nQuantity];
  HashTable<StringC,int> nameTable_;
  HashTable<StringC,Char> functionTable_;
  SubstTable upperSubst_;
  SubstTable identitySubst_;
  const SubstTable *generalSubst_;
  const SubstTable *entitySubst_;
  XcharMap<unsigned char> categoryTable_;
  Boolean multicode_;
  XcharMap<unsigned char> markupScanTable_;
  Boolean hasMarkupScanTable_;
  Vector<StringC> entityNames_;
  StringC entityChars_;
  static const int referenceQuantity_[];
};

inline Number Syntax::quantity(Quantity q) const
{
  return quantity_[q];
}

inline void Syntax::setQuantity(int i, Number n)
{
  quantity_[i] = n;
}

inline const SubstTable *Syntax::generalSubstTable() const
{
  return generalSubst_;
}

inline const SubstTable *Syntax::entitySubstTable() const
{
  return entitySubst_;
}

inline int Syntax::nDelimShortrefComplex() const
{
  return int(delimShortrefComplex_.size());
}

inline const StringC &Syntax::delimGeneral(int i) const
{
  return delimGeneral_[i];
}

inline const StringC &Syntax::delimShortrefComplex(size_t i) const
{
  return delimShortrefComplex_[i];
}

inline const ISet<Char> &Syntax::delimShortrefSimple() const
{
  return delimShortrefSimple_;
}

inline Boolean Syntax::hasShortrefs() const
{
  return delimShortrefComplex_.size() > 0 || !delimShortrefSimple_.isEmpty();
}

inline Char Syntax::standardFunction(int i) const
{
  return standardFunction_[i];
}

inline Boolean Syntax::getStandardFunction(int i, Char &result) const
{
  if (standardFunctionValid_[i]) {
    result = standardFunction_[i];
    return 1;
  }
  else
    return 0;
}

inline const ISet<Char> *Syntax::charSet(int i) const
{
  return &set_[i];
}

inline Boolean Syntax::isNameCharacter(Xchar c) const
{
  return categoryTable_[c] >= nameStartCategory;
}

inline Boolean Syntax::isNameStartCharacter(Xchar c) const
{
  return categoryTable_[c] == nameStartCategory;
}

inline Boolean Syntax::isDigit(Xchar c) const
{
  return categoryTable_[c] == digitCategory;
}

inline Boolean Syntax::isS(Xchar c) const
{
  return categoryTable_[c] == sCategory;
}

inline Boolean Syntax::isB(Xchar c) const
{
  return (categoryTable_[c] == sCategory
	  && !(standardFunctionValid_[fRE] && c == standardFunction_[fRE])
	  && !(standardFunctionValid_[fRS] && c == standardFunction_[fRS]));
}

inline Syntax::Category Syntax::charCategory(Xchar c) const
{
  return Category(categoryTable_[c]);
}

inline Boolean Syntax::isSgmlChar(Xchar c) const
{
  return c >= 0 && set_[sgmlChar].contains(Char(c));
}

inline const StringC &Syntax::reservedName(ReservedName i) const
{
  return names_[i];
}

inline size_t Syntax::attcnt() const
{
  return quantity(Syntax::qATTCNT);
}

inline size_t Syntax::attsplen() const
{
  return quantity(Syntax::qATTSPLEN);
}

inline size_t Syntax::namelen() const
{
  return quantity(Syntax::qNAMELEN);
}

inline size_t Syntax::penamelen() const
{
  return quantity(Syntax::qNAMELEN) - delimGeneral(Syntax::dPERO).size();
}

inline size_t Syntax::litlen() const
{
  return quantity(Syntax::qLITLEN);
}

inline size_t Syntax::normsep() const
{
  return quantity(Syntax::qNORMSEP);
}

inline size_t Syntax::dtemplen() const
{
  return quantity(Syntax::qDTEMPLEN);
}

inline size_t Syntax::grpcnt() const
{
  return quantity(Syntax::qGRPCNT);
}

inline size_t Syntax::grpgtcnt() const
{
  return quantity(Syntax::qGRPGTCNT);
}

inline size_t Syntax::grplvl() const
{
  return quantity(Syntax::qGRPLVL);
}

inline size_t Syntax::taglvl() const
{
  return quantity(Syntax::qTAGLVL);
}

inline size_t Syntax::taglen() const
{
  return quantity(Syntax::qTAGLEN);
}

inline size_t Syntax::entlvl() const
{
  return quantity(Syntax::qENTLVL);
}

inline size_t Syntax::pilen() const
{
  return quantity(Syntax::qPILEN);
}

inline Char Syntax::space() const
{
  return standardFunction(Syntax::fSPACE);
}

inline void Syntax::setSgmlChar(const ISet<Char> &set)
{
  set_[sgmlChar] = set;
}

inline int Syntax::referenceQuantity(Quantity i)
{
  return referenceQuantity_[i];
}

inline void Syntax::setShuncharControls()
{
  shuncharControls_ = 1;
}

inline const XcharMap<unsigned char> &Syntax::markupScanTable() const
{
  return markupScanTable_;
}

inline Boolean Syntax::multicode() const
{
  return multicode_;
}

inline Boolean Syntax::namecaseGeneral() const
{
  return namecaseGeneral_;
}

inline Boolean Syntax::namecaseEntity() const
{
  return namecaseEntity_;
}

inline size_t Syntax::nEntities() const
{
  return entityNames_.size();
}

inline const StringC &Syntax::entityName(size_t i) const
{
  return entityNames_[i];
}

inline Char Syntax::entityChar(size_t i) const
{
  return entityChars_[i];
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* Syntax_INCLUDED */
