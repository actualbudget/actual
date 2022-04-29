// Copyright (c) 1995 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"
#include "Boolean.h"
#include "ParserApp.h"
#include "macros.h"
#include "SGMLApplication.h"
#include "ParserEventGeneratorKit.h"
#include "GenericEventHandler.h"

class ParserEventGeneratorKitImpl : public SP_NAMESPACE_SCOPE ParserApp {
public:
  SP_NAMESPACE_SCOPE ParserOptions &options() { return options_; }
  bool generalEntities;
  unsigned refCount;
private:
  SP_NAMESPACE_SCOPE ErrorCountEventHandler *makeEventHandler() { return 0; }
};

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class ParserEventGenerator : public EventGenerator {
public:
  ParserEventGenerator(SgmlParser &,
		       bool generalEntities,
		       ParserEventGeneratorKitImpl *kit_);
  ParserEventGenerator(const SgmlParser &,
		       const SGMLApplication::Char *,
		       size_t n,
		       bool generalEntities,
		       bool messagesInhibited,
		       ParserEventGeneratorKitImpl *kit_);
  ~ParserEventGenerator();
  unsigned run(SGMLApplication &);
  void inhibitMessages(bool);
  void halt();
  EventGenerator *
    makeSubdocEventGenerator(const SGMLApplication::Char *systemId,
			     size_t systemIdLength);
private:
  SgmlParser parser_;
  bool generalEntities_;
  bool messagesInhibited_;
  sig_atomic_t cancel_;
  ParserEventGeneratorKitImpl *kit_;
};

#ifdef SP_NAMESPACE
}
#endif

ParserEventGeneratorKit::ParserEventGeneratorKit()
{
  impl_ = new ParserEventGeneratorKitImpl;
  impl_->refCount = 1;
  impl_->generalEntities = 0;
}

ParserEventGeneratorKit::~ParserEventGeneratorKit()
{
  impl_->refCount -= 1;
  if (impl_->refCount == 0)
    delete impl_;
}

EventGenerator *
ParserEventGeneratorKit::makeEventGenerator(int nFiles,
					    SP_NAMESPACE_SCOPE ParserApp::AppChar *const *files)
{
  SP_NAMESPACE_SCOPE StringC sysid;
  if (impl_->makeSystemId(nFiles, files, sysid))
    impl_->initParser(sysid);
  return new SP_NAMESPACE_SCOPE ParserEventGenerator(impl_->parser(),
						     impl_->generalEntities,
						     impl_);
}

void ParserEventGeneratorKit::setProgramName(const SP_NAMESPACE_SCOPE ParserApp::AppChar *prog)
{
  if (prog)
    impl_->setProgramName(impl_->convertInput(prog));
}

void ParserEventGeneratorKit::setOption(Option opt)
{
  switch (opt) {
  case showOpenEntities:
    impl_->processOption('e', 0);
    break;
  case showOpenElements:
    impl_->processOption('g', 0);
    break;
  case outputCommentDecls:
    impl_->options().eventsWanted.addCommentDecls();
    break;
  case outputMarkedSections:
    impl_->options().eventsWanted.addMarkedSections();
    break;
  case outputGeneralEntities:
    impl_->generalEntities = 1;
    break;
  case mapCatalogDocument:
    impl_->processOption('C', 0);
    break;
  case restrictFileReading:
    impl_->processOption('R', 0);
    break;
  case showErrorNumbers:
    impl_->processOption('n', 0);
    break;
  }
}

void ParserEventGeneratorKit::setOption(OptionWithArg opt,
					const SP_NAMESPACE_SCOPE ParserApp::AppChar *arg)
{
  switch (opt) {
  case addCatalog:
    impl_->processOption('c', arg);
    break;
  case includeParam:
    impl_->processOption('i', arg);
    break;
  case enableWarning:
    impl_->processOption('w', arg);
    break;
  case addSearchDir:
    impl_->processOption('D', arg);
    break;
  case activateLink:
    impl_->processOption('a', arg);
    break;
  case architecture:
    impl_->processOption('A', arg);
    break;
  }
}

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

ParserEventGenerator::ParserEventGenerator(SgmlParser &parser,
					   bool generalEntities,
					   ParserEventGeneratorKitImpl *kit)
: generalEntities_(generalEntities),
  messagesInhibited_(0),
  cancel_(0),
  kit_(kit)
{
  parser_.swap(parser);
  kit_->refCount += 1;
}

ParserEventGenerator::ParserEventGenerator(const SgmlParser &parser,
					   const SGMLApplication::Char *s,
					   size_t n,
					   bool generalEntities,
					   bool messagesInhibited,
					   ParserEventGeneratorKitImpl *kit)
: generalEntities_(generalEntities),
  messagesInhibited_(messagesInhibited),
  cancel_(0),
  kit_(kit)
{
  kit_->refCount += 1;
  SgmlParser::Params params;
  params.parent = &parser;
  params.sysid.assign(s, n);
  params.entityType = SgmlParser::Params::subdoc;
  parser_.init(params);
}

void ParserEventGenerator::halt()
{
  cancel_ = 1;
}

ParserEventGenerator::~ParserEventGenerator()
{
  kit_->refCount -= 1;
  if (kit_->refCount == 0)
    delete kit_;
}

unsigned ParserEventGenerator::run(SGMLApplication &app)
{
  MsgGenericEventHandler handler(app, generalEntities_,
				 *kit_, &messagesInhibited_);
  kit_->parseAll(parser_, handler, &cancel_);
  return handler.errorCount();
}

void ParserEventGenerator::inhibitMessages(bool b)
{
  messagesInhibited_ = b;
}

EventGenerator *
ParserEventGenerator::makeSubdocEventGenerator(const SGMLApplication::Char *s,
					       size_t n)
{
  return new ParserEventGenerator(parser_, s, n, generalEntities_,
				  messagesInhibited_, kit_);
}

#ifdef SP_NAMESPACE
}
#endif
