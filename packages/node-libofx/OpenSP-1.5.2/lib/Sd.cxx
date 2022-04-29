// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "Sd.h"
#include "macros.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

Sd::Sd(const Ptr<EntityManager> &entityManager)
: entityManager_(entityManager),
  internalCharsetIsDocCharset_(entityManager->internalCharsetIsDocCharset()),
  docCharset_(entityManager->charset()),
  scopeInstance_(0),
  www_(0),
  netEnable_(netEnableNo),
  entityRef_(entityRefAny),
  typeValid_(1),
  integrallyStored_(0),
  implydefElement_(Sd::implydefElementNo)
{
  int i;
  for (i = 0; i < nBooleanFeature; i++)
    booleanFeature_[i] = 0;
  for (i = 0; i < nNumberFeature; i++)
    numberFeature_[i] = 0;
  for (i = 0; i < nCapacity; i++)
    capacity_[i] = 35000;
  if (internalCharsetIsDocCharset_)
    internalCharsetPtr_ = 0;
  else
    internalCharsetPtr_ = &entityManager->charset();
}

Sd::~Sd() {}

void Sd::setDocCharsetDesc(const UnivCharsetDesc &desc)
{
  docCharset_.set(desc);
}

const char *const Sd::reservedName_[] = {
  "ALL",
  "ANY",
  "ANYOTHER",
  "APPINFO",
  "ATTLIST",
  "ATTRIB",
  "BASESET",
  "CAPACITY",
  "CHARSET",
  "CONCUR",
  "CONTROLS",
  "DATATAG",
  "DEFAULT",
  "DELIM",
  "DESCSET",
  "DOCTYPE",
  "DOCUMENT",
  "ELEMENT",
  "EMPTY",
  "EMPTYNRM",
  "ENDTAG",
  "ENTITIES",
  "ENTITY",
  "EXPLICIT",
  "FEATURES",
  "FORMAL",
  "FUNCHAR",
  "FUNCTION",
  "GENERAL",
  "IMMEDNET",
  "IMPLICIT",
  "IMPLYDEF",
  "INSTANCE",
  "INTEGRAL",
  "INTERNAL",
  "KEEPRSRE",
  "LCNMCHAR",
  "LCNMSTRT",
  "LINK",
  "MINIMIZE",
  "MSICHAR",
  "MSOCHAR",
  "MSSCHAR",
  "NAMECASE",
  "NAMECHAR",
  "NAMES",
  "NAMESTRT",
  "NAMING",
  "NETENABL",
  "NO",
  "NOASSERT",
  "NONE",
  "NOTATION",
  "OMITNAME",
  "OMITTAG",
  "OTHER",
  "PUBLIC",
  "QUANTITY",
  "RANK",
  "RE",
  "REF",
  "RS",
  "SCOPE",
  "SEEALSO",
  "SEPCHAR",
  "SGML",
  "SGMLREF",
  "SHORTREF",
  "SHORTTAG",
  "SHUNCHAR",
  "SIMPLE",
  "SPACE",
  "STARTTAG",
  "SUBDOC",
  "SWITCHES",
  "SYNTAX",
  "SYSTEM",
  "TYPE",
  "UCNMCHAR",
  "UCNMSTRT",
  "UNCLOSED",
  "UNUSED",
  "URN",
  "VALIDITY",
  "VALUE",
  "YES"
};

const char *const Sd::capacityName_[] = {
  "TOTALCAP",
  "ENTCAP",
  "ENTCHCAP",
  "ELEMCAP",
  "GRPCAP",
  "EXGRPCAP",
  "EXNMCAP",
  "ATTCAP",
  "ATTCHCAP",
  "AVGRPCAP",
  "NOTCAP",
  "NOTCHCAP",
  "IDCAP",
  "IDREFCAP",
  "MAPCAP",
  "LKSETCAP",
  "LKNMCAP"
};


const char *const Sd::quantityName_[] = {
  "ATTCNT",
  "ATTSPLEN",
  "BSEQLEN",
  "DTAGLEN",
  "DTEMPLEN",
  "ENTLVL",
  "GRPCNT",
  "GRPGTCNT",
  "GRPLVL",
  "LITLEN",
  "NAMELEN",
  "NORMSEP",
  "PILEN",
  "TAGLEN",
  "TAGLVL"
};

const char *const Sd::generalDelimiterName_[] = {
  "AND",
  "COM",
  "CRO",
  "DSC",
  "DSO",
  "DTGC",
  "DTGO",
  "ERO",
  "ETAGO",
  "GRPC",
  "GRPO",
  "HCRO",
  "LIT",
  "LITA",
  "MDC",
  "MDO",
  "MINUS",
  "MSC",
  "NET",
  "NESTC",
  "OPT",
  "OR",
  "PERO",
  "PIC",
  "PIO",
  "PLUS",
  "REFC",
  "REP",
  "RNI",
  "SEQ",
  "STAGO",
  "TAGC",
  "VI"
};

Boolean Sd::lookupQuantityName(const StringC &name, Syntax::Quantity &quantity)
     const
{
  for (size_t i = 0; i < SIZEOF(quantityName_); i++)
    if (execToInternal(quantityName_[i]) == name) {
      quantity = Syntax::Quantity(i);
      return 1;
    }
  return 0;
}

Boolean Sd::lookupCapacityName(const StringC &name, Sd::Capacity &capacity)
     const
{
  for (size_t i = 0; i < SIZEOF(capacityName_); i++)
    if (execToInternal(capacityName_[i]) == name) {
      capacity = Sd::Capacity(i);
      return 1;
    }
  return 0;
}

Boolean Sd::lookupGeneralDelimiterName(const StringC &name,
				       Syntax::DelimGeneral &delimGeneral)
     const
{
  for (size_t i = 0; i < SIZEOF(generalDelimiterName_); i++)
    if (execToInternal(generalDelimiterName_[i]) == name) {
      delimGeneral = Syntax::DelimGeneral(i);
      return 1;
    }
  return 0;
}

StringC Sd::quantityName(Syntax::Quantity q) const
{
  return execToInternal(quantityName_[q]);
}

StringC Sd::generalDelimiterName(Syntax::DelimGeneral d) const
{
  return execToInternal(generalDelimiterName_[d]);
}

UnivChar Sd::nameToUniv(const StringC &name)
{
  const int *p = namedCharTable_.lookup(name);
  int n;
  if (p)
    n = *p;
  else {
    n = int(namedCharTable_.count());
    namedCharTable_.insert(name, n);
  }
  return n + 0x60000000;	// 10646 private use group
}

void Sd::setShorttag(Boolean b)
{
  for (int i = fSHORTTAG_FIRST; i <= fSHORTTAG_LAST; i++)
    booleanFeature_[i] = b;
  netEnable_ = netEnableAll;
}

#ifdef SP_NAMESPACE
}
#endif
