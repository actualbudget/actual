// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef Sd_INCLUDED
#define Sd_INCLUDED 1
#ifdef __GNUG__
#pragma interface
#endif

#include "types.h"
#include "Boolean.h"
#include "Resource.h"
#include "CharsetInfo.h"
#include "ExternalId.h"
#include "ISet.h"
#include "Syntax.h"
#include "CharsetDecl.h"
#include "HashTable.h"
#include "EntityManager.h"
#include "Ptr.h"

// Information about the SGML declaration that is not syntax specific.

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API Sd : public Resource {
public:
  // These must be in the same order as in the SGML declaration.
  enum BooleanFeature {
    fDATATAG,
    fOMITTAG,
    fRANK,
    fSTARTTAGEMPTY,
    fSTARTTAGUNCLOSED,
    fENDTAGEMPTY,
    fENDTAGUNCLOSED,
    fATTRIBDEFAULT,
    fATTRIBOMITNAME,
    fATTRIBVALUE,
    fEMPTYNRM,
    fIMPLYDEFATTLIST,
    fIMPLYDEFDOCTYPE,
    fIMPLYDEFENTITY,
    fIMPLYDEFNOTATION,
    fIMPLICIT,
    fFORMAL,
    fURN,
    fKEEPRSRE
    };
  enum {
    nBooleanFeature = fKEEPRSRE + 1,
    fSHORTTAG_FIRST = fSTARTTAGEMPTY,
    fSHORTTAG_LAST = fATTRIBVALUE
  };
  // These must be in the same order as in the SGML declaration.
  enum NumberFeature {
    fSIMPLE,
    fEXPLICIT,
    fCONCUR,
    fSUBDOC
  };
  enum { nNumberFeature = fSUBDOC + 1 };
  enum NetEnable {
    netEnableNo,
    netEnableImmednet,
    netEnableAll
  };
  enum EntityRef {
    entityRefAny,
    entityRefInternal,
    entityRefNone
  };
  enum ImplydefElement {
    implydefElementNo,
    implydefElementYes,
    implydefElementAnyother
  };
  // These are names used in the SGML declaration.
  enum ReservedName {
    rALL,
    rANY,
    rANYOTHER,
    rAPPINFO,
    rATTLIST,
    rATTRIB,
    rBASESET,
    rCAPACITY,
    rCHARSET,
    rCONCUR,
    rCONTROLS,
    rDATATAG,
    rDEFAULT,
    rDELIM,
    rDESCSET,
    rDOCTYPE,
    rDOCUMENT,
    rELEMENT,
    rEMPTY,
    rEMPTYNRM,
    rENDTAG,
    rENTITIES,
    rENTITY,
    rEXPLICIT,
    rFEATURES,
    rFORMAL,
    rFUNCHAR,
    rFUNCTION,
    rGENERAL,
    rIMMEDNET,
    rIMPLICIT,
    rIMPLYDEF,
    rINSTANCE,
    rINTEGRAL,
    rINTERNAL,
    rKEEPRSRE,
    rLCNMCHAR,
    rLCNMSTRT,
    rLINK,
    rMINIMIZE,
    rMSICHAR,
    rMSOCHAR,
    rMSSCHAR,
    rNAMECASE,
    rNAMECHAR,
    rNAMES,
    rNAMESTRT,
    rNAMING,
    rNETENABL,
    rNO,
    rNOASSERT,
    rNONE,
    rNOTATION,
    rOMITNAME,
    rOMITTAG,
    rOTHER,
    rPUBLIC,
    rQUANTITY,
    rRANK,
    rRE,
    rREF,
    rRS,
    rSCOPE,
    rSEEALSO,
    rSEPCHAR,
    rSGML,
    rSGMLREF,
    rSHORTREF,
    rSHORTTAG,
    rSHUNCHAR,
    rSIMPLE,
    rSPACE,
    rSTARTTAG,
    rSUBDOC,
    rSWITCHES,
    rSYNTAX,
    rSYSTEM,
    rTYPE,
    rUCNMCHAR,
    rUCNMSTRT,
    rUNCLOSED,
    rUNUSED,
    rURN,
    rVALIDITY,
    rVALUE,
    rYES
  };
  enum Capacity {
    TOTALCAP,
    ENTCAP,
    ENTCHCAP,
    ELEMCAP,
    GRPCAP,
    EXGRPCAP,
    EXNMCAP,
    ATTCAP,
    ATTCHCAP,
    AVGRPCAP,
    NOTCAP,
    NOTCHCAP,
    IDCAP,
    IDREFCAP,
    MAPCAP,
    LKSETCAP,
    LKNMCAP
  };
  enum { nCapacity = LKNMCAP + 1 };
  Sd(const Ptr<EntityManager> &);
  ~Sd();
  void setDocCharsetDesc(const UnivCharsetDesc &);
  Boolean matchesReservedName(const StringC &, ReservedName) const;
  int digitWeight(Char) const;
  int hexDigitWeight(Char) const;
  Boolean link() const;
  Number simpleLink() const;
  Boolean implicitLink() const;
  Number explicitLink() const;
  Boolean startTagEmpty() const;
  Boolean startTagUnclosed() const;
  NetEnable startTagNetEnable() const;
  void setStartTagNetEnable(NetEnable);
  Boolean endTagEmpty() const;
  Boolean endTagUnclosed() const;
  Boolean attributeDefault() const;
  Boolean attributeValueNotLiteral() const;
  Boolean attributeOmitName() const;
  Boolean emptyElementNormal() const;
  Boolean implydefAttlist() const;
  Boolean implydefDoctype() const;
  ImplydefElement implydefElement() const;
  void setImplydefElement(ImplydefElement);
  Boolean implydefEntity() const;
  Boolean implydefNotation() const;
  Number concur() const;
  Boolean omittag() const;
  Boolean rank() const;
  Boolean datatag() const;
  Boolean formal() const;
  Boolean urn() const;
  Boolean keeprsre() const;
  Number subdoc() const;
  StringC reservedName(int) const;
  Boolean lookupQuantityName(const StringC &, Syntax::Quantity &) const;
  Boolean lookupGeneralDelimiterName(const StringC &, Syntax::DelimGeneral &)
       const;
  Boolean lookupCapacityName(const StringC &, Sd::Capacity &) const;
  StringC quantityName(Syntax::Quantity) const;
  Boolean internalCharsetIsDocCharset() const;
  const CharsetInfo &internalCharset() const;
  const CharsetInfo &docCharset() const;
  Char execToInternal(char) const;
  StringC execToInternal(const char *) const;
  Number capacity(int) const;
  void setCapacity(int, Number);
  StringC capacityName(int) const;
  Boolean scopeInstance() const;
  void setScopeInstance();
  void setDocCharsetDecl(CharsetDecl &);
  const CharsetDecl &docCharsetDecl() const;
  void setBooleanFeature(BooleanFeature, Boolean);
  void setShorttag(Boolean);
  void setNumberFeature(NumberFeature, Number);
  StringC generalDelimiterName(Syntax::DelimGeneral) const;
  UnivChar nameToUniv(const StringC &);
  Boolean www() const;
  void setWww(Boolean);
  EntityRef entityRef() const;
  void setEntityRef(EntityRef);
  Boolean typeValid() const;
  void setTypeValid(Boolean);
  Boolean integrallyStored() const;
  void setIntegrallyStored(Boolean);
private:
  PackedBoolean booleanFeature_[nBooleanFeature];
  Number numberFeature_[nNumberFeature];
  Number capacity_[nCapacity];
  PackedBoolean internalCharsetIsDocCharset_;
  // if null, use docCharset_
  const CharsetInfo *internalCharsetPtr_;
  CharsetInfo docCharset_;
  CharsetDecl docCharsetDecl_;
  Boolean scopeInstance_;
  Boolean www_;
  NetEnable netEnable_;
  EntityRef entityRef_;
  ImplydefElement implydefElement_;
  Boolean typeValid_;
  Boolean integrallyStored_;
  HashTable<StringC,int> namedCharTable_;
  Ptr<EntityManager> entityManager_;
  static const char *const reservedName_[];
  static const char *const generalDelimiterName_[];
  static const char *const capacityName_[];
  static const char *const quantityName_[];
};

inline
Boolean Sd::link() const
{
  return (numberFeature_[fSIMPLE]
	  || booleanFeature_[fIMPLICIT]
	  || numberFeature_[fEXPLICIT]);
}

inline
Number Sd::explicitLink() const
{
  return numberFeature_[fEXPLICIT];
}

inline
Boolean Sd::implicitLink() const
{
  return booleanFeature_[fIMPLICIT];
}

inline
Number Sd::simpleLink() const
{
  return numberFeature_[fSIMPLE];
}

inline
Boolean Sd::startTagEmpty() const
{
  return booleanFeature_[fSTARTTAGEMPTY];
}

inline
Boolean Sd::startTagUnclosed() const
{
  return booleanFeature_[fSTARTTAGUNCLOSED];
}

inline
Sd::NetEnable Sd::startTagNetEnable() const
{
  return netEnable_;
}

inline
void Sd::setStartTagNetEnable(NetEnable e)
{
  netEnable_ = e;
}

inline
Boolean Sd::endTagEmpty() const
{
  return booleanFeature_[fENDTAGEMPTY];
}

inline
Boolean Sd::endTagUnclosed() const
{
  return booleanFeature_[fENDTAGUNCLOSED];
}

inline
Boolean Sd::attributeDefault() const
{
  return booleanFeature_[fATTRIBDEFAULT];
}

inline
Boolean Sd::attributeValueNotLiteral() const
{
  return booleanFeature_[fATTRIBVALUE];
}

inline
Boolean Sd::attributeOmitName() const
{
  return booleanFeature_[fATTRIBOMITNAME];
}

inline
Boolean Sd::emptyElementNormal() const
{
  return booleanFeature_[fEMPTYNRM];
}

inline
Boolean Sd::implydefAttlist() const
{
  return booleanFeature_[fIMPLYDEFATTLIST];
}

inline
Boolean Sd::implydefDoctype() const
{
  return booleanFeature_[fIMPLYDEFDOCTYPE];
}

inline
Sd::ImplydefElement Sd::implydefElement() const
{
  return implydefElement_;
}

inline
void Sd::setImplydefElement(ImplydefElement i) 
{
  implydefElement_ = i;
}

inline
Boolean Sd::implydefEntity() const
{
  return booleanFeature_[fIMPLYDEFENTITY];
}

inline
Boolean Sd::implydefNotation() const
{
  return booleanFeature_[fIMPLYDEFNOTATION];
}

inline
Number Sd::concur() const
{
  return numberFeature_[fCONCUR];
}

inline
Number Sd::subdoc() const
{
  return numberFeature_[fSUBDOC];
}


inline
Boolean Sd::omittag() const
{
  return booleanFeature_[fOMITTAG];
}

inline
Boolean Sd::rank() const
{
  return booleanFeature_[fRANK];
}

inline
Boolean Sd::datatag() const
{
  return booleanFeature_[fDATATAG];
}

inline
Boolean Sd::formal() const
{
  return booleanFeature_[fFORMAL];
}

inline
Boolean Sd::urn() const
{
  return booleanFeature_[fURN];
}

inline
Boolean Sd::keeprsre() const
{
  return booleanFeature_[fKEEPRSRE];
}

inline
const CharsetInfo &Sd::internalCharset() const
{
  return internalCharsetPtr_ ? *internalCharsetPtr_ : docCharset_;
}

inline
Char Sd::execToInternal(char c) const
{
  return internalCharset().execToDesc(c);
}

inline
StringC Sd::execToInternal(const char *s) const
{
  return internalCharset().execToDesc(s);
}

inline
StringC Sd::reservedName(int i) const
{
  return execToInternal(reservedName_[i]);
}

inline
Boolean Sd::internalCharsetIsDocCharset() const
{
  return internalCharsetIsDocCharset_;
}

inline
const CharsetInfo &Sd::docCharset() const
{
  return docCharset_;
}

inline
int Sd::digitWeight(Char c) const
{
  return internalCharset().digitWeight(c);
}

inline
int Sd::hexDigitWeight(Char c) const
{
  return internalCharset().hexDigitWeight(c);
}

inline
Number Sd::capacity(int i) const
{
  return capacity_[i];
}

inline
void Sd::setCapacity(int i, Number n)
{
  capacity_[i] = n;
}

inline
StringC Sd::capacityName(int i) const
{
  return execToInternal(capacityName_[i]);
}

inline
Boolean Sd::scopeInstance() const
{
  return scopeInstance_;
}

inline
void Sd::setScopeInstance()
{
  scopeInstance_ = 1;
}

inline
void Sd::setDocCharsetDecl(CharsetDecl &decl)
{
  decl.swap(docCharsetDecl_);
}

inline
const CharsetDecl &Sd::docCharsetDecl() const
{
  return docCharsetDecl_;
}

inline
void Sd::setBooleanFeature(BooleanFeature i, Boolean b)
{
  booleanFeature_[i] = b;
}

inline
void Sd::setNumberFeature(NumberFeature i, Number n)
{
  numberFeature_[i] = n;
}

inline
Boolean Sd::www() const
{
  return www_;
}

inline
void Sd::setWww(Boolean b)
{
  www_ = b;
}

inline
Sd::EntityRef Sd::entityRef() const
{
  return entityRef_;
}

inline
void Sd::setEntityRef(EntityRef r)
{
  entityRef_ = r;
}

inline
Boolean Sd::typeValid() const
{
  return typeValid_;
}
 
inline
void Sd::setTypeValid(Boolean b)
{
  typeValid_ = b;
}

inline
Boolean Sd::integrallyStored() const
{
  return integrallyStored_;
}

inline
void Sd::setIntegrallyStored(Boolean b)
{
  integrallyStored_ = b;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* Sd_INCLUDED */
