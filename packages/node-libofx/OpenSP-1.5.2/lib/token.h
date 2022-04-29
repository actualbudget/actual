// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef token_INCLUDED
#define token_INCLUDED 1

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

enum EnumToken {
  // tokenUnrecognized must be 0
  tokenUnrecognized,		// no token could be recognized
  tokenEe,			// end of entity
  tokenS,			// RS RE SPACE SEPCHAR
  tokenRe,			// RE
  tokenRs,			// RS
  tokenSpace,			// SPACE
  tokenSepchar,			// SEPCHAR
  tokenNameStart,		// X
  tokenDigit,			// 1
  tokenLcUcNmchar,		// LCNMCHAR or UCNMCHAR
  tokenChar,			// a legal data character
  tokenCharDelim,	        // a data character which starts a delimiter
  tokenIgnoredChar,		// character in ignored marked section
  // delimiters and delimiters in context
  tokenAnd,
  tokenCom,
  tokenCroDigit,
  tokenCroNameStart,
  tokenDsc,
  tokenDso,
  tokenDtgc,
  tokenDtgo,
  tokenEroNameStart,
  tokenEroGrpo,
  tokenEtago,
  tokenEtagoNameStart,
  tokenEtagoTagc,
  tokenEtagoGrpo,
  tokenGrpc,
  tokenGrpo,
  tokenHcroHexDigit,
  tokenLit,
  tokenLita,
  tokenMdc,
  tokenMdoNameStart,
  tokenMdoMdc,
  tokenMdoCom,
  tokenMdoDso,
  tokenMinus,
  tokenMinusGrpo,
  tokenMscMdc,
  tokenNet,
  tokenNestc,
  tokenOpt,
  tokenOr,
  tokenPero,
  tokenPeroNameStart,
  tokenPeroGrpo,
  tokenPic,
  tokenPio,
  tokenPlus,
  tokenPlusGrpo,
  tokenRefc,
  tokenRep,
  tokenRni,
  tokenSeq,
  tokenStago,
  tokenStagoNameStart,
  tokenStagoTagc,
  tokenStagoGrpo,
  tokenTagc,
  tokenVi,
  // short references start here
  tokenFirstShortref
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not token_INCLUDED */
