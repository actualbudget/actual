// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "ParserOptions.h"
#include <string.h>

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

ParserOptions::ParserOptions()
: datatag(0),
  omittag(1),
  rank(1),
  shorttag(1),
  emptynrm(0),
  linkSimple(1000),
  linkImplicit(1),
  linkExplicit(1),
  concur(0),
  subdoc(99999999),
  formal(1),
  typeValid(sgmlDeclTypeValid),
  shortref(1),
  errorIdref(1),
  errorSignificant(1),
  errorAfdr(1),
  noUnclosedTag(0),
  noNet(0),
  fullyDeclared(0),
  fullyTagged(0),
  amplyTagged(0),
  amplyTaggedAnyother(0),
  valid(0),
  entityRef(0),
  externalEntityRef(0),
  integral(0)
{
  for (int i = 0; i < nQuantity; i++)
    quantity[i] = 99999999;
  quantity[BSEQLEN] = 960;
  quantity[NORMSEP] = 2;
  quantity[LITLEN] = 24000;
  quantity[PILEN] = 24000;
  quantity[DTEMPLEN] = 24000;
}

Warnings::Warnings()
{
  memset(this, 0, sizeof(Warnings));
}

#ifdef SP_NAMESPACE
}
#endif
