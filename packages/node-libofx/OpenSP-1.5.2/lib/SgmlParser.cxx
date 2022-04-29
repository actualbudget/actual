// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"
#include "SgmlParser.h"
#include "Parser.h"
#include "Trie.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

SgmlParser::SgmlParser()
: parser_(0)
{
}

SgmlParser::SgmlParser(const Params &params)
: parser_(new Parser(params))
{
}

void SgmlParser::init(const Params &params)
{
  delete parser_;
  parser_ = new Parser(params);
}

SgmlParser::~SgmlParser()
{
  delete parser_;
}

Event *SgmlParser::nextEvent()
{
  return parser_->nextEvent();
}

void SgmlParser::parseAll(EventHandler &handler,
			  const volatile sig_atomic_t *cancelPtr)
{
  parser_->parseAll(handler, cancelPtr);
}

ConstPtr<Sd> SgmlParser::sd() const
{
  return parser_->sdPointer();
}

ConstPtr<Syntax> SgmlParser::instanceSyntax() const
{
  return parser_->instanceSyntaxPointer();
}

ConstPtr<Syntax> SgmlParser::prologSyntax() const
{
  return parser_->prologSyntaxPointer();
}

EntityManager &SgmlParser::entityManager() const
{
  return parser_->entityManager();
}

const EntityCatalog &SgmlParser::entityCatalog() const
{
  return parser_->entityCatalog();
}

void SgmlParser::activateLinkType(const StringC &name)
{
  parser_->activateLinkType(name);
}

void SgmlParser::allLinkTypesActivated()
{
  parser_->allLinkTypesActivated();
}

void SgmlParser::swap(SgmlParser &s)
{
  Parser *tem = parser_;
  parser_ = s.parser_;
  s.parser_ = tem;
}

Ptr<Dtd> SgmlParser::baseDtd()
{
  return parser_->baseDtd();
}

const ParserOptions &SgmlParser::options() const
{
  return parser_->options();
}

SgmlParser::Params::Params()
: entityType(document),
  parent(0),
  options(0),
  subdocInheritActiveLinkTypes(0),
  subdocReferenced(0),
  subdocLevel(0)
{
}

#ifdef SP_NAMESPACE
}
#endif
