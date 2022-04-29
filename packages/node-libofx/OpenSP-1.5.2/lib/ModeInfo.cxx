// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include <limits.h>
#include <stdlib.h>
#include "macros.h"
#include "types.h"
#include "Syntax.h"
#include "token.h"
#include "Sd.h"
#include "Mode.h"
#include "ModeInfo.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

const unsigned REQUIRE_EMPTY_STARTTAG = 01;
const unsigned REQUIRE_EMPTY_ENDTAG = 02;
const unsigned REQUIRE_CONCUR = 04;
const unsigned REQUIRE_LINK_OR_CONCUR = 010;
const unsigned REQUIRE_NOT_KEEPRSRE = 020;
const unsigned REQUIRE_FLAGS = 037;

#define ULONG_BIT (CHAR_BIT * sizeof(unsigned long))

struct PackedTokenInfo {
  Token token;			// token to be returned
  unsigned flags;
  unsigned char contents[2];	// components of the delimiter or d-i-c
  unsigned char modes[25];	// list of modes in which it is recognized,
				// terminated by EOM
  // a bit vector computed from modes (lo to hi)
  unsigned long modeBits[(nModes + ULONG_BIT - 1)/ULONG_BIT];
  void computeModeBits();
  Boolean inMode(Mode mode) const;
};

const unsigned char SET = Syntax::nDelimGeneral;
const unsigned char FUNCTION = SET + Syntax::nSet;
const unsigned char NOTHING = UCHAR_MAX;

const unsigned char EOM = 255;	// end of modes

static PackedTokenInfo tokenTable[] = {
  // Delimiters and delimiters in context
  { tokenAnd, 0, { Syntax::dAND, NOTHING }, { grpMode, EOM }},
  { tokenCom, 0, { Syntax::dCOM, NOTHING },
    { mdMode, mdMinusMode, mdPeroMode, sdMode, comMode, sdcomMode, piPasMode, EOM }},
  { tokenCroDigit, 0, { Syntax::dCRO, SET + Syntax::digit },
    { econMode, mconMode, rcconMode, econnetMode, mconnetMode, rcconnetMode,
      rcconeMode, plitMode, plitaMode, pliteMode, sdplitMode, sdplitaMode,
      alitMode, alitaMode, aliteMode,
      talitMode, talitaMode, taliteMode, rcmsMode, EOM }},
  { tokenCroNameStart, 0, { Syntax::dCRO, SET + Syntax::nameStart },
    { econMode, mconMode, rcconMode, econnetMode, mconnetMode, rcconnetMode,
      rcconeMode, plitMode, plitaMode, pliteMode, sdplitMode, sdplitaMode,
      alitMode, alitaMode, aliteMode,
      talitMode, talitaMode, taliteMode, rcmsMode, EOM }},
  { tokenDsc, 0, { Syntax::dDSC, NOTHING },
    { /* mdMode, */ asMode, dsMode, EOM }},
  { tokenDso, 0, { Syntax::dDSO, NOTHING }, { mdMode, EOM }},
  { tokenDtgc, 0, { Syntax::dDTGC, NOTHING }, { grpMode, EOM }},
  { tokenDtgo, 0, { Syntax::dDTGO, NOTHING }, { grpMode, EOM }},
  { tokenEroNameStart, 0, { Syntax::dERO, SET + Syntax::nameStart },
    { econMode, mconMode, rcconMode, econnetMode, mconnetMode, rcconnetMode,
      rcconeMode, alitMode, alitaMode, aliteMode, talitMode, talitaMode,
      taliteMode, rcmsMode, EOM }},
  { tokenEroGrpo, REQUIRE_LINK_OR_CONCUR, { Syntax::dERO, Syntax::dGRPO },
    { econMode, mconMode, rcconMode, econnetMode, mconnetMode, rcconnetMode,
      rcconeMode, alitMode, alitaMode, aliteMode, talitMode, talitaMode,
      taliteMode, rcmsMode, EOM }},
  { tokenEtago, 0, { Syntax::dETAGO, NOTHING }, { tagMode, EOM }},
  { tokenEtagoNameStart, 0, { Syntax::dETAGO, SET + Syntax::nameStart },
    { econMode, mconMode, cconMode, rcconMode,
      econnetMode, mconnetMode, cconnetMode, rcconnetMode, EOM }},
  { tokenEtagoTagc, REQUIRE_EMPTY_ENDTAG, { Syntax::dETAGO, Syntax::dTAGC },
    { econMode, mconMode, cconMode, rcconMode,
      econnetMode, mconnetMode, cconnetMode, rcconnetMode, EOM }},
  { tokenEtagoGrpo, REQUIRE_CONCUR, { Syntax::dETAGO, Syntax::dGRPO },
    { econMode, mconMode, cconMode, rcconMode,
      econnetMode, mconnetMode, cconnetMode, rcconnetMode, EOM }},
  { tokenGrpc, 0, { Syntax::dGRPC, NOTHING }, { grpMode, EOM }},
  { tokenGrpo, 0, { Syntax::dGRPO, NOTHING },
    { mdMode, mdMinusMode, grpMode, EOM }},
  { tokenHcroHexDigit, 0, { Syntax::dHCRO, SET + Syntax::hexDigit },
    { econMode, mconMode, rcconMode, econnetMode, mconnetMode, rcconnetMode,
      rcconeMode, plitMode, plitaMode, pliteMode,
      alitMode, alitaMode, aliteMode,
      talitMode, talitaMode, taliteMode, rcmsMode, EOM }},
  { tokenLit, 0, { Syntax::dLIT, NOTHING },
    { alitMode, talitMode, plitMode, sdplitMode, mlitMode, slitMode, sdslitMode,
      asMode, piPasMode, tagMode, mdMode, sdMode, grpMode, EOM }},
  { tokenLita, 0, { Syntax::dLITA, NOTHING },
    { alitaMode, talitaMode, plitaMode, sdplitaMode, mlitaMode, slitaMode, sdslitaMode,
      asMode, piPasMode, tagMode, mdMode, sdMode, grpMode, EOM }},
  { tokenMdc, 0, { Syntax::dMDC, NOTHING }, { mdMode, sdMode, EOM }},
  { tokenMdoNameStart, 0, { Syntax::dMDO, SET + Syntax::nameStart },
    { econMode, mconMode, econnetMode, mconnetMode,
      proMode, dsMode, dsiMode, EOM }},
  { tokenMdoMdc, 0, { Syntax::dMDO, Syntax::dMDC },
    { econMode, mconMode, econnetMode, mconnetMode,
      proMode, dsMode, dsiMode, EOM }},
  { tokenMdoCom, 0, { Syntax::dMDO, Syntax::dCOM },
    { econMode, mconMode, econnetMode, mconnetMode,
      proMode, dsMode, dsiMode, EOM }},
  { tokenMdoDso, 0, { Syntax::dMDO, Syntax::dDSO },
    { econMode, mconMode, econnetMode, mconnetMode,
      dsMode, dsiMode, imsMode, EOM }},
  { tokenMinus, 0, { Syntax::dMINUS, NOTHING }, { mdMinusMode, sdMode, EOM }},
  { tokenMinusGrpo, 0, { Syntax::dMINUS, Syntax::dGRPO }, { mdMode, EOM }},
  { tokenMscMdc, 0, { Syntax::dMSC, Syntax::dMDC},
    { imsMode, cmsMode, rcmsMode,
      econMode, mconMode, econnetMode, mconnetMode, dsMode, dsiMode, EOM }},
  { tokenNestc, 0, { Syntax::dNESTC, NOTHING }, { tagMode, EOM }},
  { tokenNet, 0, { Syntax::dNET, NOTHING },
    { econnetMode, mconnetMode, cconnetMode, rcconnetMode, EOM }},
  { tokenOpt, 0, { Syntax::dOPT, NOTHING }, { grpMode, grpsufMode, EOM }},
  { tokenOr, 0, { Syntax::dOR, NOTHING }, { grpMode, EOM }},
  { tokenPero, 0, { Syntax::dPERO, NOTHING }, { mdPeroMode, EOM }},
  { tokenPeroNameStart, 0, { Syntax::dPERO, SET + Syntax::nameStart }, {
    mdMode, mdMinusMode, mdPeroMode, dsMode, dsiMode, grpMode,
    plitMode, plitaMode, pliteMode, sdplitMode, sdplitaMode, EOM }},
  { tokenPeroGrpo, REQUIRE_LINK_OR_CONCUR, { Syntax::dPERO, Syntax::dGRPO },
    { mdMode, mdMinusMode, mdPeroMode, dsMode, dsiMode, grpMode,
      plitMode, plitaMode, pliteMode, sdplitMode, sdplitaMode, EOM }},
  { tokenPic, 0, { Syntax::dPIC, NOTHING }, { piMode, EOM }},
  { tokenPio, 0, { Syntax::dPIO, NOTHING },
    { econMode, mconMode, econnetMode, mconnetMode, proMode,
      dsMode, dsiMode, EOM }},
  { tokenPlus, 0, { Syntax::dPLUS, NOTHING }, { grpMode, grpsufMode, EOM }},
  { tokenPlusGrpo, 0, { Syntax::dPLUS, Syntax::dGRPO }, { mdMode, EOM }},
  { tokenRefc, 0, { Syntax::dREFC, NOTHING }, { refMode, EOM }},
  { tokenRep, 0, { Syntax::dREP, NOTHING }, { grpMode, grpsufMode, EOM }},
  { tokenRni, 0, { Syntax::dRNI, NOTHING },
    { grpMode, mdMode, mdPeroMode, EOM }},
  { tokenSeq, 0, { Syntax::dSEQ, NOTHING }, { grpMode, EOM }},
  { tokenStago, 0, { Syntax::dSTAGO, NOTHING }, { tagMode, EOM }},
  { tokenStagoNameStart, 0, { Syntax::dSTAGO, SET + Syntax::nameStart },
    { econMode, mconMode, econnetMode, mconnetMode, EOM }},
  { tokenStagoTagc, REQUIRE_EMPTY_STARTTAG, { Syntax::dSTAGO, Syntax::dTAGC },
    { econMode, mconMode, econnetMode, mconnetMode, EOM }},
  { tokenStagoGrpo, REQUIRE_CONCUR, { Syntax::dSTAGO, Syntax::dGRPO },
    { econMode, mconMode, econnetMode, mconnetMode, EOM }},
  { tokenTagc, 0, { Syntax::dTAGC, NOTHING }, { tagMode, EOM }},
  { tokenVi, 0, { Syntax::dVI, NOTHING }, { tagMode, asMode, piPasMode, EOM }},
  // Other tokens
  { tokenRe, REQUIRE_NOT_KEEPRSRE, { FUNCTION + Syntax::fRE, NOTHING },
    { mconMode, cconMode, rcconMode,
      mconnetMode, cconnetMode, rcconnetMode,
      rcconeMode, cmsMode, rcmsMode, EOM }},
  { tokenRe, 0, { FUNCTION + Syntax::fRE, NOTHING },
    { refMode,
      mlitMode, mlitaMode, alitMode, alitaMode, aliteMode,
      talitMode, talitaMode, taliteMode,
      EOM }},
  { tokenRs, REQUIRE_NOT_KEEPRSRE, { FUNCTION + Syntax::fRS, NOTHING },
    { mconMode, cconMode, rcconMode,
      mconnetMode, cconnetMode, rcconnetMode,
      rcconeMode, cmsMode, rcmsMode, EOM }},
  { tokenRs, 0, { FUNCTION + Syntax::fRS, NOTHING },
    { mlitMode, mlitaMode, alitMode, alitaMode, aliteMode,
      talitMode, talitaMode, taliteMode,
      EOM }},
  { tokenSpace, 0, { FUNCTION + Syntax::fSPACE, NOTHING },
    { mlitMode, mlitaMode, talitMode, talitaMode, taliteMode, EOM }},
  { tokenSepchar, 0, { SET + Syntax::sepchar, NOTHING },
    { alitMode, alitaMode, aliteMode,
      talitMode, talitaMode, taliteMode, EOM }},
  { tokenS, 0, { SET + Syntax::s, NOTHING },
    { econMode, econnetMode, grpMode, mdMode, mdMinusMode, mdPeroMode, sdMode,
      proMode, dsMode, dsiMode, asMode, piPasMode, tagMode, EOM }},
  { tokenNameStart, 0, { SET + Syntax::nameStart, NOTHING },
    { grpMode, mdMode, mdMinusMode, mdPeroMode, sdMode,
      asMode, piPasMode, tagMode, EOM }},
  { tokenDigit, 0, { SET + Syntax::digit, NOTHING },
    { grpMode, mdMode, mdMinusMode, sdMode, asMode, piPasMode, tagMode, EOM }},
  { tokenLcUcNmchar, 0, { SET + Syntax::nmchar, NOTHING },
    { grpMode, mdMode, asMode, piPasMode, tagMode, EOM }},
  { tokenIgnoredChar, 0, { SET + Syntax::sgmlChar, NOTHING },
    { imsMode, EOM }},
  { tokenChar, 0, { SET + Syntax::sgmlChar, NOTHING },
    // Note that character data is recognized in element content,
    // and will cause #PCDATA to begin.
    { alitMode, alitaMode, aliteMode,
      talitMode, talitaMode, taliteMode,
      comMode, piMode,
      cmsMode, rcmsMode,
      plitMode, plitaMode, pliteMode,
      slitMode, slitaMode,
      econMode, mconMode, cconMode, rcconMode,
      econnetMode, mconnetMode, cconnetMode, rcconnetMode, rcconeMode, EOM }},
  { tokenChar, 0, { SET + Syntax::minimumData, NOTHING },
    { mlitMode, mlitaMode, EOM }},
  { tokenChar, 0, { SET + Syntax::significant, NOTHING },
    { sdplitMode, sdplitaMode, sdslitMode, sdslitaMode, sdcomMode, EOM }},
};

inline Boolean PackedTokenInfo::inMode(Mode mode) const
{
  return ((modeBits[unsigned(mode) / ULONG_BIT]
	   & ((unsigned long)1 << (unsigned(mode) % ULONG_BIT)))
	  != 0);
}

void PackedTokenInfo::computeModeBits()
{
  for (unsigned char *p = modes; *p != EOM; p++)
    modeBits[*p / ULONG_BIT] |= (unsigned long)1 << (*p % ULONG_BIT);
}

struct TokenTableIniter {
  TokenTableIniter();
};

static TokenTableIniter tokenTableIniter;

TokenTableIniter::TokenTableIniter()
{
  for (size_t i = 0; i < SIZEOF(tokenTable); i++)
    tokenTable[i].computeModeBits();
}

ModeInfo::ModeInfo(Mode mode, const Sd &sd)
: mode_(mode), p_(tokenTable), count_(SIZEOF(tokenTable)),
  missingRequirements_(REQUIRE_FLAGS)
{
  if (sd.startTagEmpty())
    missingRequirements_ &= ~REQUIRE_EMPTY_STARTTAG;
  if (sd.endTagEmpty())
    missingRequirements_ &= ~REQUIRE_EMPTY_ENDTAG;
  if (sd.concur())
    missingRequirements_ &= ~(REQUIRE_CONCUR|REQUIRE_LINK_OR_CONCUR);
  if (sd.link())
    missingRequirements_ &= ~REQUIRE_LINK_OR_CONCUR;
  if (!sd.keeprsre())
    missingRequirements_ &= ~REQUIRE_NOT_KEEPRSRE;
}
  
Boolean ModeInfo::nextToken(TokenInfo *t)
{
  for (; count_ > 0; --count_, ++p_)
    if (p_->inMode(mode_) && (p_->flags & missingRequirements_) == 0) {
      t->token = p_->token;
      t->priority = Priority::delim;
      const unsigned char *contents = p_->contents;
      --count_;
      ++p_;
      unsigned char c = contents[0];
      if (c < SET)
	t->delim1 = Syntax::DelimGeneral(c);
      else if (c < SET + Syntax::nSet) {
	t->set = Syntax::Set(c - SET);
	t->type = TokenInfo::setType;
	switch (t->set) {
	case Syntax::sepchar:
	case Syntax::s:
	case Syntax::blank:
	  t->priority = Priority::function;
	  break;
	default:
	  t->priority = Priority::data;
	  break;
	}
	return 1;
      }
      else {
	t->function = Syntax::StandardFunction(c - FUNCTION);
	t->priority = Priority::function;
	t->type = TokenInfo::functionType;
	return 1;
      }
      c = contents[1];
      if (c == NOTHING) {
	t->type = TokenInfo::delimType;
	return 1;
      }
      if (c < SET) {
	t->delim2 = Syntax::DelimGeneral(c);
	t->type = TokenInfo::delimDelimType;
	return 1;
      }
      if (c < SET + Syntax::nSet) {
	t->set = Syntax::Set(c - SET);
	t->type = TokenInfo::delimSetType;
	return 1;
      }
      abort();
    }
  return 0;
}

#ifdef SP_NAMESPACE
}
#endif
