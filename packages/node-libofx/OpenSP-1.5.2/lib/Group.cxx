// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "Group.h"
#include "MessageBuilder.h"
#include "ParserMessages.h"
#include "macros.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

AllowedGroupTokens::AllowedGroupTokens(GroupToken::Type t1, GroupToken::Type t2,
				       GroupToken::Type t3, GroupToken::Type t4,
				       GroupToken::Type t5, GroupToken::Type t6)
: flags_(0)
{
  allow(t1);
  allow(t2);
  allow(t3);
  allow(t4);
  allow(t5);
  allow(t6);
}

AllowedGroupConnectors::AllowedGroupConnectors(GroupConnector::Type c1)
: flags_(0)
{
  allow(c1);
}

AllowedGroupConnectors::AllowedGroupConnectors(GroupConnector::Type c1,
					       GroupConnector::Type c2)
: flags_(0)
{
  allow(c1);
  allow(c2);
}

AllowedGroupConnectors::AllowedGroupConnectors(GroupConnector::Type c1,
					       GroupConnector::Type c2,
					       GroupConnector::Type c3)
: flags_(0)
{
  allow(c1);
  allow(c2);
  allow(c3);
}

AllowedGroupConnectors::AllowedGroupConnectors(GroupConnector::Type c1,
					       GroupConnector::Type c2,
					       GroupConnector::Type c3,
					       GroupConnector::Type c4)
: flags_(0)
{
  allow(c1);
  allow(c2);
  allow(c3);
  allow(c4);
}


AllowedGroupConnectorsMessageArg::AllowedGroupConnectorsMessageArg(
  const AllowedGroupConnectors &allow,
  const ConstPtr<Syntax> &syntax)
: allow_(allow),
  syntax_(syntax)
{
}

MessageArg *AllowedGroupConnectorsMessageArg::copy() const
{
  return new AllowedGroupConnectorsMessageArg(*this);
}

void AllowedGroupConnectorsMessageArg::append(MessageBuilder &builder) const
{
  static GroupConnector::Type types[] = {
    GroupConnector::andGC, GroupConnector::orGC, GroupConnector::seqGC,
    GroupConnector::grpcGC, GroupConnector::dtgcGC
    };
  static Syntax::DelimGeneral delims[] = {
    Syntax::dAND, Syntax::dOR, Syntax::dSEQ,
    Syntax::dGRPC, Syntax::dDTGC
    };
  Boolean first = 1;
  for (size_t i = 0; i < SIZEOF(types); i++)
    if (allow_.groupConnector(types[i])) {
      if (!first)
	builder.appendFragment(ParserMessages::listSep);
      else
	first = 0;
      const StringC &delim = syntax_->delimGeneral(delims[i]);
      builder.appendFragment(ParserMessages::delimStart);
      builder.appendChars(delim.data(), delim.size());
#if 0
      builder.appendFragment(ParserMessages::delimEnd);
#endif
    }
}

AllowedGroupTokensMessageArg::AllowedGroupTokensMessageArg(
  const AllowedGroupTokens &allow,
  const ConstPtr<Syntax> &syntax)
: allow_(allow),
  syntax_(syntax)
{
}

MessageArg *AllowedGroupTokensMessageArg::copy() const
{
  return new AllowedGroupTokensMessageArg(*this);
}

void AllowedGroupTokensMessageArg::append(MessageBuilder &builder) const
{
  const MessageFragment *fragment[4];
  int nFragments = 0;
  if (allow_.groupToken(GroupToken::dataTagLiteral))
    fragment[nFragments++] = &ParserMessages::parameterLiteral;
  if (allow_.groupToken(GroupToken::dataTagGroup))
    fragment[nFragments++] = &ParserMessages::dataTagGroup;
  switch (allow_.group()) {
  case GroupToken::modelGroup:
    fragment[nFragments++] = &ParserMessages::modelGroup;
    break;
  case GroupToken::dataTagTemplateGroup:
    fragment[nFragments++] = &ParserMessages::dataTagTemplateGroup;
    break;
  default:
    break;
  }
  switch (allow_.nameStart()) {
  case GroupToken::name:
    fragment[nFragments++] = &ParserMessages::name;
    break;
  case GroupToken::nameToken:
    fragment[nFragments++] = &ParserMessages::nameToken;
    break;
  case GroupToken::elementToken:
    fragment[nFragments++] = &ParserMessages::elementToken;
    break;
  default:
    break;
  }
  Boolean first = 1;
  for (int i = 0; i < nFragments; i++) {
    if (!first)
      builder.appendFragment(ParserMessages::listSep);
    else
      first = 0;
    builder.appendFragment(*fragment[i]);
  }
  if (allow_.groupToken(GroupToken::pcdata)) {
    if (!first)
      builder.appendFragment(ParserMessages::listSep);
    StringC pcdata(syntax_->delimGeneral(Syntax::dRNI));
    pcdata += syntax_->reservedName(Syntax::rPCDATA);
    builder.appendChars(pcdata.data(), pcdata.size());
  }
  if (allow_.groupToken(GroupToken::all)) {
    if (!first)
      builder.appendFragment(ParserMessages::listSep);
    StringC all(syntax_->delimGeneral(Syntax::dRNI));
    all += syntax_->reservedName(Syntax::rALL);
    builder.appendChars(all.data(), all.size());
  }
  if (allow_.groupToken(GroupToken::implicit)) {
    if (!first)
      builder.appendFragment(ParserMessages::listSep);
    StringC implicit(syntax_->delimGeneral(Syntax::dRNI));
    implicit += syntax_->reservedName(Syntax::rIMPLICIT);
    builder.appendChars(implicit.data(), implicit.size());
  }
}

#ifdef SP_NAMESPACE
}
#endif
